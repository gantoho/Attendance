mod models;
mod database;
mod commands;

use commands::*;
use database::Database;
use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db = Database::new().expect("Failed to initialize database");
    db.init_default_admin().expect("Failed to initialize default admin");
    
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(Mutex::new(db))
        .invoke_handler(tauri::generate_handler![
            login,
            get_all_users,
            get_users_by_admin,
            create_user,
            delete_user,
            update_user_location,
            get_user_location,
            get_all_locations,
            get_locations_by_admin,
            create_location,
            update_location,
            delete_location,
            get_attendance_records,
            get_attendance_records_by_admin,
            check_in,
            get_current_location,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
