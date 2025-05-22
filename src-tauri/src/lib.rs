// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod utils;
use tauri::Manager;
use utils::api::{get_app_version, get_exe_path, start_tts, delete_path_contents};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
                window.close_devtools();
            }
            Ok(())
        })
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            start_tts,
            get_exe_path,
            get_app_version,
            delete_path_contents
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
