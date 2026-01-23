import { normalizePose } from './poseUtils';

// Import all reference pose landmarks
import mountainPose from '../lib/mountain.json';
import plankPose from '../lib/plank_2.json';
import treePose from '../lib/tree_2.json';
import trianglePose from '../lib/triangle_2.json';
import warrior1Pose from '../lib/warrior1.json';
import warrior2Pose from '../lib/warrior2.json';

// Reference poses mapping
export const referencePoses = {
  mountain: { landmarks: mountainPose, label: 'Mountain Pose' },
  plank: { landmarks: plankPose, label: 'Plank Pose' },
  tree: { landmarks: treePose, label: 'Tree Pose' },
  triangle: { landmarks: trianglePose, label: 'Triangle Pose' },
  warrior1: { landmarks: warrior1Pose, label: 'Warrior I Pose' },
  warrior2: { landmarks: warrior2Pose, label: 'Warrior II Pose' },
};

// Key body joints to compare (excluding face landmarks for more stable matching)
// MediaPipe indices: 11-12 shoulders, 13-14 elbows, 15-16 wrists, 23-24 hips, 25-26 knees, 27-28 ankles
const KEY_JOINTS = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];

/**
 * Calculates similarity percentage between user pose and reference pose.
 * Returns 0-100 where 100 is a perfect match.
 * 
 * @param {Array} userLandmarks - MediaPipe pose landmarks from user
 * @param {Array} referenceLandmarks - Pre-extracted reference pose landmarks
 * @returns {number} Match percentage (0-100)
 */
export function calculatePoseMatch(userLandmarks, referenceLandmarks) {
  if (!userLandmarks || !referenceLandmarks) {
    return 0;
  }

  // Normalize both poses for size/position invariance
  const normalizedUser = normalizePose(userLandmarks);
  const normalizedRef = normalizePose(referenceLandmarks);

  let totalDistance = 0;

  KEY_JOINTS.forEach(index => {
    const u = normalizedUser[index];
    const r = normalizedRef[index];

    // Calculate Euclidean distance
    const distance = Math.sqrt(
      Math.pow(u.x - r.x, 2) +
      Math.pow(u.y - r.y, 2)
    );
    totalDistance += distance;
  });

  // Calculate average distance
  const avgDistance = totalDistance / KEY_JOINTS.length;

  // Convert distance to percentage (lower distance = higher match)
  // Use exponential decay for smoother mapping
  // avgDistance of 0 -> 100%, avgDistance of 0.5+ -> ~0%
  const matchPercentage = Math.max(0, Math.min(100, (1 - avgDistance / 0.5) * 100));

  return Math.round(matchPercentage);
}

/**
 * Calculates match percentage against a specific target pose.
 * 
 * @param {Array} userLandmarks - MediaPipe pose landmarks from user
 * @param {string} targetPoseKey - Key of the target pose (e.g., 'warrior1', 'mountain')
 * @returns {number} Match percentage (0-100)
 */
export function calculateMatchAgainstTarget(userLandmarks, targetPoseKey) {
  const targetPose = referencePoses[targetPoseKey];
  if (!targetPose) {
    return 0;
  }
  return calculatePoseMatch(userLandmarks, targetPose.landmarks);
}

/**
 * Classifies user pose by finding the best matching reference pose.
 * 
 * @param {Array} userLandmarks - MediaPipe pose landmarks from user
 * @returns {{ pose: string, label: string, confidence: number }} Best matching pose info
 */
export function classifyPoseBySimilarity(userLandmarks) {
  if (!userLandmarks || userLandmarks.length === 0) {
    return { pose: 'unknown', label: 'Unknown', confidence: 0 };
  }

  let bestMatch = { pose: 'unknown', label: 'Unknown', confidence: 0 };

  Object.entries(referencePoses).forEach(([poseKey, poseData]) => {
    const matchPercentage = calculatePoseMatch(userLandmarks, poseData.landmarks);

    if (matchPercentage > bestMatch.confidence) {
      bestMatch = {
        pose: poseKey,
        label: poseData.label,
        confidence: matchPercentage
      };
    }
  });

  // Only return a match if confidence is above threshold
  if (bestMatch.confidence < 50) {
    return { pose: 'unknown', label: 'Unknown', confidence: bestMatch.confidence };
  }

  return bestMatch;
}
