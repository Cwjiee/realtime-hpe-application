/**
 * Calculates the Euclidean distance between two points
 */
function getDistance(a, b) {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

/**
 * Normalizes a pose snapshot to be invariant to size and position.
 * 1. Centers the pose at the hips.
 * 2. Scales the pose so the torso size is 1.0.
 */
export function normalizePose(landmarks) {
  // Deep copy to avoid modifying the original MediaPipe data
  const normalized = JSON.parse(JSON.stringify(landmarks));

  // 1. CALCULATE CENTER (Midpoint of Hips)
  // MediaPipe: 23 = Left Hip, 24 = Right Hip
  const leftHip = normalized[23];
  const rightHip = normalized[24];
  
  const centerX = (leftHip.x + rightHip.x) / 2;
  const centerY = (leftHip.y + rightHip.y) / 2;

  // 2. TRANSLATE (Shift all points so hips are at 0,0)
  for (let i = 0; i < normalized.length; i++) {
    normalized[i].x -= centerX;
    normalized[i].y -= centerY;
  }

  // 3. CALCULATE SCALE (Torso Height)
  // We use the distance between Mid-Hip and Mid-Shoulder
  // MediaPipe: 11 = Left Shoulder, 12 = Right Shoulder
  const leftShoulder = normalized[11];
  const rightShoulder = normalized[12];

  const midShoulderX = (leftShoulder.x + rightShoulder.x) / 2;
  const midShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
  
  // Since we already shifted hips to 0,0, the mid-hip is now at 0,0.
  // We just need distance from (0,0) to the shifted mid-shoulder.
  const torsoSize = Math.sqrt(
    Math.pow(midShoulderX, 2) + Math.pow(midShoulderY, 2)
  );

  // 4. SCALE (Resize everything by the Torso Size)
  // Avoid division by zero if torso size is glitches
  const scaleFactor = torsoSize > 0 ? (1 / torsoSize) : 1;

  for (let i = 0; i < normalized.length; i++) {
    normalized[i].x *= scaleFactor;
    normalized[i].y *= scaleFactor;
    // We scale Z too to keep depth proportions, though we mostly use X/Y for 2D overlay
    normalized[i].z *= scaleFactor;
  }

  return normalized;
}
