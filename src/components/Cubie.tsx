import React, { useMemo } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { FACE_COLORS, PLASTIC_COLOR } from '../store/useCubeStore';
import { getStickerIndex } from '../logic/cubeMoves';

interface CubieProps {
  x: number;
  y: number;
  z: number;
  cubeState: number[];
  onPointerDown?: (
    e: ThreeEvent<PointerEvent>,
    cubieCoords: [number, number, number],
    normal: [number, number, number]
  ) => void;
}

export const Cubie: React.FC<CubieProps> = React.memo(({ x, y, z, cubeState, onPointerDown }) => {
  const colors = useMemo(() => {
    // 0: +X (Right), 1: -X (Left), 2: +Y (Up), 3: -Y (Down), 4: +Z (Front), 5: -Z (Back)
    const result: string[] = [];

    // Right (+X)
    if (x === 1) {
      const idx = getStickerIndex(0, x, y, z);
      result.push(FACE_COLORS[cubeState[idx]] ?? PLASTIC_COLOR);
    } else {
      result.push(PLASTIC_COLOR);
    }

    // Left (-X)
    if (x === -1) {
      const idx = getStickerIndex(1, x, y, z);
      result.push(FACE_COLORS[cubeState[idx]] ?? PLASTIC_COLOR);
    } else {
      result.push(PLASTIC_COLOR);
    }

    // Up (+Y)
    if (y === 1) {
      const idx = getStickerIndex(2, x, y, z);
      result.push(FACE_COLORS[cubeState[idx]] ?? PLASTIC_COLOR);
    } else {
      result.push(PLASTIC_COLOR);
    }

    // Down (-Y)
    if (y === -1) {
      const idx = getStickerIndex(3, x, y, z);
      result.push(FACE_COLORS[cubeState[idx]] ?? PLASTIC_COLOR);
    } else {
      result.push(PLASTIC_COLOR);
    }

    // Front (+Z)
    if (z === 1) {
      const idx = getStickerIndex(4, x, y, z);
      result.push(FACE_COLORS[cubeState[idx]] ?? PLASTIC_COLOR);
    } else {
      result.push(PLASTIC_COLOR);
    }

    // Back (-Z)
    if (z === -1) {
      const idx = getStickerIndex(5, x, y, z);
      result.push(FACE_COLORS[cubeState[idx]] ?? PLASTIC_COLOR);
    } else {
      result.push(PLASTIC_COLOR);
    }

    return result;
  }, [x, y, z, cubeState]);

  return (
    <mesh
      position={[0, 0, 0]}
      onPointerDown={(e) => {
        let normal: [number, number, number] = [0, 0, 1];
        if (e.face?.normal) {
          normal = [
            Math.round(e.face.normal.x),
            Math.round(e.face.normal.y),
            Math.round(e.face.normal.z),
          ];
        }
        onPointerDown?.(e, [x, y, z], normal);
      }}
    >
      <boxGeometry args={[0.95, 0.95, 0.95]} />
      {colors.map((color, index) => (
        <meshStandardMaterial
          key={index}
          attach={`material-${index}`}
          color={color}
          roughness={0.3}
          metalness={0.05}
        />
      ))}
    </mesh>
  );
});
