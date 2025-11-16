mod commands;

use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            run_command,
            start_service,
            stop_service,
            stop_all_services,
            kill_zombies,
            check_status,
            read_logs,
            list_projects,
            check_project_status,
            start_project_service,
            stop_project_service,
            open_in_vscode
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
