$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Android APK Quick Build Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = "D:\Code\Trae\Attendance_Tauri"
$androidProjectDir = "$projectRoot\src-tauri\gen\android"

$archMap = @{
    "aarch64-linux-android" = "arm64-v8a"
    "armv7-linux-androideabi" = "armeabi-v7a"
    "i686-linux-android" = "x86"
    "x86_64-linux-android" = "x86_64"
}

Write-Host "Step 1: Check and copy library files..." -ForegroundColor Green

$hasLibs = $false
foreach ($rustTarget in $archMap.Keys) {
    $androidArch = $archMap[$rustTarget]
    
    $libSource = "$projectRoot\src-tauri\target\$rustTarget\release\libattendance_lib.so"
    $libDest = "$androidProjectDir\app\src\main\jniLibs\$androidArch\libattendance_lib.so"
    
    if (Test-Path $libSource) {
        Write-Host "  Copying $rustTarget -> $androidArch" -ForegroundColor Yellow
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
    Write-Host "No compiled library files found" -ForegroundColor Red
    Write-Host "Please run: npm run tauri android build" -ForegroundColor Yellow
    exit 1
}

Write-Host "Library files copied successfully" -ForegroundColor Green
Write-Host ""

Write-Host "Step 2: Building Release APK with Gradle..." -ForegroundColor Green
Set-Location $androidProjectDir

& .\gradlew.bat assembleRelease
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Gradle build failed" -ForegroundColor Red
    Write-Host "Check network connection or configure proxy" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Build successful!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$outputDir = "$androidProjectDir\app\build\outputs\apk\release"
if (Test-Path $outputDir) {
    $apkFiles = Get-ChildItem -Path $outputDir -Filter "*.apk"
    if ($apkFiles) {
        Write-Host "APK files:" -ForegroundColor Cyan
        foreach ($apk in $apkFiles) {
            Write-Host "  $($apk.FullName)" -ForegroundColor White
            $sizeMB = [math]::Round($apk.Length / 1MB, 2)
            Write-Host "    Size: $sizeMB MB" -ForegroundColor Gray
        }
    }
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green