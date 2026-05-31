/**
 * Angle-based pose scoring utilities.
 * Ported from backend/pose_scoring.py for real-time frontend guidance.
 */

// ─── Landmark indices (MediaPipe Pose) ──────────────────────────
export const LANDMARKS = {
  left_shoulder: 11,
  right_shoulder: 12,
  left_elbow: 13,
  right_elbow: 14,
  left_wrist: 15,
  right_wrist: 16,
  left_hip: 23,
  right_hip: 24,
  left_knee: 25,
  right_knee: 26,
  left_ankle: 27,
  right_ankle: 28,
};

// The joints we score, and the three landmark indices that form each angle.
// Order: [A, B, C] → angle is measured at B.
export const JOINT_DEFINITIONS = {
  left_elbow: [LANDMARKS.left_shoulder, LANDMARKS.left_elbow, LANDMARKS.left_wrist],
  right_elbow: [LANDMARKS.right_shoulder, LANDMARKS.right_elbow, LANDMARKS.right_wrist],
  left_shoulder: [LANDMARKS.left_elbow, LANDMARKS.left_shoulder, LANDMARKS.left_hip],
  right_shoulder: [LANDMARKS.right_elbow, LANDMARKS.right_shoulder, LANDMARKS.right_hip],
  left_knee: [LANDMARKS.left_hip, LANDMARKS.left_knee, LANDMARKS.left_ankle],
  right_knee: [LANDMARKS.right_hip, LANDMARKS.right_knee, LANDMARKS.right_ankle],
  left_hip: [LANDMARKS.left_shoulder, LANDMARKS.left_hip, LANDMARKS.left_knee],
  right_hip: [LANDMARKS.right_shoulder, LANDMARKS.right_hip, LANDMARKS.right_knee],
};

// ─── Reference angles (embedded from reference/*.json) ──────────
export const REFERENCE_ANGLES = {
  warrior1: {
    left_elbow: 163.3,
    right_elbow: 161.9,
    left_shoulder: 162.9,
    right_shoulder: 167.7,
    left_knee: 113.1,
    right_knee: 158.1,
    left_hip: 109.7,
    right_hip: 125.6,
  },
  warrior2: {
    left_elbow: 174.9,
    right_elbow: 175.2,
    left_shoulder: 100.1,
    right_shoulder: 92.1,
    left_knee: 115.3,
    right_knee: 167.6,
    left_hip: 99.3,
    right_hip: 127.0,
  },
  tree: {
    left_elbow: 49.9,
    right_elbow: 42.9,
    left_shoulder: 56.2,
    right_shoulder: 49.0,
    left_knee: 173.9,
    right_knee: 17.7,
    left_hip: 170.9,
    right_hip: 98.7,
  },
  triangle: {
    left_elbow: 173.3,
    right_elbow: 172.8,
    left_shoulder: 89.9,
    right_shoulder: 119.3,
    left_knee: 171.7,
    right_knee: 169.4,
    left_hip: 78.8,
    right_hip: 140.3,
  },
};

// ─── Tolerance ──────────────────────────────────────────────────
const ANGLE_TOLERANCE = 15.0; // degrees – matches backend

// ─── Math helpers ───────────────────────────────────────────────

/**
 * Calculate the angle at point B formed by points A-B-C (in degrees).
 */
function calculateAngle(a, b, c) {
  const radians =
    Math.atan2(c[1] - b[1], c[0] - b[0]) -
    Math.atan2(a[1] - b[1], a[0] - b[0]);
  let angle = Math.abs(radians * (180.0 / Math.PI));
  if (angle > 180.0) angle = 360 - angle;
  return angle;
}

/**
 * Normalize an array of [x,y] landmarks relative to hip-center and shoulder width.
 * @param {number[][]} landmarks – array of [x,y] for each of the 33 MediaPipe landmarks
 */
function normalizeLandmarks(landmarks) {
  const lh = landmarks[LANDMARKS.left_hip];
  const rh = landmarks[LANDMARKS.right_hip];
  const hipCenter = [(lh[0] + rh[0]) / 2, (lh[1] + rh[1]) / 2];

  const ls = landmarks[LANDMARKS.left_shoulder];
  const rs = landmarks[LANDMARKS.right_shoulder];
  const shoulderWidth =
    Math.sqrt((ls[0] - rs[0]) ** 2 + (ls[1] - rs[1]) ** 2) + 1e-6;

  return landmarks.map(([x, y]) => [
    (x - hipCenter[0]) / shoulderWidth,
    (y - hipCenter[1]) / shoulderWidth,
  ]);
}

/**
 * Extract the 8 scored joint angles from normalized landmarks.
 * @param {number[][]} norm – normalized landmarks
 * @returns {Object<string,number>} joint name → angle in degrees
 */
function extractJointAngles(norm) {
  const angles = {};
  for (const [joint, [a, b, c]] of Object.entries(JOINT_DEFINITIONS)) {
    angles[joint] = calculateAngle(norm[a], norm[b], norm[c]);
  }
  return angles;
}

// ─── Public API ─────────────────────────────────────────────────

/**
 * Compare live landmarks against the reference for a given pose and return
 * per-joint status (good / warning / bad) plus the angle error.
 *
 * @param {Array<{x:number, y:number}>} landmarkArray – the 33 MediaPipe landmarks for the current frame
 * @param {string} poseKey – one of 'warrior1', 'warrior2', 'tree', 'triangle'
 * @param {number} videoWidth - Width of the video stream
 * @param {number} videoHeight - Height of the video stream
 * @returns {Object<string, {status: 'good'|'warn'|'bad', error: number, userAngle: number, refAngle: number}>}
 */
export function computeJointGuidance(landmarkArray, poseKey, videoWidth = 640, videoHeight = 480) {
  const reference = REFERENCE_ANGLES[poseKey];
  if (!reference) return {};

  // Convert MediaPipe landmark objects to simple [x,y] arrays and un-normalize them
  const pts = landmarkArray.map((lm) => [lm.x * videoWidth, lm.y * videoHeight]);

  const norm = normalizeLandmarks(pts);
  const userAngles = extractJointAngles(norm);

  const result = {};
  for (const [joint, refAngle] of Object.entries(reference)) {
    const userAngle = userAngles[joint];
    if (userAngle == null) continue;
    // Shortest angular distance
    const diff = Math.abs(((userAngle - refAngle + 180) % 360) - 180);
    let status;
    if (diff <= ANGLE_TOLERANCE) {
      status = 'good';
    } else if (diff <= ANGLE_TOLERANCE * 2) {
      status = 'warn';
    } else {
      status = 'bad';
    }
    result[joint] = { status, error: diff, userAngle, refAngle };
  }
  return result;
}

/**
 * Map from a MediaPipe POSE_CONNECTIONS segment (pair of landmark indices)
 * to the joint(s) that "own" that segment, so we can color the connector.
 *
 * A segment [A, B] is associated with a joint if either A or B is the
 * vertex (middle point) of that joint's angle definition.
 *
 * @param {number} idxA
 * @param {number} idxB
 * @param {Object} guidance – output of computeJointGuidance
 * @returns {'good'|'warn'|'bad'|null}
 */
export function segmentStatus(idxA, idxB, guidance) {
  // Build a quick lookup: vertex landmark index → joint name
  let worst = null;
  const rank = { good: 0, warn: 1, bad: 2 };

  for (const [joint, [, vertex]] of Object.entries(JOINT_DEFINITIONS)) {
    // Check if this connection touches the vertex of a scored joint
    if (idxA === vertex || idxB === vertex) {
      const g = guidance[joint];
      if (g) {
        if (worst === null || rank[g.status] > rank[worst]) {
          worst = g.status;
        }
      }
    }
  }
  return worst;
}
