// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod utils;
use tauri::Manager;
use utils::api::{delete_path_contents, get_app_version, start_tts, send_api_request};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
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
            get_app_version,
            delete_path_contents,
            send_api_request
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
