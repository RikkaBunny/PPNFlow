mod engine_bridge;
mod commands;

use commands::engine::{
    start_engine, stop_engine, engine_is_running, send_engine_command, EngineState,
};
use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(EngineState(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            start_engine,
            stop_engine,
            engine_is_running,
            send_engine_command,
        ])
        .run(tauri::generate_context!())
        .expect("error while running PPNFlow");
}
