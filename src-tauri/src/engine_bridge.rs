//! Python execution engine bridge.
//!
//! Spawns `python engine/main.py` as a child process, pipes JSON-RPC messages
//! over stdin/stdout, and forwards engine events to the Tauri frontend via events.

use std::io::{BufRead, BufReader, Write};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

// ── Types ──────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EngineEvent {
    pub event: String,
    pub data: Value,
}

#[derive(Debug, Serialize, Deserialize)]
struct Request {
    id: String,
    method: String,
    params: Value,
}

#[derive(Debug, Serialize, Deserialize)]
struct Response {
    id: Option<String>,
    result: Option<Value>,
    error: Option<String>,
    // Event fields (no id)
    event: Option<String>,
    data: Option<Value>,
}

// ── Bridge state ───────────────────────────────────────────────────────────

pub struct EngineBridge {
    stdin: Arc<Mutex<ChildStdin>>,
    _child: Arc<Mutex<Child>>,
}

impl EngineBridge {
    /// Spawn the Python engine and start reading its stdout in a background thread.
    pub fn start(app: AppHandle, python_cmd: &str, engine_script: &str) -> Result<Self, String> {
        let mut child = Command::new(python_cmd)
            .arg(engine_script)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit()) // let Python stderr go to console
            .spawn()
            .map_err(|e| format!("Failed to start Python engine: {e}\nCommand: {python_cmd} {engine_script}"))?;

        let stdin  = child.stdin.take().ok_or("no stdin")?;
        let stdout = child.stdout.take().ok_or("no stdout")?;

        let stdin_arc  = Arc::new(Mutex::new(stdin));
        let child_arc  = Arc::new(Mutex::new(child));

        // Background reader thread
        let app_clone = app.clone();
        thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                match line {
                    Ok(l) if !l.trim().is_empty() => {
                        if let Ok(msg) = serde_json::from_str::<Response>(&l) {
                            Self::dispatch(&app_clone, msg);
                        }
                    }
                    Err(_) => break,
                    _ => {}
                }
            }
        });

        Ok(Self {
            stdin: stdin_arc,
            _child: child_arc,
        })
    }

    /// Dispatch a parsed message from the engine to the frontend.
    fn dispatch(app: &AppHandle, msg: Response) {
        if let (Some(event), Some(data)) = (msg.event, msg.data) {
            // It's a push event → emit to frontend
            let payload = EngineEvent { event, data };
            let _ = app.emit("engine-event", payload);
        }
        // Responses to requests (id + result/error) are also emitted so the
        // frontend can await them via a simple request-id map.
        else if let Some(id) = msg.id {
            let payload = serde_json::json!({
                "id": id,
                "result": msg.result,
                "error": msg.error,
            });
            let _ = app.emit("engine-response", payload);
        }
    }

    /// Send a JSON-RPC request. Returns the generated request id.
    pub fn send(&self, method: &str, params: Value) -> Result<String, String> {
        let id = Uuid::new_v4().to_string();
        let req = Request {
            id: id.clone(),
            method: method.to_string(),
            params,
        };
        let mut line = serde_json::to_string(&req).map_err(|e| e.to_string())?;
        line.push('\n');

        let mut stdin = self.stdin.lock().map_err(|e| e.to_string())?;
        stdin.write_all(line.as_bytes()).map_err(|e| e.to_string())?;
        stdin.flush().map_err(|e| e.to_string())?;

        Ok(id)
    }
}
