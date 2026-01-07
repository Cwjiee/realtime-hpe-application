import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';

let poseLandmarker = null;

export const initializePoseLandmarker = async () => {
    if (poseLandmarker) return poseLandmarker;

    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
            // modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            modelAssetPath: "../models/pose_landmarker.task",
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

export { PoseLandmarker };