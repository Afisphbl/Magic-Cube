import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Platform, useWindowDimensions, PanResponder } from 'react-native';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CubeGroup } from './CubeGroup';
import { useCubeStore } from '../store/useCubeStore';
import { colors } from '../theme/colors';
import {
  getFaceTangents,
  resolveFaceDragMove,
} from '../logic/cubeMoves';
import { getCameraDistance } from '../logic/cameraUtils';

const DEFAULT_QUATERNION = new THREE.Quaternion().setFromEuler(
  new THREE.Euler(-0.4, 0.6, 0, 'XYZ')
);

const YELLOW_TOP_QUATERNION = DEFAULT_QUATERNION.clone().premultiply(
  new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI)
);

interface SceneBridgeData {
  camera: THREE.Camera;
  scene: THREE.Scene;
  size: { width: number; height: number };
}

const SceneBridge: React.FC<{
  bridgeRef: React.MutableRefObject<SceneBridgeData | null>;
}> = ({ bridgeRef }) => {
  const { camera, scene, size } = useThree();

  useEffect(() => {
    bridgeRef.current = { camera, scene, size };
    return () => {
      bridgeRef.current = null;
    };
  }, [camera, scene, size, bridgeRef]);

  return null;
};

const ResponsiveCamera: React.FC = () => {
  const { camera, size } = useThree();

  useEffect(() => {
    if (!size.width || !size.height) return;
    const distance = getCameraDistance(size.width, size.height);
    camera.position.set(0, 0, distance);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);

  return null;
};

export const CubeCanvas: React.FC = () => {
  const { width, height } = useWindowDimensions();
  const initialDistance = width && height ? getCameraDistance(width, height) : 6.8;

  const targetQuatRef = useRef<THREE.Quaternion>(DEFAULT_QUATERNION.clone());
  const currentQuatRef = useRef<THREE.Quaternion>(DEFAULT_QUATERNION.clone());
  const cubeGroupRef = useRef<THREE.Group | null>(null);
  const bridgeRef = useRef<SceneBridgeData | null>(null);

  const viewPresetTrigger = useCubeStore((state) => state.viewPresetTrigger);

  // Sync orientation when preset is triggered from UI
  useEffect(() => {
    if (!viewPresetTrigger) return;
    let nextQuat: THREE.Quaternion;
    if (viewPresetTrigger.preset === 'yellow-top') {
      nextQuat = YELLOW_TOP_QUATERNION.clone();
    } else if (viewPresetTrigger.preset === 'white-top' || viewPresetTrigger.preset === 'reset') {
      nextQuat = DEFAULT_QUATERNION.clone();
    } else {
      return;
    }
    currentQuatRef.current.copy(nextQuat);
    targetQuatRef.current.copy(nextQuat);
  }, [viewPresetTrigger]);

  // Primary touch locking
  const activeTouchIdRef = useRef<number | string | null>(null);

  // Orbit tracking
  const isOrbitingRef = useRef<boolean>(false);
  const lastOrbitPosRef = useRef<{ x: number; y: number } | null>(null);

  // Face drag tracking
  const faceDragRef = useRef<{
    cubieCoord: [number, number, number];
    normal: [number, number, number];
    startScreen: { x: number; y: number };
  } | null>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.hypot(gestureState.dx, gestureState.dy) > 2;
      },
      onMoveShouldSetPanResponderCapture: () => false,

      onPanResponderGrant: (evt, gestureState) => {
        if (useCubeStore.getState().isPaused) return;

        // Skip scramble if user taps while shuffling (AC-5)
        if (useCubeStore.getState().gamePhase === 'SCRAMBLING') {
          useCubeStore.getState().skipScramble();
          return;
        }

        const native = (evt.nativeEvent || {}) as any;
        const touchId = native.identifier ?? 0;
        if (activeTouchIdRef.current !== null && activeTouchIdRef.current !== touchId) {
          return;
        }
        activeTouchIdRef.current = touchId;

        const touchX = native.locationX ?? native.offsetX ?? gestureState.x0 ?? 0;
        const touchY = native.locationY ?? native.offsetY ?? gestureState.y0 ?? 0;

        // Right-click or middle-click on web triggers orbit directly (AC-1)
        const button = native.button;
        if (button === 1 || button === 2) {
          isOrbitingRef.current = true;
          faceDragRef.current = null;
          lastOrbitPosRef.current = {
            x: gestureState.x0 || touchX,
            y: gestureState.y0 || touchY,
          };
          return;
        }

        const bridge = bridgeRef.current;
        if (bridge && cubeGroupRef.current && !useCubeStore.getState().isAnimating) {
          const { camera, size } = bridge;
          if (size.width > 0 && size.height > 0) {
            const ndcX = (touchX / size.width) * 2 - 1;
            const ndcY = -(touchY / size.height) * 2 + 1;

            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
            cubeGroupRef.current.updateMatrixWorld(true);

            const intersects = raycaster.intersectObjects(cubeGroupRef.current.children, true);
            if (intersects.length > 0) {
              const hit = intersects[0];
              let cubieCoord: [number, number, number] | null = hit.object.userData?.cubieCoord ?? null;
              if (!cubieCoord && hit.object.parent) {
                const p = hit.object.parent.position;
                cubieCoord = [Math.round(p.x), Math.round(p.y), Math.round(p.z)];
              }

              if (cubieCoord && hit.face?.normal) {
                const normal: [number, number, number] = [
                  Math.round(hit.face.normal.x),
                  Math.round(hit.face.normal.y),
                  Math.round(hit.face.normal.z),
                ];

                faceDragRef.current = {
                  cubieCoord,
                  normal,
                  startScreen: { x: touchX, y: touchY },
                };
                isOrbitingRef.current = false;
                lastOrbitPosRef.current = null;
                return;
              }
            }
          }
        }

        // Tap on background or during animation triggers orbit
        isOrbitingRef.current = true;
        faceDragRef.current = null;
        lastOrbitPosRef.current = {
          x: gestureState.x0 || touchX,
          y: gestureState.y0 || touchY,
        };
      },

      onPanResponderMove: (evt, gestureState) => {
        if (useCubeStore.getState().isPaused) return;

        const native = (evt.nativeEvent || {}) as any;
        const touchId = native.identifier ?? 0;
        if (activeTouchIdRef.current !== null && activeTouchIdRef.current !== touchId) {
          return;
        }

        // Two-finger gesture forces orbit mode anywhere
        if (native.touches && native.touches.length >= 2) {
          isOrbitingRef.current = true;
          faceDragRef.current = null;
        }

        // 1. Orbit handling
        if (isOrbitingRef.current) {
          const currentX = gestureState.moveX || (gestureState.x0 + gestureState.dx);
          const currentY = gestureState.moveY || (gestureState.y0 + gestureState.dy);

          if (!lastOrbitPosRef.current) {
            lastOrbitPosRef.current = { x: currentX, y: currentY };
            return;
          }

          const dx = currentX - lastOrbitPosRef.current.x;
          const dy = currentY - lastOrbitPosRef.current.y;
          lastOrbitPosRef.current = { x: currentX, y: currentY };

          const sensitivity = 0.008;
          const rotX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), dy * sensitivity);
          const rotY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dx * sensitivity);
          const deltaQuat = new THREE.Quaternion().multiplyQuaternions(rotX, rotY);

          currentQuatRef.current.premultiply(deltaQuat);
          targetQuatRef.current.copy(currentQuatRef.current);
          return;
        }

        // 2. Face swipe handling
        if (faceDragRef.current && !useCubeStore.getState().isAnimating) {
          const dx = gestureState.dx;
          const dy = gestureState.dy;
          const dist = Math.hypot(dx, dy);

          if (dist >= 18) {
            const { normal, cubieCoord } = faceDragRef.current;
            const [t1, t2] = getFaceTangents(normal);

            const v1 = new THREE.Vector3(...t1).applyQuaternion(currentQuatRef.current);
            const v2 = new THREE.Vector3(...t2).applyQuaternion(currentQuatRef.current);

            const s1 = new THREE.Vector2(v1.x, -v1.y).normalize();
            const s2 = new THREE.Vector2(v2.x, -v2.y).normalize();

            const dragVec = new THREE.Vector2(dx, dy);
            const dot1 = dragVec.dot(s1);
            const dot2 = dragVec.dot(s2);

            let chosenTangent: [number, number, number];
            if (Math.abs(dot1) > Math.abs(dot2)) {
              const sign = Math.sign(dot1);
              chosenTangent = [t1[0] * sign, t1[1] * sign, t1[2] * sign];
            } else {
              const sign = Math.sign(dot2);
              chosenTangent = [t2[0] * sign, t2[1] * sign, t2[2] * sign];
            }

            const move = resolveFaceDragMove(normal, cubieCoord, chosenTangent);
            if (move) {
              useCubeStore.getState().requestMove(move);
              faceDragRef.current = null;
            } else {
              // Center piece or invalid slice gesture: transition to orbit mode
              isOrbitingRef.current = true;
              faceDragRef.current = null;
              lastOrbitPosRef.current = {
                x: gestureState.moveX || (gestureState.x0 + gestureState.dx),
                y: gestureState.moveY || (gestureState.y0 + gestureState.dy),
              };
            }
          }
        }
      },

      onPanResponderRelease: () => {
        activeTouchIdRef.current = null;
        isOrbitingRef.current = false;
        faceDragRef.current = null;
        lastOrbitPosRef.current = null;
      },
      onPanResponderTerminate: () => {
        activeTouchIdRef.current = null;
        isOrbitingRef.current = false;
        faceDragRef.current = null;
        lastOrbitPosRef.current = null;
      },
    })
  ).current;

  return (
    <View
      style={styles.container}
      {...panResponder.panHandlers}
      {...(Platform.OS === 'web'
        ? { onContextMenu: (e: any) => e.preventDefault?.() }
        : {})}
    >
      <View style={styles.canvasWrapper} pointerEvents="none">
        <Canvas
          camera={{ position: [0, 0, initialDistance], fov: 45 }}
          style={styles.canvas}
        >
          <ResponsiveCamera />
          <SceneBridge bridgeRef={bridgeRef} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <directionalLight position={[-5, -5, -5]} intensity={0.3} />

          <CubeGroup
            groupRef={cubeGroupRef}
            targetQuaternion={targetQuatRef}
          />
        </Canvas>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    ...(Platform.OS === 'web' ? ({ touchAction: 'none', userSelect: 'none' } as any) : {}),
  },
  canvasWrapper: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
});
