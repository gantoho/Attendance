# Tauri + React + Typescript

This template should help get you started developing with Tauri, React and Typescript in Vite.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

cargo build -p attendance --bin attendance-server --release --target x86_64-unknown-linux-musl --no-default-features --features server

开发人员模式 开启  

pnpm tauri dev  
pnpm tauri build  
pnpm android:dev  
pnpm android:build  

cd src-tauri  
cargo run --bin attendance-server --features server  

rustup target add x86_64-unknown-linux-musl  

生成 Android Release 签名
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