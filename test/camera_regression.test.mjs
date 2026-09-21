import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { getCameraDistance } from '../src/logic/cameraUtils.ts';

// Cube physical parameters matching the scene
const cubieHalfSize = 0.95 / 2;
const scale = 0.78;
const fov = 45;
const tanFov2 = Math.tan((fov / 2) * Math.PI / 180);

// Generate all corner vertices for 26 cubies
const cubieCorners = [];
for (const x of [-1, 0, 1]) {
  for (const y of [-1, 0, 1]) {
    for (const z of [-1, 0, 1]) {
      if (x === 0 && y === 0 && z === 0) continue;
      for (const dx of [-cubieHalfSize, cubieHalfSize]) {
        for (const dy of [-cubieHalfSize, cubieHalfSize]) {
          for (const dz of [-cubieHalfSize, cubieHalfSize]) {
            cubieCorners.push(new THREE.Vector3((x + dx) * scale, (y + dy) * scale, (z + dz) * scale));
          }
        }
      }
    }
  }
}

// Bounding radius from origin
let cubeRadius = 0;
for (const v of cubieCorners) {
  cubeRadius = Math.max(cubeRadius, v.length());
}

test('cube radius is correctly derived', () => {
  assert.ok(cubeRadius > 1.9 && cubeRadius < 2.1, 'Cube radius should be around 2.0');
});

test('handles invalid or zero screen dimensions safely', () => {
  assert.equal(getCameraDistance(0, 0), 6.8);
  assert.equal(getCameraDistance(-100, 500), 6.8);
  assert.equal(getCameraDistance(500, 0), 6.8);
});

test('cube fits on small portrait screens without clipping', () => {
  const portraitScreens = [
    { name: 'iPhone SE 1st gen', width: 320, height: 480 },
    { name: 'Small Android', width: 360, height: 640 },
    { name: 'Standard Android', width: 360, height: 780 },
    { name: 'iPhone 14', width: 390, height: 844 },
  ];

  const initialEuler = new THREE.Euler(-0.4, 0.6, 0, 'XYZ');
  const initialQuat = new THREE.Quaternion().setFromEuler(initialEuler);

  for (const screen of portraitScreens) {
    const aspect = screen.width / screen.height;
    const distance = getCameraDistance(screen.width, screen.height);

    const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
    camera.position.set(0, 0, distance);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();

    // Verify initial orientation vertices fit inside NDC range (-1 to 1)
    for (const corner of cubieCorners) {
      const projected = corner.clone().applyQuaternion(initialQuat).project(camera);
      assert.ok(
        projected.x >= -1 && projected.x <= 1,
        `${screen.name} corner clipped horizontally at NDC x = ${projected.x}`
      );
      assert.ok(
        projected.y >= -1 && projected.y <= 1,
        `${screen.name} corner clipped vertically at NDC y = ${projected.y}`
      );
    }

    // Verify worst case sphere bounding box fits with safe margin
    const visibleHalfHeight = distance * tanFov2;
    const visibleHalfWidth = visibleHalfHeight * aspect;
    const sphereNdcX = cubeRadius / visibleHalfWidth;
    const sphereNdcY = cubeRadius / visibleHalfHeight;

    assert.ok(
      sphereNdcX <= 0.85,
      `${screen.name} sphere NDC X (${sphereNdcX}) exceeds safe margin 0.85`
    );
    assert.ok(
      sphereNdcY <= 0.85,
      `${screen.name} sphere NDC Y (${sphereNdcY}) exceeds safe margin 0.85`
    );
  }
});

test('cube fits on small landscape screens without clipping', () => {
  const landscapeScreens = [
    { name: 'Landscape 640x360', width: 640, height: 360 },
    { name: 'Tiny landscape 480x320', width: 480, height: 320 },
  ];

  for (const screen of landscapeScreens) {
    const aspect = screen.width / screen.height;
    const distance = getCameraDistance(screen.width, screen.height);

    const visibleHalfHeight = distance * tanFov2;
    const visibleHalfWidth = visibleHalfHeight * aspect;
    const sphereNdcX = cubeRadius / visibleHalfWidth;
    const sphereNdcY = cubeRadius / visibleHalfHeight;

    assert.ok(
      sphereNdcX <= 0.85,
      `${screen.name} landscape sphere NDC X (${sphereNdcX}) exceeds safe margin`
    );
    assert.ok(
      sphereNdcY <= 0.85,
      `${screen.name} landscape sphere NDC Y (${sphereNdcY}) exceeds safe margin`
    );
  }
});

test('handles non-finite dimensions and extreme aspect ratios safely', () => {
  assert.equal(getCameraDistance(NaN, 500), 6.8);
  assert.equal(getCameraDistance(500, NaN), 6.8);
  assert.equal(getCameraDistance(0, NaN), 6.8);

  // Square viewport
  const squareDist = getCameraDistance(600, 600);
  assert.ok(squareDist >= 6.8);
  const sqHalfH = squareDist * tanFov2;
  const sqHalfW = sqHalfH * 1.0;
  assert.ok(cubeRadius / sqHalfW <= 0.85);
  assert.ok(cubeRadius / sqHalfH <= 0.85);

  // Ultra-tall viewport (e.g. 240x1200)
  const tallDist = getCameraDistance(240, 1200);
  const tallHalfH = tallDist * tanFov2;
  const tallHalfW = tallHalfH * (240 / 1200);
  assert.ok(cubeRadius / tallHalfW <= 0.85, 'Ultra tall screen width clearance');

  // Ultra-wide viewport (e.g. 2560x600)
  const wideDist = getCameraDistance(2560, 600);
  const wideHalfH = wideDist * tanFov2;
  const wideHalfW = wideHalfH * (2560 / 600);
  assert.ok(cubeRadius / wideHalfW <= 0.85, 'Ultra wide screen width clearance');
  assert.ok(cubeRadius / wideHalfH <= 0.85, 'Ultra wide screen height clearance');
});

