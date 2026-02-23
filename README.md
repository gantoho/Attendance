# Tauri + React + Typescript

This template should help get you started developing with Tauri, React and Typescript in Vite.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

cargo build -p attendance --bin attendance-server --release --target x86_64-unknown-linux-musl --no-default-features --features server

pnpm tauri dev
pnpm tauri build
pnpm android:dev
pnpm android:build