/**
 * Draws a skeleton on the canvas.
 * @param ctx - The Canvas Rendering Context
 * @param landmarks - The array of 33 landmarks from MediaPipe
 * @param color - The color string (e.g., 'red', 'rgba(0,255,0,0.5)')
 * @param thickness - Line width (pixels)
 */
// A list of pairs. [start_point_index, end_point_index]
export const POSE_CONNECTIONS = [
    // Torso
    [11, 12], // Shoulders
    [11, 23], [12, 24], // Shoulder to Hip
    [23, 24], // Hips

    // Arms
    [11, 13], [13, 15], // Left Arm (Shoulder -> Elbow -> Wrist)
    [12, 14], [14, 16], // Right Arm

    // Legs
    [23, 25], [25, 27], // Left Leg (Hip -> Knee -> Ankle)
    [24, 26], [26, 28], // Right Leg

    // Extremities (Optional - hands/feet)
    [15, 17], [15, 19], [15, 21], // Left Hand
    [16, 18], [16, 20], [16, 22], // Right Hand
    [27, 29], [27, 31], // Left Foot
    [28, 30], [28, 32]  // Right Foot
];

export function drawSkeleton(
    ctx,
    landmarks,
    color = "white",
    thickness = 2
) {
    // 1. Draw Lines (Bones)
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;

    POSE_CONNECTIONS.forEach(([i, j]) => {
        const p1 = landmarks[i];
        const p2 = landmarks[j];

        // Safety check: Ensure points exist and are visible (confidence > 0.5)
        // MediaPipe usually provides a 'visibility' or 'score' field.
        if (p1 && p2 && (p1.visibility > 0.5) && (p2.visibility > 0.5)) {
            ctx.beginPath();
            // MediaPipe coordinates are normalized (0.0 to 1.0).
            // We must multiply by canvas width/height to get pixels.
            ctx.moveTo(p1.x * ctx.canvas.width, p1.y * ctx.canvas.height);
            ctx.lineTo(p2.x * ctx.canvas.width, p2.y * ctx.canvas.height);
            ctx.stroke();
        }
    });

    // 2. Draw Circles (Joints) - Optional, but looks nice
    ctx.fillStyle = color;
    landmarks.forEach((point) => {
        if (point.visibility > 0.5) {
            ctx.beginPath();
            ctx.arc(
                point.x * ctx.canvas.width,
                point.y * ctx.canvas.height,
                thickness * 2, // Make joints slightly larger than bones
                0,
                2 * Math.PI
            );
            ctx.fill();
        }
    });
}