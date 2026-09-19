package com.example.magiccube.ui.game

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.example.magiccube.R
import com.example.magiccube.ui.theme.MagicCubeTheme

/**
 * Game screen placeholder.
 *
 * This composable is a scaffold stub. Its final form (Feature 5: 3D cube renderer and interaction)
 * will replace the placeholder Box with a SceneView composable driven by a GameViewModel.
 *
 * Architecture constraints (spec 0001):
 *   - The SceneView composable is a pure function of the cube state IntArray from the ViewModel.
 *   - No 3D code lives outside this composable (or its children).
 *   - The ViewModel is never imported in this file until Feature 3/5 wires it.
 */
@Composable
fun GameScreen(
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentAlignment = Alignment.Center,
    ) {
        // Placeholder: replaced by SceneView 3D renderer in Feature 5
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = stringResource(R.string.app_name),
                style = MaterialTheme.typography.headlineLarge,
                color = MaterialTheme.colorScheme.onBackground,
            )
        }
    }
}

@Preview(showBackground = true, widthDp = 640, heightDp = 360)
@Composable
private fun GameScreenPreview() {
    MagicCubeTheme {
        GameScreen()
    }
}
