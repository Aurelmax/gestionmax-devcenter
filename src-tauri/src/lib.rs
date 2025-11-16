mod commands;
mod state;
mod projects;
mod autoscan;

use commands::*;
use state::AppState;
use projects::*;
use autoscan::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_state = AppState::new();
    
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(app_state)
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
            open_in_vscode,
            load_projects,
            save_projects,
            add_project,
            update_project,
            delete_project,
            pick_project_folder,
            autoscan_project
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
