# Tauri + React + Typescript

This template should help get you started developing with Tauri, React and Typescript in Vite.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)


## 设置目标
rustup target add x86_64-unknown-linux-musl  

## 打包后端服务
cargo build -p attendance --bin attendance-server --release --target x86_64-unknown-linux-musl --no-default-features --features server

## Web
pnpm dev
pnpm build

Desktop开发服务器需要开启 开发人员模式
## Desktop
pnpm tauri dev  
pnpm tauri build

## Android
pnpm android:dev  
pnpm android:build  

## Server
cd src-tauri  
cargo run --bin attendance-server --features server  

## 生成 Android Release 签名
在以下路径下生成签名文件
\src-tauri\gen\android\key.properties
文件内容如下
storeFile=D:\\GantoHo\\keystore\\attendance-release.jks
storePassword=你的Store密码
keyAlias=attendance
keyPassword=你的Key密码

执行以下命令创建签名，需要先创建D:\GantoHo\keystore目录
```sh
$KeystorePath = "D:\GantoHo\keystore\attendance-release.jks"
$Alias = "attendance"

keytool -genkeypair -v `
  -keystore "$KeystorePath" `
  -alias "$Alias" `
  -keyalg RSA -keysize 2048 `
  -validity 36500 `
  -storetype JKS `
  -dname "CN=Attendance, OU=Dev, O=Company, L=City, S=State, C=CN"
```