$ErrorActionPreference = "Stop"

$projectRoot = $PSScriptRoot
$sourceDir = "$projectRoot\src-tauri\target\x86_64-linux-android\debug"
$targetDir = "$projectRoot\src-tauri\gen\android\app\src\main\jniLibs\x86_64"

Write-Host "正在复制库文件..." -ForegroundColor Green

if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    Write-Host "创建目录: $targetDir" -ForegroundColor Yellow
}

$sourceFile = Join-Path $sourceDir "libattendance_lib.so"
$targetFile = Join-Path $targetDir "libattendance_lib.so"

if (Test-Path $sourceFile) {
    Copy-Item -Path $sourceFile -Destination $targetFile -Force
    Write-Host "✓ 文件复制成功: $sourceFile -> $targetFile" -ForegroundColor Green
} else {
    Write-Host "✗ 源文件不存在: $sourceFile" -ForegroundColor Red
    exit 1
}

Write-Host "`n完成！现在可以在 Android Studio 中构建项目了。" -ForegroundColor Cyan