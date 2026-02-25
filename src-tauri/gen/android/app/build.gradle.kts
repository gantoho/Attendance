import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("rust")
}

val tauriProperties = Properties().apply {
    val propFile = file("tauri.properties")
    if (propFile.exists()) {
        propFile.inputStream().use { load(it) }
    }
}

val signingProperties = Properties().apply {
    val keyProp = rootProject.file("key.properties")
    if (keyProp.exists()) {
        keyProp.inputStream().use { load(it) }
    }
}
fun envOrProp(key: String): String? =
    System.getenv(key) ?: signingProperties.getProperty(key)
val hasSigning = (envOrProp("storeFile") ?: "").isNotBlank()

android {
    compileSdk = 36
    namespace = "me.ganto.attendance"
    defaultConfig {
        manifestPlaceholders["usesCleartextTraffic"] = "false"
        applicationId = "me.ganto.attendance"
        minSdk = 24
        targetSdk = 36
        versionCode = tauriProperties.getProperty("tauri.android.versionCode", "1").toInt()
        versionName = tauriProperties.getProperty("tauri.android.versionName", "1.0")
    }
    if (hasSigning) {
        signingConfigs {
            create("release") {
                val storeFilePath = envOrProp("storeFile")
                if (!storeFilePath.isNullOrBlank()) {
                    storeFile = file(storeFilePath)
                }
                storePassword = envOrProp("storePassword")
                keyAlias = envOrProp("keyAlias")
                keyPassword = envOrProp("keyPassword")
            }
        }
    }
    buildTypes {
        getByName("debug") {
            manifestPlaceholders["usesCleartextTraffic"] = "true"
            isDebuggable = true
            isJniDebuggable = true
            isMinifyEnabled = false
            packaging {                jniLibs.keepDebugSymbols.add("*/arm64-v8a/*.so")
                jniLibs.keepDebugSymbols.add("*/armeabi-v7a/*.so")
                jniLibs.keepDebugSymbols.add("*/x86/*.so")
                jniLibs.keepDebugSymbols.add("*/x86_64/*.so")
            }
        }
        getByName("release") {
            // 允许明文 HTTP（连接外部 http://<host>:<port> 服务）
            manifestPlaceholders["usesCleartextTraffic"] = "true"
            isMinifyEnabled = true
            proguardFiles(
                *fileTree(".") { include("**/*.pro") }
                    .plus(getDefaultProguardFile("proguard-android-optimize.txt"))
                    .toList().toTypedArray()
            )
            if (hasSigning) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }
    splits {
        abi {
            isEnable = true
            reset()
            include("arm64-v8a", "x86_64")
            isUniversalApk = true
        }
    }
    kotlinOptions {
        jvmTarget = "1.8"
    }
    buildFeatures {
        buildConfig = true
    }
}

// 统一 Debug 分包 APK 文件名，匹配 app-<abi>-debug.apk，便于外部工具（如 tauri-cli）查找
// 通过构建后处理，复制生成的 APK 到 tauri-cli 期望的命名
tasks.register("renameX86_64DebugApk") {
    doLast {
        val dir = file("$buildDir/outputs/apk/x86_64/debug")
        if (dir.exists()) {
            val src = dir.listFiles()?.firstOrNull { it.name.matches(Regex("app-.*-x86_64-debug\\.apk")) }
            if (src != null) {
                val dst = file("$buildDir/outputs/apk/x86_64/debug/app-x86_64-debug.apk")
                src.copyTo(dst, overwrite = true)
                println("Renamed ${src.name} -> ${dst.name}")
            }
        }
    }
}
tasks.matching { it.name == "assembleX86_64Debug" }.configureEach {
    finalizedBy("renameX86_64DebugApk")
}

rust {
    rootDirRel = "../../../"
}

dependencies {
    implementation("androidx.webkit:webkit:1.14.0")
    implementation("androidx.appcompat:appcompat:1.7.1")
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("com.google.android.material:material:1.12.0")
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.4")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.0")
}

apply(from = "tauri.build.gradle.kts")
