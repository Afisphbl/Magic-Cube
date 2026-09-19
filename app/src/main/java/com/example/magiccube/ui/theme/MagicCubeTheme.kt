package com.example.magiccube.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import android.os.Build

/**
 * App-level Material 3 theme wrapper.
 *
 * Uses Dynamic Color on Android 12+ (wallpaper-based palettes).
 * Falls back to the default Material 3 color scheme on older devices.
 * The cube face color palette (White, Yellow, Red, Orange, Blue, Green) is defined
 * in the design system (Feature 4) and applied programmatically in the SceneView
 * composable, not via the Material theme.
 */
@Composable
fun MagicCubeTheme(
    content: @Composable () -> Unit,
) {
    val context = LocalContext.current
    val colorScheme = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        // Dynamic Color: adapts to the device wallpaper on Android 12+
        dynamicDarkColorScheme(context)
    } else {
        MaterialTheme.colorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        content = content,
    )
}
