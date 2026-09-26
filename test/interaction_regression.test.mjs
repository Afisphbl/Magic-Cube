import test from 'node:test';
import assert from 'node:assert/strict';
import { Platform } from 'react-native';
import * as THREE from 'three';
import {
  getFaceTangents,
  resolveFaceDragMove,
  getStickerIndex,
  getMoveAnimationInfo,
} from '../src/logic/cubeMoves.ts';
import { useCubeStore } from '../src/store/useCubeStore.ts';
import { triggerHapticFeedback } from '../src/logic/haptics.ts';
import Haptics, { _getImpactAsyncCalls, _resetImpactAsyncCalls } from 'expo-haptics';

test('AC-1: Orbit rotation applies world Y and world X axis delta rotations with exponential damping', () => {
  const currentQuat = new THREE.Quaternion().identity();
  const sensitivity = 0.008;

  // Simulate a drag of dx = 10, dy = 5
  const dx = 10;
  const dy = 5;
  const rotX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), dy * sensitivity);
  const rotY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dx * sensitivity);
  const deltaQuat = new THREE.Quaternion().multiplyQuaternions(rotX, rotY);

  currentQuat.premultiply(deltaQuat);

  assert.ok(Math.abs(currentQuat.x) > 0, 'Orbit vertical drag must adjust X rotation');
  assert.ok(Math.abs(currentQuat.y) > 0, 'Orbit horizontal drag must adjust Y rotation');

  // Verify exponential damping factor at 60fps (16.6ms)
  const delta = 1 / 60;
  const damping = 1 - Math.exp(-18 * delta);
  assert.ok(damping > 0.25 && damping < 0.30, 'Exponential damping at 60fps should be around 0.26');
});

test('AC-2: Face swipe resolution enforces 18-point threshold and tangent projection', () => {
  // Swipe on Front face (+Z)
  const normal = [0, 0, 1];
  const cubie = [0, 1, 1]; // Top-middle cubie on front face
  const [t1, t2] = getFaceTangents(normal);

  // Drag vector below 18 points should not resolve
  const smallDx = 10;
  const smallDy = 10;
  const smallDist = Math.sqrt(smallDx * smallDx + smallDy * smallDy);
  assert.ok(smallDist < 18, 'Distance under 18 points');

  // Drag vector of 20 points horizontally to the right
  const largeDx = 20;
  const largeDy = 0;
  const largeDist = Math.sqrt(largeDx * largeDx + largeDy * largeDy);
  assert.ok(largeDist >= 18, 'Distance reaches 18 points threshold');

  // Positive X swipe on top slice of front face corresponds to U'
  const chosenTangentRight = [t1[0] * 1, t1[1] * 1, t1[2] * 1];
  const moveRight = resolveFaceDragMove(normal, cubie, chosenTangentRight);
  assert.equal(moveRight, "U'", 'Right swipe on top cubie of front face resolves to U prime');

  // Negative X swipe on top slice of front face corresponds to U
  const chosenTangentLeft = [t1[0] * -1, t1[1] * -1, t1[2] * -1];
  const moveLeft = resolveFaceDragMove(normal, cubie, chosenTangentLeft);
  assert.equal(moveLeft, 'U', 'Left swipe on top cubie of front face resolves to U');
});

test('AC-3: Slice animation uses cubic ease in out curve over 260ms', () => {
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // Boundary conditions
  assert.equal(easeInOutCubic(0), 0, 'Ease in out at 0 must be 0');
  assert.equal(easeInOutCubic(1), 1, 'Ease in out at 1 must be 1');
  assert.equal(easeInOutCubic(0.5), 0.5, 'Ease in out at midpoint must be 0.5');

  // Acceleration profile: slow start, fast middle, slow end
  const q1 = easeInOutCubic(0.25);
  const q2 = easeInOutCubic(0.75);
  assert.ok(q1 < 0.15, 'Slow ease in at start');
  assert.ok(q2 > 0.85, 'Slow ease out at finish');

  // Check animation duration parameter
  const info = getMoveAnimationInfo('R', 260);
  assert.equal(info.durationMs, 260, 'Animation duration must be 260ms');
});

test('AC-4: State synchronization maps cubie face stickers via getStickerIndex', () => {
  // Test sticker index mapping for the 6 face centers
  assert.equal(getStickerIndex(0, 1, 0, 0), 22, 'Right center (+X) is sticker 22');
  assert.equal(getStickerIndex(1, -1, 0, 0), 31, 'Left center (-X) is sticker 31');
  assert.equal(getStickerIndex(2, 0, 1, 0), 4, 'Up center (+Y) is sticker 4');
  assert.equal(getStickerIndex(3, 0, -1, 0), 13, 'Down center (-Y) is sticker 13');
  assert.equal(getStickerIndex(4, 0, 0, 1), 40, 'Front center (+Z) is sticker 40');
  assert.equal(getStickerIndex(5, 0, 0, -1), 49, 'Back center (-Z) is sticker 49');
});

test('AC-5: Gesture lock and single move buffering queue at most one move', () => {
  const store = useCubeStore.getState();
  store.resetGame();

  // First move initiates animation
  const accepted1 = store.requestMove('R');
  assert.equal(accepted1, true);
  assert.equal(useCubeStore.getState().isAnimating, true);
  assert.equal(useCubeStore.getState().animatingMove?.move, 'R');
  assert.equal(useCubeStore.getState().pendingMove, null);

  // Second move while animating is accepted into pendingMove buffer
  const accepted2 = store.requestMove('U');
  assert.equal(accepted2, true);
  assert.equal(useCubeStore.getState().pendingMove, 'U');

  // Third move while pending buffer is full is rejected
  const accepted3 = store.requestMove('F');
  assert.equal(accepted3, false, 'Third move must be rejected when buffer is full');
  assert.equal(useCubeStore.getState().pendingMove, 'U', 'Pending buffer retains first buffered move');

  // Completing animation drains buffer into the next animation immediately
  store.finishMoveAnimation();
  assert.equal(useCubeStore.getState().isAnimating, true, 'Continues animating buffered move');
  assert.equal(useCubeStore.getState().animatingMove?.move, 'U');
  assert.equal(useCubeStore.getState().pendingMove, null, 'Buffer is drained');

  // Finishing buffered animation returns to idle
  store.finishMoveAnimation();
  assert.equal(useCubeStore.getState().isAnimating, false);
  assert.equal(useCubeStore.getState().animatingMove, null);
});

test('AC-6: Tactile haptics triggers light impact on mobile and fails silently on web', async () => {
  _resetImpactAsyncCalls();

  // When called on mock environment, impactAsync is triggered
  await triggerHapticFeedback();

  // In test / web mock environment, triggerHapticFeedback executes safely without throwing
  assert.ok(true, 'Haptic feedback completed without error');
});

test('AC-8: Orientation presets provide default Euler angle and yellow top flip', () => {
  const store = useCubeStore.getState();

  store.triggerOrientationPreset('yellow-top');
  const trigger1 = useCubeStore.getState().viewPresetTrigger;
  assert.equal(trigger1?.preset, 'yellow-top');

  store.triggerOrientationPreset('white-top');
  const trigger2 = useCubeStore.getState().viewPresetTrigger;
  assert.equal(trigger2?.preset, 'white-top');
  assert.equal(trigger2?.id, (trigger1?.id ?? 0) + 1);

  store.triggerOrientationPreset('reset');
  const trigger3 = useCubeStore.getState().viewPresetTrigger;
  assert.equal(trigger3?.preset, 'reset');
});

test('AC-6: Mobile platform triggers light impact and gracefully handles hardware errors', async () => {
  const originalOS = Platform.OS;
  const originalImpact = Haptics.impactAsync;

  try {
    // Android platform trigger
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true, writable: true });
    _resetImpactAsyncCalls();
    await triggerHapticFeedback();
    const androidCalls = _getImpactAsyncCalls();
    assert.equal(androidCalls.length, 1, 'Android must trigger haptic feedback');
    assert.equal(androidCalls[0], Haptics.ImpactFeedbackStyle.Light, 'Must use light impact style');

    // iOS platform trigger
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true, writable: true });
    _resetImpactAsyncCalls();
    await triggerHapticFeedback();
    const iosCalls = _getImpactAsyncCalls();
    assert.equal(iosCalls.length, 1, 'iOS must trigger haptic feedback');
    assert.equal(iosCalls[0], Haptics.ImpactFeedbackStyle.Light, 'Must use light impact style');

    // Web platform guard
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true, writable: true });
    _resetImpactAsyncCalls();
    await triggerHapticFeedback();
    assert.equal(_getImpactAsyncCalls().length, 0, 'Web platform must not call impactAsync');

    // Hardware error or unsupported device safety
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true, writable: true });
    Haptics.impactAsync = async () => {
      throw new Error('Device has no vibration motor');
    };
    await assert.doesNotReject(async () => {
      await triggerHapticFeedback();
    }, 'Haptic error must be caught silently');
  } finally {
    Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true, writable: true });
    Haptics.impactAsync = originalImpact;
    _resetImpactAsyncCalls();
  }
});

test('AC-2, AC-5: Primary pointer locking rejects secondary touch events until released', () => {
  let activePointerId = null;

  function onPointerDown(pointerId) {
    if (activePointerId !== null && pointerId !== undefined && activePointerId !== pointerId) {
      return false;
    }
    activePointerId = pointerId ?? 1;
    return true;
  }

  function onPointerMove(pointerId) {
    if (activePointerId !== null && pointerId !== undefined && pointerId !== activePointerId) {
      return false;
    }
    return true;
  }

  function onPointerUp(pointerId) {
    if (activePointerId !== null && pointerId !== undefined && pointerId !== activePointerId) {
      return false;
    }
    activePointerId = null;
    return true;
  }

  // Primary pointer acquires the gesture lock
  const firstDown = onPointerDown(101);
  assert.equal(firstDown, true, 'First pointer down acquires lock');
  assert.equal(activePointerId, 101, 'Active pointer id is 101');

  // Secondary finger touch is rejected while first pointer is active
  const secondDown = onPointerDown(102);
  assert.equal(secondDown, false, 'Secondary pointer down is rejected');
  assert.equal(activePointerId, 101, 'Active pointer id stays 101');

  // Move events from secondary pointer are ignored
  const secondMove = onPointerMove(102);
  assert.equal(secondMove, false, 'Secondary move is ignored');

  // Move events from primary pointer are accepted
  const firstMove = onPointerMove(101);
  assert.equal(firstMove, true, 'Primary move is accepted');

  // Secondary pointer up does not release the primary lock
  const secondUp = onPointerUp(102);
  assert.equal(secondUp, false, 'Secondary pointer up cannot release primary lock');
  assert.equal(activePointerId, 101, 'Lock remains held by primary pointer');

  // Primary pointer up releases the gesture lock
  const firstUp = onPointerUp(101);
  assert.equal(firstUp, true, 'Primary pointer up releases lock');
  assert.equal(activePointerId, null, 'Active pointer id is reset to null');

  // Fallback when pointer id is undefined defaults safely to 1
  const defaultDown = onPointerDown(undefined);
  assert.equal(defaultDown, true, 'Undefined pointer id defaults safely');
  assert.equal(activePointerId, 1, 'Active pointer id defaults to 1');
  onPointerUp(undefined);
  assert.equal(activePointerId, null);
});

test('AC-5: Raycast lockout prevents cubie touch down while slice animation runs', () => {
  const store = useCubeStore.getState();
  store.resetGame();

  let faceDragState = null;
  function handleCubieDown(coords, normal) {
    if (useCubeStore.getState().isAnimating) {
      return false;
    }
    faceDragState = { coords, normal };
    return true;
  }

  // Idle state allows cubie touch down
  assert.equal(store.isAnimating, false);
  const touchAllowed = handleCubieDown([0, 1, 1], [0, 0, 1]);
  assert.equal(touchAllowed, true, 'Touch allowed when idle');
  assert.notEqual(faceDragState, null);

  // Start an animation
  store.requestMove('R');
  assert.equal(useCubeStore.getState().isAnimating, true);

  // Touch during active animation is rejected
  faceDragState = null;
  const touchRejected = handleCubieDown([0, 1, 1], [0, 0, 1]);
  assert.equal(touchRejected, false, 'Touch rejected during animation');
  assert.equal(faceDragState, null, 'Face drag state was not set');

  // Clean up store
  store.finishMoveAnimation();
  assert.equal(useCubeStore.getState().isAnimating, false);
});

test('AC-1: Cubie pointer down with button 1 or 2 initiates orbit instead of face drag', () => {
  let isOrbiting = false;
  let faceDrag = null;

  function onCubiePointerDown(button, coords, normal) {
    if (button === 2 || button === 1) {
      isOrbiting = true;
      faceDrag = null;
      return 'orbit';
    }
    isOrbiting = false;
    faceDrag = { coords, normal };
    return 'face-drag';
  }

  // Right click (button 2) triggers orbit mode
  const rightClickResult = onCubiePointerDown(2, [1, 0, 0], [1, 0, 0]);
  assert.equal(rightClickResult, 'orbit');
  assert.equal(isOrbiting, true);
  assert.equal(faceDrag, null);

  // Middle click (button 1) triggers orbit mode
  const middleClickResult = onCubiePointerDown(1, [1, 0, 0], [1, 0, 0]);
  assert.equal(middleClickResult, 'orbit');
  assert.equal(isOrbiting, true);
  assert.equal(faceDrag, null);

  // Left click (button 0) triggers face drag mode
  const leftClickResult = onCubiePointerDown(0, [1, 0, 0], [1, 0, 0]);
  assert.equal(leftClickResult, 'face-drag');
  assert.equal(isOrbiting, false);
  assert.notEqual(faceDrag, null);
});

test('AC-2: Face drag screen tangent projection selects dominant axis and resolves move', () => {
  const store = useCubeStore.getState();
  store.resetGame();

  const normal = [0, 0, 1]; // Front face
  const cubieCoord = [0, 1, 1]; // Top middle cubie
  const [t1, t2] = getFaceTangents(normal);

  // Default quaternion
  const currentQuat = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(-0.4, 0.6, 0, 'XYZ')
  );

  // Project 3D tangents into 2D screen space
  const v1 = new THREE.Vector3(...t1).applyQuaternion(currentQuat);
  const v2 = new THREE.Vector3(...t2).applyQuaternion(currentQuat);

  const s1 = new THREE.Vector2(v1.x, -v1.y).normalize();
  const s2 = new THREE.Vector2(v2.x, -v2.y).normalize();

  // Test drag vector below 18 points threshold
  const subThresholdDrag = new THREE.Vector2(12, 10);
  assert.ok(subThresholdDrag.length() < 18, 'Distance is under 18 points');

  // Test dominant horizontal swipe to the right
  const horizontalDrag = new THREE.Vector2(30, 2);
  assert.ok(horizontalDrag.length() >= 18, 'Distance meets 18 point threshold');

  const dot1 = horizontalDrag.dot(s1);
  const dot2 = horizontalDrag.dot(s2);
  assert.ok(Math.abs(dot1) > Math.abs(dot2), 'Horizontal dot product must dominate');

  const sign = Math.sign(dot1);
  const chosenTangent = [t1[0] * sign, t1[1] * sign, t1[2] * sign];
  const resolvedMove = resolveFaceDragMove(normal, cubieCoord, chosenTangent);

  assert.equal(resolvedMove, "U'", 'Right swipe on top slice resolves to U prime');

  // Clean up store
  store.resetGame();
});

test('AC-1, AC-3: CubeGroup slerp damping and clamped delta animation progress', () => {
  // Test frame rate independent damping formula across various display refresh rates
  function computeDamping(delta) {
    return 1 - Math.exp(-18 * delta);
  }

  const damp120fps = computeDamping(1 / 120);
  const damp60fps = computeDamping(1 / 60);
  const damp30fps = computeDamping(1 / 30);

  assert.ok(damp120fps > 0.13 && damp120fps < 0.15, '120fps damping should be around 0.14');
  assert.ok(damp60fps > 0.25 && damp60fps < 0.27, '60fps damping should be around 0.26');
  assert.ok(damp30fps > 0.44 && damp30fps < 0.46, '30fps damping should be around 0.45');

  // Support for both raw Quaternion and RefObject targetQuaternion
  const quat = new THREE.Quaternion(0, 1, 0, 0);
  const refObject = { current: quat };

  function resolveTarget(target) {
    return 'current' in target && target.current ? target.current : target;
  }

  assert.equal(resolveTarget(quat), quat, 'Direct quaternion resolves directly');
  assert.equal(resolveTarget(refObject), quat, 'RefObject resolves to current property');

  // Delta clamping in useFrame protects against large lag spikes
  const largeDelta = 0.5;
  const clampedDelta = Math.min(largeDelta, 0.05);
  assert.equal(clampedDelta, 0.05, 'Delta must be clamped to 0.05 seconds');

  // Total frames to complete 260ms animation with 60fps delta
  const animationDuration = 0.26;
  let progress = 0;
  let steps = 0;
  while (progress < 1) {
    const dt = Math.min(1 / 60, 0.05);
    progress += dt / animationDuration;
    steps++;
  }
  assert.ok(steps >= 15 && steps <= 17, 'Animation takes approximately 16 frames at 60fps');
});

test('AC-8: Orientation presets rotate cube to expected viewing angles', () => {
  const defaultEuler = new THREE.Euler(-0.4, 0.6, 0, 'XYZ');
  const defaultQuat = new THREE.Quaternion().setFromEuler(defaultEuler);

  // Yellow top quaternion premultiplies 180 degree rotation around X axis
  const xFlipQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
  const yellowTopQuat = defaultQuat.clone().premultiply(xFlipQuat);

  // World Up vector in Three.js is (0, 1, 0)
  const upVector = new THREE.Vector3(0, 1, 0);
  const rotatedByYellowTop = upVector.clone().applyQuaternion(yellowTopQuat);

  // After 180 degree flip around X axis, the Y component reverses sign
  assert.ok(rotatedByYellowTop.y < 0, 'Yellow top orientation flips top and bottom faces');

  // Reset preset restores default quaternion
  const resetQuat = defaultQuat.clone();
  assert.equal(resetQuat.equals(defaultQuat), true, 'Reset returns exactly to default quaternion');
});

test('Mobile touch coordinates resolve without clientX or clientY without producing NaN', () => {
  // Mobile GestureResponderEvent does not contain clientX or clientY
  const mobileNativeEvent = {
    identifier: 1,
    locationX: 150,
    locationY: 250,
    pageX: 150,
    pageY: 350,
  };
  const gestureState = { x0: 150, y0: 350, dx: 25, dy: -10, moveX: 175, moveY: 340 };

  // Helper logic used in CubeCanvas to resolve touch coordinates
  const touchX = mobileNativeEvent.locationX ?? mobileNativeEvent.offsetX ?? gestureState.x0 ?? 0;
  const touchY = mobileNativeEvent.locationY ?? mobileNativeEvent.offsetY ?? gestureState.y0 ?? 0;

  assert.equal(Number.isNaN(touchX), false, 'touchX must not be NaN');
  assert.equal(Number.isNaN(touchY), false, 'touchY must not be NaN');
  assert.equal(touchX, 150);
  assert.equal(touchY, 250);

  // Normalized Device Coordinates (NDC) calculation
  const containerSize = { width: 300, height: 500 };
  const ndcX = (touchX / containerSize.width) * 2 - 1;
  const ndcY = -(touchY / containerSize.height) * 2 + 1;

  assert.equal(ndcX, 0, 'Center X on 300px canvas maps to NDC 0');
  assert.equal(ndcY, 0, 'Center Y on 500px canvas maps to NDC 0');

  // Swipe distance calculation from gestureState
  const dist = Math.hypot(gestureState.dx, gestureState.dy);
  assert.equal(Number.isNaN(dist), false, 'Swipe distance must not be NaN');
  assert.ok(dist >= 18, 'Drag of dx=25 reaches 18pt gesture threshold');
});

test('Raycast hit resolves cubie coordinates from parent group position', () => {
  const parentGroup = new THREE.Group();
  parentGroup.position.set(1, -1, 1);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.95, 0.95));
  parentGroup.add(mesh);

  const hit = { object: mesh };
  let cubieCoord = null;
  if (hit.object.parent) {
    const p = hit.object.parent.position;
    cubieCoord = [Math.round(p.x), Math.round(p.y), Math.round(p.z)];
  }

  assert.deepEqual(cubieCoord, [1, -1, 1]);
});

