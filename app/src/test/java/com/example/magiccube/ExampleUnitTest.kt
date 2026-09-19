package com.example.magiccube

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/**
 * Confirms the JUnit 5 test runner is wired correctly.
 *
 * This is a scaffold smoke test. Replace or supplement with real cube state machine tests
 * when Feature 3 (Cube data model and state machine) lands.
 */
class ExampleUnitTest {

    @Test
    fun `cube face count is 54`() {
        // A standard 3x3 Rubik's Cube has 6 faces × 9 stickers = 54 stickers.
        // This constant will be used throughout the cube data model (Feature 3).
        val faceCount = 6
        val stickersPerFace = 9
        assertEquals(54, faceCount * stickersPerFace)
    }
}
