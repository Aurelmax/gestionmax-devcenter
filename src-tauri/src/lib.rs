mod autoscan;
mod commands;
mod git_import;
mod projects;
mod projects_v3;
mod state;

use autoscan::*;
use commands::*;
use git_import::*;
use projects::*;
use projects_v3::*;
use state::AppState;

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
            autoscan_project,
            start_service_v3,
            stop_service_v3,
            status_service_v3,
            kill_zombies_v3,
            get_system_stats_v3,
            load_projects_v3,
            save_projects_v3,
            clone_git_repo
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
