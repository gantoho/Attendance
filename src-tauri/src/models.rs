use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub id: String,
    pub username: String,
    pub password: String,
    pub role: UserRole,
    pub admin_id: Option<String>,
    pub location_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum UserRole {
    Admin,
    User,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Location {
    pub id: String,
    pub name: String,
    pub latitude: f64,
    pub longitude: f64,
    pub radius: f64,
    pub admin_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AttendanceRecord {
    pub id: String,
    pub user_id: String,
    pub location_id: String,
    pub latitude: f64,
    pub longitude: f64,
    pub timestamp: i64,
    pub status: AttendanceStatus,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AttendanceStatus {
    Success,
    Failed,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateUserRequest {
    pub username: String,
    pub password: String,
    pub role: UserRole,
    pub admin_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateLocationRequest {
    pub name: String,
    pub latitude: f64,
    pub longitude: f64,
    pub radius: f64,
    pub admin_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateLocationRequest {
    pub name: Option<String>,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
    pub radius: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub success: bool,
    pub user: Option<User>,
    pub message: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CheckInRequest {
    pub user_id: String,
    pub latitude: f64,
    pub longitude: f64,
}

#[derive(Debug, Serialize)]
pub struct CheckInResponse {
    pub success: bool,
    pub record: Option<AttendanceRecord>,
    pub message: Option<String>,
}

impl User {
    pub fn new(username: String, password: String, role: UserRole, admin_id: Option<String>) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            username,
            password,
            role,
            admin_id,
            location_id: None,
        }
    }
}

impl Location {
    pub fn new(name: String, latitude: f64, longitude: f64, radius: f64, admin_id: String) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            name,
            latitude,
            longitude,
            radius,
            admin_id,
        }
    }
}

impl AttendanceRecord {
    pub fn new(
        user_id: String,
        location_id: String,
        latitude: f64,
        longitude: f64,
        status: AttendanceStatus,
        error_message: Option<String>,
    ) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            user_id,
            location_id,
            latitude,
            longitude,
            timestamp: chrono::Utc::now().timestamp(),
            status,
            error_message,
        }
    }
}
