use std::sync::Mutex;
use serde_json::Value;
use tauri::State;

use crate::engine_bridge::EngineBridge;

pub struct EngineState(pub Mutex<Option<EngineBridge>>);

#[tauri::command]
pub fn start_engine(
    app: tauri::AppHandle,
    state: State<'_, EngineState>,
) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    if guard.is_some() {
        return Ok(()); // already running
    }

    // Resolve paths relative to the app resource dir
    let python_cmd = "python"; // TODO: make configurable from settings
    let engine_script = {
        // In dev: project root / engine / main.py
        // In production bundle: resource_dir / engine / main.py
        let mut path = std::env::current_dir().unwrap_or_default();
        path.push("engine");
        path.push("main.py");
        path.to_string_lossy().to_string()
    };

    let bridge = EngineBridge::start(app, python_cmd, &engine_script)?;
    *guard = Some(bridge);
    Ok(())
}

#[tauri::command]
pub fn stop_engine(state: State<'_, EngineState>) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    *guard = None; // drops bridge → stdin closes → Python exits
    Ok(())
}

#[tauri::command]
pub fn engine_is_running(state: State<'_, EngineState>) -> Result<bool, String> {
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    Ok(guard.is_some())
}

/// Send any JSON-RPC command to the engine and return the request id.
/// The actual response arrives asynchronously via the "engine-response" Tauri event.
#[tauri::command]
pub fn send_engine_command(
    method: String,
    params: Value,
    state: State<'_, EngineState>,
) -> Result<String, String> {
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    match guard.as_ref() {
        Some(bridge) => bridge.send(&method, params),
        None => Err("Engine is not running. Call start_engine first.".to_string()),
    }
}
