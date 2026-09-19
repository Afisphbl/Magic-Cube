# Rationale: 0001 Stack and Architecture

## Context

Magic Cube is a native Android Rubik's Cube puzzle game for casual players of all ages. It is fully offline (no account, no backend), targets Android first (iOS later), and needs smooth 3D rendering of a cube with swipe-driven face rotations. The project is greenfield with no existing code.

The most consequential choice in this stack is how to render the 3D cube. A wrong rendering choice means rewriting the most core part of the app, because every subsequent feature (scramble, timer, hints) builds on top of the 3D layer. The second consequential choice is the language and UI framework, because they govern the entire developer experience for every feature after foundation.

The team (or solo developer) wants to stay in Kotlin throughout and target Android SDK 24+ (covering 97%+ of active devices).

## Options considered

### Option 1: Kotlin + Jetpack Compose + SceneView (Filament) (chosen)

SceneView is a Compose-native 3D scene library wrapping Google Filament, a production PBR (physically based rendering) renderer used by Google in their AR products. It lets you place 3D nodes as Composables, handle gestures in Kotlin, and drive animations from ViewModel state.

**Pros**:
- Pure Kotlin throughout; no C++ or JNI needed
- Compose integration is first class; 3D and 2D UI live in the same Compose tree
- Filament provides PBR quality without writing GLSL shaders
- Actively maintained by Google and a community; SceneView is ~3k GitHub stars with Compose-first design
- Runs on top of Vulkan or OpenGL ES transparently; Filament picks the best available

**Cons**:
- SceneView is a community wrapper; less documentation than Unity or raw OpenGL ES for unusual features
- Adds 8 to 12 MB native Filament library to APK size
- Fewer Stack Overflow answers than raw GLSurfaceView; harder debugging when Filament internals are involved

### Option 2: Kotlin + Jetpack Compose + OpenGL ES 3.x (GLSurfaceView)

Use the standard Android GLSurfaceView with OpenGL ES 3.x, all Kotlin on the Java side. Write all geometry, shaders, and animation code manually.

**Pros**:
- Zero external dependencies beyond the Android SDK
- Maximum transparency and control over every rendering detail
- The most documented path; thousands of OpenGL ES tutorials exist

**Cons**:
- Writing a correct 3D cube renderer (projection, lighting, face stickers, smooth rotation animation, touch-to-face raycasting) from scratch is a significant engineering task; easily 2 to 4 weeks before the cube feels polished
- OpenGL ES is frozen (no new features); Android routes it through the ANGLE translation layer to Vulkan on newer devices
- GLSurfaceView embedding in Compose requires AndroidView wrapper; less idiomatic

### Option 3: Godot 4 (GDScript game engine)

Use the Godot 4 game engine, which has a built-in scene editor, AnimationPlayer for face rotations, and a Vulkan renderer. GDScript is the primary language (Python-like); the Kotlin/JVM binding is in Beta.

**Pros**:
- Built-in scene editor makes face rotation animations easy to set up visually
- MIT licensed, zero cost
- Growing community and good mobile export to Android and iOS simultaneously

**Cons**:
- GDScript is not Kotlin; the team would learn a second language for a project that is otherwise pure Kotlin
- The Kotlin/JVM binding (Godot Kotlin/JVM) is Beta tier with potentially breaking API changes
- Exporting a Godot project as an Android app adds an extra build step and a larger APK; Godot is not embedded as a library, it is a full engine shell

### Option 4: libGDX (Kotlin JVM game framework)

libGDX is a Kotlin/Java-compatible game framework that handles OpenGL, input, and asset management. It works on Android and desktop.

**Pros**:
- Kotlin native (JVM-based); no GDScript, no C++
- Code-first control, no editor lock-in

**Cons**:
- Maintenance mode: no major new features, no Compose integration
- You write all scene graph and gesture logic manually, similar to the OpenGL ES option but with a libGDX abstraction layer on top
- Community is smaller and less active than SceneView or Godot 4

## Rationale

The dominant force is keeping the project in pure Kotlin while getting a polished 3D cube without a months-long detour into graphics programming. SceneView + Filament (Option 1) is the only option that satisfies both: it is Kotlin-native, Compose-integrated, and abstracts away the shader and geometry code that would otherwise consume weeks of the MVP schedule.

The raw OpenGL ES option (Option 2) was the obvious first thought, but writing a production-quality 3D cube renderer from scratch (correct orthographic versus perspective projection, per-face sticker coloring, smooth quaternion rotation animation, touch-to-face raycasting) is a real 3D graphics programming task. The result would be equivalent quality to Filament but with several weeks of additional work and no reuse path.

Godot 4 (Option 3) would be the pick if the team preferred a game engine workflow and was comfortable leaving Kotlin. The editor-based AnimationPlayer is genuinely better for game-style animations. But the project is not a game studio project: it is a puzzle game that wants Kotlin, Compose, and Android-native distribution. Godot adds a second language and a full engine shell. The tradeoff is not worth it here.

libGDX (Option 4) was eliminated quickly: maintenance mode with no Compose integration means choosing a framework that will not grow with the project and that adds no advantage over raw OpenGL ES.

The infrastructure choices (Gradle Kotlin DSL, ViewModel + StateFlow, ktlint, JUnit 5 + Robolectric, GitHub Actions) are all the established Android community defaults. There is no argument for choosing otherwise on a project of this size and risk profile.

## References

**Project sources**:
- docs/scope/scope.md: product scope confirming Android-native first, offline, casual audience, 3x3 only MVP

**Practices and standards**:
- Foundations before features: the stack decision gates every feature; a bad rendering choice is the most expensive redo
- Boring technology over exciting: established Kotlin + Compose + Filament stack over a novel or unproven path

**Links** (web verified during the landscape check on 2026-09-19):
- Android OpenGL ES developer guide: https://developer.android.com/develop/ui/views/graphics/opengl
- Google Filament: https://google.github.io/filament/
- SceneView for Android (GitHub): https://github.com/SceneView/sceneview-android
- Godot 4: https://godotengine.org/
- libGDX: https://libgdx.com/
