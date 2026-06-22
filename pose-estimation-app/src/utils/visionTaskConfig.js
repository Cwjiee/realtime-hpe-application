import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';

let poseLandmarker = null;

export const initializePoseLandmarker = async () => {
    if (poseLandmarker) return poseLandmarker;

    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            // modelAssetPath: "../models/pose_landmarker.task",
            delegate: "CPU"
        },
        runningMode: "VIDEO",
        numPoses: 1
    });

    return poseLandmarker;
};

export const detectPose = (poseLandmarker, video, timestamp) => {
    if (!poseLandmarker || !video) return null;
    return poseLandmarker.detectForVideo(video, timestamp);
};

export const drawLandmarks = (canvasCtx, results, canvas) => {
    if (!results || !results.landmarks || results.landmarks.length === 0) return;

    const drawingUtils = new DrawingUtils(canvasCtx);

    for (const landmarks of results.landmarks) {
        drawingUtils.drawLandmarks(landmarks, {
            radius: 3,
            color: '#00FF00',
            fillColor: '#00FF00'
        });
        drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
            color: '#00FFFF',
            lineWidth: 2
        });
    }
};

// ─── Guidance-aware drawing ──────────────────────────────────────

import { JOINT_DEFINITIONS, segmentStatus } from './angleUtils';

const STATUS_COLORS = {
    good: { line: '#22c55e', glow: 'rgba(34,197,94,0.35)', dot: '#22c55e' },   // green-500
    warn: { line: '#f59e0b', glow: 'rgba(245,158,11,0.35)', dot: '#f59e0b' },  // amber-500
    bad:  { line: '#ef4444', glow: 'rgba(239,68,68,0.40)',  dot: '#ef4444' },   // red-500
};
const DEFAULT_COLOR = { line: '#06b6d4', glow: 'rgba(6,182,212,0.15)', dot: '#06b6d4' }; // cyan-500

/**
 * Draw the skeleton with per-joint colour coding.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('@mediapipe/tasks-vision').PoseLandmarkerResult} results
 * @param {HTMLCanvasElement} canvas
 * @param {Object|null} guidance – output of computeJointGuidance (null → default colours)
 */
export const drawGuidanceLandmarks = (ctx, results, canvas, guidance) => {
    if (!results?.landmarks?.length) return;

    const landmarks = results.landmarks[0];
    const w = canvas.width;
    const h = canvas.height;

    // Helper: landmark → pixel coords
    const toPixel = (idx) => ({ x: landmarks[idx].x * w, y: landmarks[idx].y * h });

    // 1. Draw connectors with per-segment colouring
    for (const { start, end } of PoseLandmarker.POSE_CONNECTIONS) {
        const status = guidance ? segmentStatus(start, end, guidance) : null;
        const palette = status ? STATUS_COLORS[status] : DEFAULT_COLOR;

        const p1 = toPixel(start);
        const p2 = toPixel(end);

        // Glow
        ctx.save();
        ctx.strokeStyle = palette.glow;
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.restore();

        // Core line
        ctx.save();
        ctx.strokeStyle = palette.line;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.restore();
    }

    // 2. Draw landmark dots – scored joints get colour-coded, rest stay cyan
    const scoredVertices = new Map(); // landmark idx → status
    if (guidance) {
        for (const [joint, [, vertex]] of Object.entries(JOINT_DEFINITIONS)) {
            const g = guidance[joint];
            if (!g) continue;
            const existing = scoredVertices.get(vertex);
            const rank = { good: 0, warn: 1, bad: 2 };
            if (!existing || rank[g.status] > rank[existing]) {
                scoredVertices.set(vertex, g.status);
            }
        }
    }

    for (let i = 0; i < landmarks.length; i++) {
        const p = toPixel(i);
        const status = scoredVertices.get(i);
        const palette = status ? STATUS_COLORS[status] : DEFAULT_COLOR;
        const radius = status ? 6 : 3;

        // Outer glow for scored joints
        if (status) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius + 4, 0, Math.PI * 2);
            ctx.fillStyle = palette.glow;
            ctx.fill();
            ctx.restore();
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = palette.dot;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
    }

    // 3. Draw angle-error badges near each scored joint
    if (guidance) {
        ctx.save();
        ctx.font = 'bold 12px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (const [joint, [, vertex]] of Object.entries(JOINT_DEFINITIONS)) {
            const g = guidance[joint];
            if (!g) continue;
            // Only show badges for joints that need attention
            if (g.status === 'good') continue;

            const p = toPixel(vertex);
            const label = `${Math.round(g.error)}°`;
            const palette = STATUS_COLORS[g.status];

            // Badge background
            const textMetrics = ctx.measureText(label);
            const bw = textMetrics.width + 10;
            const bh = 18;
            const bx = p.x + 14;
            const by = p.y - 14;

            ctx.fillStyle = palette.line;
            ctx.beginPath();
            ctx.roundRect(bx - bw / 2, by - bh / 2, bw, bh, 4);
            ctx.fill();

            // Badge text
            ctx.fillStyle = '#fff';
            ctx.fillText(label, bx, by);
        }
        ctx.restore();
    }
};

export { PoseLandmarker };
