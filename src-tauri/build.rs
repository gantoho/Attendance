fn main() {
    if std::env::var("CARGO_FEATURE_DESKTOP").is_ok() {
        tauri_build::build()
    } else {
        // server build: skip tauri build script
        println!("cargo:rerun-if-changed=src/models.rs");
        println!("cargo:rerun-if-changed=src/database.rs");
        println!("cargo:rerun-if-changed=src/server_main.rs");
    }
}
