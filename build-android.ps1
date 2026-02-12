param(
    [string]$Target = "aarch64-linux-android",
    [string]$BuildType = "release"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Android APK 构建脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = "D:\Code\Trae\Attendance_Tauri"
$rustTargetDir = "$projectRoot\src-tauri\target\$Target\$BuildType"
$androidProjectDir = "$projectRoot\src-tauri\gen\android"

$archMap = @{
    "aarch64-linux-android" = "arm64-v8a"
    "armv7-linux-androideabi" = "armeabi-v7a"
    "i686-linux-android" = "x86"
    "x86_64-linux-android" = "x86_64"
}

$androidArch = $archMap[$Target]
if (-not $androidArch) {
    Write-Host "✗ 不支持的目标架构: $Target" -ForegroundColor Red
    exit 1
}

Write-Host "目标架构: $Target" -ForegroundColor Yellow
Write-Host "Android 架构: $androidArch" -ForegroundColor Yellow
Write-Host "构建类型: $BuildType" -ForegroundColor Yellow
Write-Host ""

$libSource = "$rustTargetDir\libattendance_lib.so"
$libDest = "$androidProjectDir\app\src\main\jniLibs\$androidArch\libattendance_lib.so"

Write-Host "步骤 1: 检查 Rust 库文件..." -ForegroundColor Green
if (-not (Test-Path $libSource)) {
    Write-Host "✗ Rust 库文件不存在: $libSource" -ForegroundColor Red
    Write-Host "正在编译 Rust 库..." -ForegroundColor Yellow
    Set-Location $projectRoot
    cargo build --target $Target --release
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Rust 编译失败" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Rust 库编译完成" -ForegroundColor Green
} else {
    Write-Host "✓ Rust 库文件已存在" -ForegroundColor Green
}

Write-Host ""
Write-Host "步骤 2: 复制库文件到 Android 项目..." -ForegroundColor Green
$jniDir = "$androidProjectDir\app\src\main\jniLibs\$androidArch"
if (-not (Test-Path $jniDir)) {
    New-Item -ItemType Directory -Path $jniDir -Force | Out-Null
    Write-Host "  创建目录: $jniDir" -ForegroundColor Yellow
}

Copy-Item -Path $libSource -Destination $libDest -Force
Write-Host "✓ 库文件复制成功" -ForegroundColor Green

Write-Host ""
Write-Host "步骤 3: 使用 Gradle 构建 APK..." -ForegroundColor Green
Set-Location $androidProjectDir

$gradleTask = if ($BuildType -eq "release") { "assembleRelease" } else { "assembleDebug" }
Write-Host "  执行任务: $gradleTask" -ForegroundColor Yellow

& .\gradlew.bat $gradleTask
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Gradle 构建失败" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✓ 构建成功！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$outputDir = "$androidProjectDir\app\build\outputs\apk\$BuildType"
if (Test-Path $outputDir) {
    $apkFiles = Get-ChildItem -Path $outputDir -Filter "*.apk"
    if ($apkFiles) {
        Write-Host "APK 文件位置:" -ForegroundColor Cyan
        foreach ($apk in $apkFiles) {
            Write-Host "  $($apk.FullName)" -ForegroundColor White
        }
    }
}

Write-Host ""
Write-Host "完成！" -ForegroundColor Green