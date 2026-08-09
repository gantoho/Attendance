mod models;
mod database;

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get, patch, post},
    Json, Router,
};
use models::*;
use database::Database;
use std::{collections::HashMap, net::SocketAddr, sync::Arc};
use tokio::sync::Mutex;
use tower_http::cors::{Any, CorsLayer};

type AppState = Arc<Mutex<Database>>;

#[tokio::main]
async fn main() {
    if std::env::var("ATTENDANCE_NAMESPACE").is_err() && std::env::var("ATTENDANCE_DATA_DIR").is_err() {
        std::env::set_var("ATTENDANCE_NAMESPACE", "server");
    }
    let db = Database::new().expect("Failed to init database");
    db.init_default_admin().expect("Failed to init admin");
    let state: AppState = Arc::new(Mutex::new(db));

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/health", get(health))
        .route("/debug/dbpath", get(get_db_path))
        .route("/debug/stats", get(get_stats))
        .route("/login", post(login))
        .route("/users", get(get_users).post(create_user))
        .route("/users/:id", delete(delete_user))
        .route("/users/:id/location", get(get_user_location).patch(update_user_location))
        .route("/locations", get(get_locations).post(create_location))
        .route("/locations/:id", patch(update_location).delete(delete_location))
        .route("/records", get(get_records))
        .route("/records/admin/:admin_id", get(get_records_by_admin))
        .route("/checkin", post(check_in))
        .layer(cors)
        .with_state(state);

    let bind: SocketAddr = std::env::var("BIND_ADDRESS")
        .unwrap_or_else(|_| "0.0.0.0:7982".to_string())
        .parse()
        .expect("Invalid BIND_ADDRESS");

    println!("Attendance server listening on http://{}", bind);
    axum::serve(tokio::net::TcpListener::bind(bind).await.unwrap(), app)
        .await
        .unwrap();
}

async fn health() -> impl IntoResponse {
    (StatusCode::OK, Json(serde_json::json!({"status": "ok"})))
}

async fn get_db_path(
    State(state): State<AppState>,
) -> impl IntoResponse {
    let db = state.lock().await;
    (StatusCode::OK, Json(serde_json::json!({"path": db.path()})))
}

async fn get_stats(
    State(state): State<AppState>,
) -> impl IntoResponse {
    let db = state.lock().await;
    let (users, locations, records) = db.stats();
    (StatusCode::OK, Json(serde_json::json!({ "users": users, "locations": locations, "records": records })))
}

async fn login(
    State(state): State<AppState>,
    Json(req): Json<LoginRequest>,
) -> impl IntoResponse {
    let db = state.lock().await;
    let resp = match db.get_user_by_username(&req.username) {
        Ok(Some(user)) => {
            if user.password == req.password {
                LoginResponse { success: true, user: Some(user), message: None }
            } else {
                LoginResponse { success: false, user: None, message: Some("密码错误".into()) }
            }
        }
        Ok(None) => LoginResponse { success: false, user: None, message: Some("用户不存在".into()) },
        Err(e) => LoginResponse { success: false, user: None, message: Some(format!("登录失败: {}", e)) },
    };
    Json(resp)
}

async fn get_users(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let db = state.lock().await;
    let mut users = db.get_all_users().unwrap_or_default();
    if let Some(admin_id) = params.get("adminId") {
        users = users.into_iter().filter(|u| u.admin_id.as_ref() == Some(admin_id)).collect();
    }
    Json(users)
}

async fn create_user(
    State(state): State<AppState>,
    Json(req): Json<CreateUserRequest>,
) -> impl IntoResponse {
    let db = state.lock().await;
    match db.get_user_by_username(&req.username) {
        Ok(Some(_)) => (StatusCode::BAD_REQUEST, "用户名已存在".to_string()).into_response(),
        Ok(None) => {
            let user = User::new(req.username, req.password, req.role, req.admin_id);
            if let Err(e) = db.save_user(&user) {
                (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
            } else {
                (StatusCode::OK, Json(user)).into_response()
            }
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn delete_user(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let db = state.lock().await;
    match db.delete_user(&id) {
        Ok(_) => StatusCode::NO_CONTENT.into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

#[derive(serde::Deserialize)]
struct UpdateUserLocationPayload {
    locationId: String,
}

async fn update_user_location(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateUserLocationPayload>,
) -> impl IntoResponse {
    let db = state.lock().await;
    match db.get_user(&id) {
        Ok(Some(mut user)) => {
            // 传空字符串表示清除已分配的位置
            user.location_id = if payload.locationId.trim().is_empty() { None } else { Some(payload.locationId) };
            if let Err(e) = db.save_user(&user) {
                (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
            } else {
                (StatusCode::OK, Json(user)).into_response()
            }
        }
        Ok(None) => (StatusCode::NOT_FOUND, "用户不存在".to_string()).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn get_user_location(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let db = state.lock().await;
    let user = match db.get_user(&id) {
        Ok(Some(u)) => u,
        _ => return (StatusCode::OK, Json::<Option<models::Location>>(None)).into_response(),
    };
    let loc = match user.location_id {
        Some(loc_id) => db.get_location(&loc_id).ok().flatten(),
        None => None,
    };
    (StatusCode::OK, Json(loc)).into_response()
}

async fn get_locations(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let db = state.lock().await;
    let mut locs = db.get_all_locations().unwrap_or_default();
    if let Some(admin_id) = params.get("adminId") {
        locs = locs.into_iter().filter(|l| &l.admin_id == admin_id).collect();
    }
    Json(locs)
}

async fn create_location(
    State(state): State<AppState>,
    Json(req): Json<CreateLocationRequest>,
) -> impl IntoResponse {
    let db = state.lock().await;
    let loc = models::Location::new(req.name, req.latitude, req.longitude, req.radius, req.admin_id);
    match db.save_location(&loc) {
        Ok(_) => (StatusCode::OK, Json(loc)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn update_location(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<UpdateLocationRequest>,
) -> impl IntoResponse {
    let db = state.lock().await;
    let mut loc = match db.get_location(&id) {
        Ok(Some(l)) => l,
        Ok(None) => return (StatusCode::NOT_FOUND, "位置不存在".to_string()).into_response(),
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    };
    if let Some(name) = req.name { loc.name = name; }
    if let Some(lat) = req.latitude { loc.latitude = lat; }
    if let Some(lng) = req.longitude { loc.longitude = lng; }
    if let Some(r) = req.radius { loc.radius = r; }
    match db.save_location(&loc) {
        Ok(_) => (StatusCode::OK, Json(loc)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn delete_location(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let db = state.lock().await;
    match db.delete_location(&id) {
        Ok(_) => StatusCode::NO_CONTENT.into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn get_records(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let db = state.lock().await;
    if let Some(uid) = params.get("userId") {
        Json(db.get_records_by_user(uid).unwrap_or_default()).into_response()
    } else {
        Json(db.get_all_records().unwrap_or_default()).into_response()
    }
}

async fn get_records_by_admin(
    State(state): State<AppState>,
    Path(admin_id): Path<String>,
) -> impl IntoResponse {
    let db = state.lock().await;
    let users: Vec<String> = db
        .get_all_users()
        .unwrap_or_default()
        .into_iter()
        .filter(|u| u.admin_id.as_ref() == Some(&admin_id))
        .map(|u| u.id)
        .collect();
    let records: Vec<models::AttendanceRecord> = db
        .get_all_records()
        .unwrap_or_default()
        .into_iter()
        .filter(|r| users.contains(&r.user_id))
        .collect();
    Json(records)
}

/// 统计用户当天成功的打卡次数（用于每日两次打卡限制）
fn count_today_success(db: &Database, user_id: &str) -> usize {
    let records = db.get_records_by_user(user_id).unwrap_or_default();
    let today = chrono::Local::now().date_naive();
    let day_start = today
        .and_hms_opt(0, 0, 0)
        .unwrap()
        .and_local_timezone(chrono::Local)
        .single()
        .expect("today 0点应存在本地时间")
        .timestamp();
    let day_end = (today + chrono::Duration::days(1))
        .and_hms_opt(0, 0, 0)
        .unwrap()
        .and_local_timezone(chrono::Local)
        .single()
        .expect("明日 0点应存在本地时间")
        .timestamp();
    records
        .iter()
        .filter(|r| r.status == models::AttendanceStatus::Success && r.timestamp >= day_start && r.timestamp < day_end)
        .count()
}

async fn check_in(
    State(state): State<AppState>,
    Json(req): Json<CheckInRequest>,
) -> impl IntoResponse {
    let db = state.lock().await;
    let user = match db.get_user(&req.user_id) {
        Ok(Some(u)) => u,
        _ => return Json(CheckInResponse { success: false, record: None, message: Some("用户不存在".into()) }),
    };
    // 每日两次打卡限制：第一次为上班卡，第二次为下班卡
    let today_success_count = count_today_success(&db, &req.user_id);
    if today_success_count >= 2 {
        return Json(CheckInResponse { success: false, record: None, message: Some("今日打卡次数已达上限（上班/下班已打满）".into()) });
    }
    let check_type = if today_success_count == 0 { "in" } else { "out" };
    let location_id = match user.location_id {
        Some(id) => id,
        None => return Json(CheckInResponse { success: false, record: None, message: Some("用户未分配打卡位置".into()) }),
    };
    let location = match db.get_location(&location_id) {
        Ok(Some(l)) => l,
        _ => return Json(CheckInResponse { success: false, record: None, message: Some("打卡位置不存在".into()) }),
    };
    let distance = calculate_distance(req.latitude, req.longitude, location.latitude, location.longitude);
    if distance <= location.radius {
        let record = models::AttendanceRecord::new(
            req.user_id.clone(), location.id.clone(), req.latitude, req.longitude, models::AttendanceStatus::Success, Some(check_type.into()), None,
        );
        match db.save_record(&record) {
            Ok(_) => Json(CheckInResponse { success: true, record: Some(record), message: Some(if check_type == "in" { "上班打卡成功".into() } else { "下班打卡成功".into() }) }),
            Err(e) => Json(CheckInResponse { success: false, record: None, message: Some(format!("保存记录失败: {}", e)) }),
        }
    } else {
        let record = models::AttendanceRecord::new(
            req.user_id.clone(), location.id.clone(), req.latitude, req.longitude, models::AttendanceStatus::Failed, Some(check_type.into()), Some(format!("距离打卡位置 {:.2} 米，超出范围", distance)),
        );
        let _ = db.save_record(&record);
        Json(CheckInResponse { success: false, record: Some(record), message: Some(format!("不在打卡范围内，距离 {:.2} 米", distance)) })
    }
}

fn calculate_distance(lat1: f64, lon1: f64, lat2: f64, lon2: f64) -> f64 {
    const R: f64 = 6371000.0;
    let phi1 = lat1.to_radians();
    let phi2 = lat2.to_radians();
    let dphi = (lat2 - lat1).to_radians();
    let dlambda = (lon2 - lon1).to_radians();
    let a = (dphi / 2.0).sin().powi(2) + phi1.cos() * phi2.cos() * (dlambda / 2.0).sin().powi(2);
    let c = 2.0 * a.sqrt().atan2((1.0 - a).sqrt());
    R * c
}
