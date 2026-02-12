use crate::database::Database;
use crate::models::*;
use std::sync::Mutex;
use tauri::State;

pub type AppState = Mutex<Database>;

#[tauri::command]
pub fn login(state: State<AppState>, request: LoginRequest) -> LoginResponse {
    println!("Login attempt for username: {}", request.username);
    
    let db = state.lock().unwrap();
    
    match db.get_user_by_username(&request.username) {
        Ok(Some(user)) => {
            println!("User found: {}, password match: {}", user.username, user.password == request.password);
            if user.password == request.password {
                LoginResponse {
                    success: true,
                    user: Some(user),
                    message: None,
                }
            } else {
                LoginResponse {
                    success: false,
                    user: None,
                    message: Some("密码错误".to_string()),
                }
            }
        }
        Ok(None) => {
            println!("User not found: {}", request.username);
            LoginResponse {
                success: false,
                user: None,
                message: Some("用户不存在".to_string()),
            }
        }
        Err(e) => {
            println!("Database error: {}", e);
            LoginResponse {
                success: false,
                user: None,
                message: Some(format!("登录失败: {}", e)),
            }
        }
    }
}

#[tauri::command]
pub fn get_all_users(state: State<AppState>) -> Vec<User> {
    let db = state.lock().unwrap();
    db.get_all_users().unwrap_or_default()
}

#[tauri::command]
pub fn get_users_by_admin(state: State<AppState>, admin_id: String) -> Vec<User> {
    let db = state.lock().unwrap();
    let all_users = db.get_all_users().unwrap_or_default();
    println!("get_users_by_admin called with admin_id: {}", admin_id);
    println!("All users count: {}", all_users.len());
    for user in &all_users {
        println!("User: {}, role: {:?}, admin_id: {:?}", user.username, user.role, user.admin_id);
    }
    let filtered: Vec<User> = all_users
        .into_iter()
        .filter(|u| u.admin_id.as_ref() == Some(&admin_id))
        .collect();
    println!("Filtered users count: {}", filtered.len());
    filtered
}

#[tauri::command]
pub fn create_user(state: State<AppState>, user: CreateUserRequest) -> Result<User, String> {
    println!("create_user called with username: {}, role: {:?}, admin_id: {:?}", 
             user.username, user.role, user.admin_id);
    
    let db = state.lock().unwrap();
    
    match db.get_user_by_username(&user.username) {
        Ok(Some(_)) => {
            println!("Username already exists: {}", user.username);
            Err("用户名已存在".to_string())
        }
        Ok(None) => {
            let new_user = User::new(
                user.username.clone(),
                user.password.clone(),
                user.role.clone(),
                user.admin_id.clone(),
            );
            println!("Creating user: {}, id: {}, admin_id: {:?}", 
                     new_user.username, new_user.id, new_user.admin_id);
            db.save_user(&new_user).map_err(|e| {
                println!("Failed to save user: {}", e);
                e.to_string()
            })?;
            println!("User created successfully");
            Ok(new_user)
        }
        Err(e) => {
            println!("Database error: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn delete_user(state: State<AppState>, user_id: String) -> Result<(), String> {
    let db = state.lock().unwrap();
    db.delete_user(&user_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_user_location(
    state: State<AppState>,
    user_id: String,
    location_id: String,
) -> Result<User, String> {
    let db = state.lock().unwrap();
    
    let mut user = db.get_user(&user_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "用户不存在".to_string())?;
    
    user.location_id = Some(location_id);
    
    db.save_user(&user).map_err(|e| e.to_string())?;
    Ok(user)
}

#[tauri::command]
pub fn get_user_location(state: State<AppState>, user_id: String) -> Option<Location> {
    let db = state.lock().unwrap();
    
    let user = match db.get_user(&user_id) {
        Ok(Some(u)) => u,
        _ => return None,
    };
    
    match user.location_id {
        Some(location_id) => db.get_location(&location_id).ok().flatten(),
        None => None,
    }
}

#[tauri::command]
pub fn get_all_locations(state: State<AppState>) -> Vec<Location> {
    let db = state.lock().unwrap();
    db.get_all_locations().unwrap_or_default()
}

#[tauri::command]
pub fn get_locations_by_admin(state: State<AppState>, admin_id: String) -> Vec<Location> {
    let db = state.lock().unwrap();
    db.get_all_locations()
        .unwrap_or_default()
        .into_iter()
        .filter(|l| l.admin_id == admin_id)
        .collect()
}

#[tauri::command]
pub fn create_location(state: State<AppState>, location: CreateLocationRequest) -> Result<Location, String> {
    let db = state.lock().unwrap();
    
    let new_location = Location::new(
        location.name.clone(),
        location.latitude,
        location.longitude,
        location.radius,
        location.admin_id.clone(),
    );
    db.save_location(&new_location).map_err(|e| e.to_string())?;
    Ok(new_location)
}

#[tauri::command]
pub fn update_location(
    state: State<AppState>,
    location_id: String,
    location: UpdateLocationRequest,
) -> Result<Location, String> {
    let db = state.lock().unwrap();
    
    let mut existing_location = db.get_location(&location_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "位置不存在".to_string())?;
    
    if let Some(name) = location.name {
        existing_location.name = name;
    }
    if let Some(latitude) = location.latitude {
        existing_location.latitude = latitude;
    }
    if let Some(longitude) = location.longitude {
        existing_location.longitude = longitude;
    }
    if let Some(radius) = location.radius {
        existing_location.radius = radius;
    }
    
    db.save_location(&existing_location).map_err(|e| e.to_string())?;
    Ok(existing_location)
}

#[tauri::command]
pub fn delete_location(state: State<AppState>, location_id: String) -> Result<(), String> {
    let db = state.lock().unwrap();
    db.delete_location(&location_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_attendance_records(state: State<AppState>, user_id: Option<String>) -> Vec<AttendanceRecord> {
    let db = state.lock().unwrap();
    
    if let Some(uid) = user_id {
        db.get_records_by_user(&uid).unwrap_or_default()
    } else {
        db.get_all_records().unwrap_or_default()
    }
}

#[tauri::command]
pub fn get_attendance_records_by_admin(state: State<AppState>, admin_id: String) -> Vec<AttendanceRecord> {
    let db = state.lock().unwrap();
    
    let users: Vec<String> = db
        .get_all_users()
        .unwrap_or_default()
        .into_iter()
        .filter(|u| u.admin_id.as_ref() == Some(&admin_id))
        .map(|u| u.id)
        .collect();
    
    db.get_all_records()
        .unwrap_or_default()
        .into_iter()
        .filter(|r| users.contains(&r.user_id))
        .collect()
}

fn calculate_distance(lat1: f64, lon1: f64, lat2: f64, lon2: f64) -> f64 {
    const R: f64 = 6371000.0;
    let φ1 = lat1.to_radians();
    let φ2 = lat2.to_radians();
    let Δφ = (lat2 - lat1).to_radians();
    let Δλ = (lon2 - lon1).to_radians();

    let a = (Δφ / 2.0).sin().powi(2) + φ1.cos() * φ2.cos() * (Δλ / 2.0).sin().powi(2);
    let c = 2.0 * a.sqrt().atan2((1.0 - a).sqrt());

    R * c
}

#[tauri::command]
pub fn check_in(state: State<AppState>, request: CheckInRequest) -> CheckInResponse {
    let db = state.lock().unwrap();
    
    let user = match db.get_user(&request.user_id) {
        Ok(Some(u)) => u,
        Ok(None) => {
            return CheckInResponse {
                success: false,
                record: None,
                message: Some("用户不存在".to_string()),
            };
        }
        Err(e) => {
            return CheckInResponse {
                success: false,
                record: None,
                message: Some(format!("获取用户失败: {}", e)),
            };
        }
    };
    
    let location_id = match &user.location_id {
        Some(id) => id.clone(),
        None => {
            return CheckInResponse {
                success: false,
                record: None,
                message: Some("用户未分配打卡位置".to_string()),
            };
        }
    };
    
    let location = match db.get_location(&location_id) {
        Ok(Some(l)) => l,
        Ok(None) => {
            return CheckInResponse {
                success: false,
                record: None,
                message: Some("打卡位置不存在".to_string()),
            };
        }
        Err(e) => {
            return CheckInResponse {
                success: false,
                record: None,
                message: Some(format!("获取位置失败: {}", e)),
            };
        }
    };
    
    let distance = calculate_distance(
        request.latitude,
        request.longitude,
        location.latitude,
        location.longitude,
    );
    
    if distance <= location.radius {
        let record = AttendanceRecord::new(
            request.user_id.clone(),
            location.id.clone(),
            request.latitude,
            request.longitude,
            AttendanceStatus::Success,
            None,
        );
        
        match db.save_record(&record) {
            Ok(_) => CheckInResponse {
                success: true,
                record: Some(record),
                message: Some("打卡成功".to_string()),
            },
            Err(e) => CheckInResponse {
                success: false,
                record: None,
                message: Some(format!("保存记录失败: {}", e)),
            },
        }
    } else {
        let record = AttendanceRecord::new(
            request.user_id.clone(),
            location.id.clone(),
            request.latitude,
            request.longitude,
            AttendanceStatus::Failed,
            Some(format!("距离打卡位置 {:.2} 米，超出范围", distance)),
        );
        
        db.save_record(&record).ok();
        
        CheckInResponse {
            success: false,
            record: Some(record),
            message: Some(format!("不在打卡范围内，距离 {:.2} 米", distance)),
        }
    }
}

#[tauri::command]
pub async fn get_current_location() -> Result<(f64, f64), String> {
    Err("请使用前端浏览器地理位置 API".to_string())
}
