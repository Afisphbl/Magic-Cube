import React, { useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { Canvas, ThreeEvent, useThree } from '@react-three/fiber';
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

  const viewPresetTrigger = useCubeStore((state) => state.viewPresetTrigger);

  // Sync orientation when preset is triggered from UI
  React.useEffect(() => {
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

  // Primary pointer locking (AC-2, AC-5)
  const activePointerIdRef = useRef<number | null>(null);

  // Orbit drag tracking
  const isOrbitingRef = useRef<boolean>(false);
  const pointerOriginRef = useRef<{ x: number; y: number } | null>(null);

  // Face drag tracking
  const faceDragRef = useRef<{
    cubieCoord: [number, number, number];
    normal: [number, number, number];
    startScreen: { x: number; y: number };
  } | null>(null);

  // Pointer event handlers
  const handleBackgroundPointerDown = useCallback((e: any) => {
    if (activePointerIdRef.current !== null && e.pointerId !== undefined && activePointerIdRef.current !== e.pointerId) {
      return;
    }
    activePointerIdRef.current = e.pointerId ?? 1;
    pointerOriginRef.current = { x: e.clientX, y: e.clientY };
    isOrbitingRef.current = true;
    faceDragRef.current = null;
    if (Platform.OS === 'web') {
      const target = (e.nativeEvent?.target || e.target) as HTMLElement | undefined;
      target?.setPointerCapture?.(e.pointerId);
    }
  }, []);

  const handleCubiePointerDown = useCallback((
    e: ThreeEvent<PointerEvent>,
    coords: [number, number, number],
    normal: [number, number, number]
  ) => {
    e.stopPropagation();

    // Check if another pointer is already active
    if (activePointerIdRef.current !== null && e.pointerId !== undefined && activePointerIdRef.current !== e.pointerId) {
      return;
    }

    // Right-click or middle-click: Orbit
    if (e.button === 2 || e.button === 1) {
      activePointerIdRef.current = e.pointerId ?? 1;
      pointerOriginRef.current = { x: e.clientX, y: e.clientY };
      isOrbitingRef.current = true;
      faceDragRef.current = null;
      if (Platform.OS === 'web') {
        const target = e.nativeEvent?.target as HTMLElement | undefined;
        target?.setPointerCapture?.(e.pointerId);
      }
      return;
    }

    // Left-click: Face rotation gesture
    // Reject touch down when an animation is active to prevent raycasting tilted meshes (AC-5)
    if (useCubeStore.getState().isAnimating) return;

    activePointerIdRef.current = e.pointerId ?? 1;
    faceDragRef.current = {
      cubieCoord: coords,
      normal,
      startScreen: { x: e.clientX, y: e.clientY },
    };
    if (Platform.OS === 'web') {
      const target = e.nativeEvent?.target as HTMLElement | undefined;
      target?.setPointerCapture?.(e.pointerId);
    }
  }, []);

  const handleGlobalPointerMove = useCallback((e: any) => {
    if (activePointerIdRef.current !== null && e.pointerId !== undefined && e.pointerId !== activePointerIdRef.current) {
      return;
    }

    // 1. Orbit handling
    if (isOrbitingRef.current && pointerOriginRef.current) {
      const dx = e.clientX - pointerOriginRef.current.x;
      const dy = e.clientY - pointerOriginRef.current.y;
      pointerOriginRef.current = { x: e.clientX, y: e.clientY };

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
      const dx = e.clientX - faceDragRef.current.startScreen.x;
      const dy = e.clientY - faceDragRef.current.startScreen.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist >= 18) {
        // Drag threshold reached: resolve intended face turn
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
        }

        faceDragRef.current = null;
      }
    }
  }, []);

  const handleGlobalPointerUp = useCallback((e?: any) => {
    if (e && activePointerIdRef.current !== null && e.pointerId !== undefined && e.pointerId !== activePointerIdRef.current) {
      return;
    }
    activePointerIdRef.current = null;
    isOrbitingRef.current = false;
    faceDragRef.current = null;
    pointerOriginRef.current = null;
  }, []);

  return (
    <View style={styles.container}>
      <Canvas
        camera={{ position: [0, 0, initialDistance], fov: 45 }}
        style={styles.canvas}
        onPointerMove={handleGlobalPointerMove}
        onPointerUp={handleGlobalPointerUp}
        onPointerLeave={handleGlobalPointerUp}
        onPointerMissed={handleBackgroundPointerDown}
      >
        <ResponsiveCamera />
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <directionalLight position={[-5, -5, -5]} intensity={0.3} />

        {/* Large invisible backdrop plane for capturing empty-space orbit drag */}
        <mesh
          position={[0, 0, -2]}
          onPointerDown={handleBackgroundPointerDown}
        >
          <planeGeometry args={[100, 100]} />
          <meshBasicMaterial
            transparent
            opacity={0}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>

        <CubeGroup
          targetQuaternion={targetQuatRef}
          onCubiePointerDown={handleCubiePointerDown}
        />
      </Canvas>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    ...(Platform.OS === 'web' ? ({ touchAction: 'none', userSelect: 'none' } as any) : {}),
  },
  canvas: {
    flex: 1,
  },
});
