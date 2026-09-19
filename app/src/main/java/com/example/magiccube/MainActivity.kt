package com.example.magiccube

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.example.magiccube.ui.MagicCubeApp
import com.example.magiccube.ui.theme.MagicCubeTheme

/**
 * Single entry point for the Magic Cube app.
 *
 * Responsibility: host the Compose content tree.
 * All navigation, game state, and 3D rendering live inside [MagicCubeApp].
 */
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MagicCubeTheme {
                MagicCubeApp()
            }
        }
    }
}
