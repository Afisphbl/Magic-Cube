plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.junit5.android)
    alias(libs.plugins.ktlint)
}

android {
    namespace = "com.example.magiccube"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.example.magiccube"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
    }

    // JUnit 5 test runner: must be present alongside the junit5-android plugin
    testOptions {
        unitTests.all {
            it.useJUnitPlatform()
        }
    }
}

dependencies {
    // Compose BOM: all Compose artifact versions aligned
    val composeBom = platform(libs.compose.bom)
    implementation(composeBom)
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.compose.material3)
    debugImplementation(libs.compose.ui.tooling)

    // Activity
    implementation(libs.activity.compose)

    // Lifecycle: ViewModel + StateFlow + Compose integration
    implementation(libs.lifecycle.viewmodel.compose)
    implementation(libs.lifecycle.runtime.compose)

    // Navigation
    implementation(libs.navigation.compose)

    // 3D rendering: SceneView (wraps Google Filament)
    // Adds ~8-12 MB of Filament native libraries to the APK (documented tradeoff in spec 0001)
    implementation(libs.sceneview)

    // Testing: JUnit 5 + Robolectric
    testImplementation(libs.junit5.api)
    testRuntimeOnly(libs.junit5.engine)
    testImplementation(libs.robolectric)
}

ktlint {
    version.set("1.3.1")
    android.set(true)
    outputToConsole.set(true)
}
