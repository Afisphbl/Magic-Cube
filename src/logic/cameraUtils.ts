const FOV = 45;
const TAN_HALF_FOV = Math.tan((FOV / 2) * Math.PI / 180);
const BASE_DISTANCE = 6.8;
const CUBE_RADIUS = 1.993;

export function getCameraDistance(width: number, height: number): number {
  if (!width || !height || width <= 0 || height <= 0) {
    return BASE_DISTANCE;
  }

  const aspect = width / height;

  // Horizontal clearance for portrait screens where width is smaller than height
  let distH = BASE_DISTANCE;
  if (aspect < 1) {
    distH = BASE_DISTANCE / aspect;
  }

  // Vertical clearance for short screens or when headers and footers need space
  const hudHeight = height < 500 ? 120 : (height < 700 ? 160 : 210);
  const availableFraction = Math.max(0.35, (height - hudHeight) / height);
  const distV = CUBE_RADIUS / (TAN_HALF_FOV * availableFraction * 0.88);

  return Math.max(BASE_DISTANCE, distH, distV);
}
