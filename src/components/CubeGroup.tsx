import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Cubie } from './Cubie';
import { useCubeStore } from '../store/useCubeStore';

const CUBIE_COORDINATES: [number, number, number][] = [];
for (const x of [-1, 0, 1]) {
  for (const y of [-1, 0, 1]) {
    for (const z of [-1, 0, 1]) {
      if (x === 0 && y === 0 && z === 0) continue;
      CUBIE_COORDINATES.push([x, y, z]);
    }
  }
}

interface CubeGroupProps {
  targetQuaternion: THREE.Quaternion;
  onCubiePointerDown?: (
    e: ThreeEvent<PointerEvent>,
    coords: [number, number, number],
    normal: [number, number, number]
  ) => void;
}

// Smooth cubic ease in-out: zero start/end velocity, continuous acceleration
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export const CubeGroup: React.FC<CubeGroupProps> = ({
  targetQuaternion,
  onCubiePointerDown,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const cubieRefs = useRef<(THREE.Group | null)[]>([]);

  const cubeState = useCubeStore((state) => state.cubeState);
  const animatingMove = useCubeStore((state) => state.animatingMove);
  const finishMoveAnimation = useCubeStore((state) => state.finishMoveAnimation);

  // Animation timing
  const animProgressRef = useRef<number>(0);
  const completedRef = useRef<boolean>(false);
  const animationDuration = 0.26; // 260ms smooth transition

  useEffect(() => {
    if (animatingMove) {
      animProgressRef.current = 0;
      completedRef.current = false;
    } else {
      // Ensure all cubie groups are in neutral positions when not animating
      for (let i = 0; i < CUBIE_COORDINATES.length; i++) {
        const [x, y, z] = CUBIE_COORDINATES[i];
        const group = cubieRefs.current[i];
        if (group) {
          group.position.set(x, y, z);
          group.quaternion.identity();
        }
      }
    }
  }, [animatingMove]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      // Smooth frame-rate-independent rotation tracking
      const damping = 1 - Math.exp(-18 * delta);
      groupRef.current.quaternion.slerp(targetQuaternion, damping);
    }

    if (animatingMove) {
      const dt = Math.min(delta, 0.05);
      animProgressRef.current += dt / animationDuration;
      const progress = Math.min(1, animProgressRef.current);
      const eased = easeInOutCubic(progress);
      const angle = animatingMove.targetAngle * eased;

      const axisVec = new THREE.Vector3(...animatingMove.axis);
      const rotQuat = new THREE.Quaternion().setFromAxisAngle(axisVec, angle);

      for (let i = 0; i < CUBIE_COORDINATES.length; i++) {
        const [x, y, z] = CUBIE_COORDINATES[i];
        const group = cubieRefs.current[i];
        if (!group) continue;

        if (animatingMove.filter([x, y, z])) {
          const pos = new THREE.Vector3(x, y, z).applyAxisAngle(axisVec, angle);
          group.position.copy(pos);
          group.quaternion.copy(rotQuat);
        } else {
          group.position.set(x, y, z);
          group.quaternion.identity();
        }
      }

      if (progress >= 1 && !completedRef.current) {
        completedRef.current = true;
        // Reset all groups to rest positions before updating state
        for (let i = 0; i < CUBIE_COORDINATES.length; i++) {
          const [x, y, z] = CUBIE_COORDINATES[i];
          const group = cubieRefs.current[i];
          if (group) {
            group.position.set(x, y, z);
            group.quaternion.identity();
          }
        }
        finishMoveAnimation();
      }
    }
  });

  return (
    <group ref={groupRef} scale={0.78}>
      {CUBIE_COORDINATES.map(([x, y, z], index) => (
        <group
          key={`${x},${y},${z}`}
          ref={(el) => {
            cubieRefs.current[index] = el;
          }}
          position={[x, y, z]}
        >
          <Cubie
            x={x}
            y={y}
            z={z}
            cubeState={cubeState}
            onPointerDown={onCubiePointerDown}
          />
        </group>
      ))}
    </group>
  );
};
