$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Android APK 快速构建脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = $PSScriptRoot
$androidProjectDir = "$projectRoot\src-tauri\gen\android"

$archMap = @{
    "aarch64-linux-android" = "arm64-v8a"
    "armv7-linux-androideabi" = "armeabi-v7a"
    "i686-linux-android" = "x86"
    "x86_64-linux-android" = "x86_64"
}

Write-Host "步骤 1: 检查并复制库文件..." -ForegroundColor Green

$hasLibs = $false
foreach ($rustTarget in $archMap.Keys) {
    $androidArch = $archMap[$rustTarget]
    
    $libSource = "$projectRoot\src-tauri\target\$rustTarget\release\libattendance_lib.so"
    $libDest = "$androidProjectDir\app\src\main\jniLibs\$androidArch\libattendance_lib.so"
    
    if (Test-Path $libSource) {
        Write-Host "  复制 $rustTarget -> $androidArch" -ForegroundColor Yellow
        $jniDir = "$androidProjectDir\app\src\main\jniLibs\$androidArch"
        if (-not (Test-Path $jniDir)) {
            New-Item -ItemType Directory -Path $jniDir -Force | Out-Null
        }
        Copy-Item -Path $libSource -Destination $libDest -Force
        $hasLibs = $true
    }
}

if (-not $hasLibs) {
    Write-Host ""
    Write-Host "✗ 没有找到已编译的库文件" -ForegroundColor Red
    Write-Host "请先运行以下命令编译库文件：" -ForegroundColor Yellow
    Write-Host "  npm run tauri android build" -ForegroundColor White
    exit 1
}

Write-Host "✓ 库文件复制完成" -ForegroundColor Green
Write-Host ""

Write-Host "步骤 2: 使用 Gradle 构建 Release APK..." -ForegroundColor Green
Set-Location $androidProjectDir

& .\gradlew.bat assembleRelease
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "✗ Gradle 构建失败" -ForegroundColor Red
    Write-Host "提示: 如果遇到网络问题，请检查网络连接或配置代理" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✓ 构建成功！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$outputDir = "$androidProjectDir\app\build\outputs\apk\release"
if (Test-Path $outputDir) {
    $apkFiles = Get-ChildItem -Path $outputDir -Filter "*.apk"
    if ($apkFiles) {
        Write-Host "APK 文件位置:" -ForegroundColor Cyan
        foreach ($apk in $apkFiles) {
            Write-Host "  $($apk.FullName)" -ForegroundColor White
            Write-Host "    大小: $([math]::Round($apk.Length / 1MB, 2)) MB" -ForegroundColor Gray
        }
    }
}

Write-Host ""
Write-Host "完成！" -ForegroundColor Green