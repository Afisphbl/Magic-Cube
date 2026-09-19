package com.example.magiccube.ui

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.example.magiccube.ui.game.GameScreen

/**
 * Root of the Compose navigation graph.
 *
 * Routes:
 *   "game" → [GameScreen] — the 3D cube game surface (placeholder in this scaffold,
 *             wired to a real ViewModel and SceneView renderer in Feature 5).
 *
 * Additional routes (result screen, deferred settings) are added as later features land.
 */
@Composable
fun MagicCubeApp() {
    val navController = rememberNavController()

    NavHost(
        navController = navController,
        startDestination = "game",
    ) {
        composable("game") {
            GameScreen()
        }
    }
}
