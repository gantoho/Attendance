use crate::models::{User, Location, AttendanceRecord};
use sled::{Db, Tree};
use std::sync::Arc;
use std::path::PathBuf;
use dirs;
use serde_json;

pub struct Database {
    db: Arc<Db>,
    users: Arc<Tree>,
    locations: Arc<Tree>,
    records: Arc<Tree>,
    db_path: PathBuf,
}

impl Database {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let mut candidates: Vec<PathBuf> = Vec::new();
        let base_name = match std::env::var("ATTENDANCE_NAMESPACE") {
            Ok(ns) if !ns.trim().is_empty() => format!("attendance-{}", ns.trim()),
            _ => "attendance".to_string(),
        };
        if let Ok(p) = std::env::var("ATTENDANCE_DATA_DIR") {
            candidates.push(PathBuf::from(p));
        }
        if let Some(p) = dirs::data_local_dir() {
            candidates.push(p.join(&base_name));
        }
        #[cfg(target_os = "android")]
        {
            let pkg = "me.ganto.attendance";
            candidates.push(PathBuf::from(format!("/data/user/0/{}/files/{}", pkg, base_name)));
            candidates.push(PathBuf::from(format!("/data/data/{}/files/{}", pkg, base_name)));
        }

        let mut last_err: Option<Box<dyn std::error::Error>> = None;
        for base in candidates {
            if let Err(e) = std::fs::create_dir_all(&base) {
                last_err = Some(Box::new(e));
                continue;
            }
            let db_path = base.join("attendance_db");
            match sled::open(&db_path) {
                Ok(db_raw) => {
                    let db = Arc::new(db_raw);
                    let users = Arc::new(db.open_tree("users")?);
                    let locations = Arc::new(db.open_tree("locations")?);
                    let records = Arc::new(db.open_tree("records")?);
                    println!("Using database path: {}", db_path.display());
                    return Ok(Self { db, users, locations, records, db_path });
                }
                Err(e) => {
                    last_err = Some(Box::new(e));
                    continue;
                }
            }
        }

        Err(last_err.unwrap_or_else(|| "Failed to initialize database".into()))
    }
    
    pub fn path(&self) -> String {
        self.db_path.display().to_string()
    }
    
    pub fn stats(&self) -> (usize, usize, usize) {
        let users = self.get_all_users().map(|v| v.len()).unwrap_or(0);
        let locations = self.get_all_locations().map(|v| v.len()).unwrap_or(0);
        let records = self.get_all_records().map(|v| v.len()).unwrap_or(0);
        (users, locations, records)
    }
    
    pub fn init_default_admin(&self) -> Result<(), Box<dyn std::error::Error>> {
        // 支持通过环境变量配置默认管理员
        let default_username = std::env::var("DEFAULT_ADMIN_USERNAME").unwrap_or_else(|_| "admin".to_string());
        let default_password = std::env::var("DEFAULT_ADMIN_PASSWORD").unwrap_or_else(|_| "admin123".to_string());
        let admin_exists = self.get_user_by_username(&default_username)?;
        
        if admin_exists.is_none() {
            let admin = User::new(
                default_username.clone(),
                default_password.clone(),
                crate::models::UserRole::Admin,
                None,
            );
            self.save_user(&admin)?;
            println!("Default admin user created: {}", default_username);
        } else {
            println!("Admin user already exists");
        }
        
        self.migrate_user_data()?;
        Ok(())
    }
    
    pub fn migrate_user_data(&self) -> Result<(), Box<dyn std::error::Error>> {
        let admin = self.get_user_by_username("admin")?;
        
        if let Some(admin_user) = admin {
            let all_users = self.get_all_users()?;
            let mut migrated_count = 0;
            
            for user in all_users {
                if user.role == crate::models::UserRole::User && user.admin_id.is_none() {
                    let mut updated_user = user.clone();
                    updated_user.admin_id = Some(admin_user.id.clone());
                    self.save_user(&updated_user)?;
                    migrated_count += 1;
                    println!("Migrated user: {} -> admin_id: {}", user.username, admin_user.id);
                }
            }
            
            if migrated_count > 0 {
                println!("Migrated {} users to admin", migrated_count);
            }
        }
        
        Ok(())
    }
    
    pub fn save_user(&self, user: &User) -> Result<(), Box<dyn std::error::Error>> {
        let key = user.id.as_bytes();
        let value = serde_json::to_vec(user)?;
        self.users.insert(key, value)?;
        self.db.flush()?;
        Ok(())
    }
    
    pub fn get_user(&self, id: &str) -> Result<Option<User>, Box<dyn std::error::Error>> {
        if let Some(value) = self.users.get(id.as_bytes())? {
            let user: User = serde_json::from_slice(&value)?;
            Ok(Some(user))
        } else {
            Ok(None)
        }
    }
    
    pub fn get_user_by_username(&self, username: &str) -> Result<Option<User>, Box<dyn std::error::Error>> {
        for item in self.users.iter() {
            let (_, value) = item?;
            let user: User = serde_json::from_slice(&value)?;
            if user.username == username {
                return Ok(Some(user));
            }
        }
        Ok(None)
    }
    
    pub fn get_all_users(&self) -> Result<Vec<User>, Box<dyn std::error::Error>> {
        let mut users = Vec::new();
        for item in self.users.iter() {
            let (_, value) = item?;
            let user: User = serde_json::from_slice(&value)?;
            users.push(user);
        }
        Ok(users)
    }
    
    pub fn delete_user(&self, id: &str) -> Result<(), Box<dyn std::error::Error>> {
        self.users.remove(id.as_bytes())?;
        self.db.flush()?;
        Ok(())
    }
    
    pub fn save_location(&self, location: &Location) -> Result<(), Box<dyn std::error::Error>> {
        let key = location.id.as_bytes();
        let value = serde_json::to_vec(location)?;
        self.locations.insert(key, value)?;
        self.db.flush()?;
        Ok(())
    }
    
    pub fn get_location(&self, id: &str) -> Result<Option<Location>, Box<dyn std::error::Error>> {
        if let Some(value) = self.locations.get(id.as_bytes())? {
            let location: Location = serde_json::from_slice(&value)?;
            Ok(Some(location))
        } else {
            Ok(None)
        }
    }
    
    pub fn get_all_locations(&self) -> Result<Vec<Location>, Box<dyn std::error::Error>> {
        let mut locations = Vec::new();
        for item in self.locations.iter() {
            let (_, value) = item?;
            let location: Location = serde_json::from_slice(&value)?;
            locations.push(location);
        }
        Ok(locations)
    }
    
    pub fn delete_location(&self, id: &str) -> Result<(), Box<dyn std::error::Error>> {
        self.locations.remove(id.as_bytes())?;
        self.db.flush()?;
        Ok(())
    }
    
    pub fn save_record(&self, record: &AttendanceRecord) -> Result<(), Box<dyn std::error::Error>> {
        let key = record.id.as_bytes();
        let value = serde_json::to_vec(record)?;
        self.records.insert(key, value)?;
        self.db.flush()?;
        Ok(())
    }
    
    pub fn get_all_records(&self) -> Result<Vec<AttendanceRecord>, Box<dyn std::error::Error>> {
        let mut records = Vec::new();
        for item in self.records.iter() {
            let (_, value) = item?;
            let record: AttendanceRecord = serde_json::from_slice(&value)?;
            records.push(record);
        }
        Ok(records)
    }
    
    pub fn get_records_by_user(&self, user_id: &str) -> Result<Vec<AttendanceRecord>, Box<dyn std::error::Error>> {
        let mut records = Vec::new();
        for item in self.records.iter() {
            let (_, value) = item?;
            let record: AttendanceRecord = serde_json::from_slice(&value)?;
            if record.user_id == user_id {
                records.push(record);
            }
        }
        Ok(records)
    }
}
