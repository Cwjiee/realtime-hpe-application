import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera } from 'lucide-react';
import Webcam from 'react-webcam';
import { initializePoseLandmarker, detectPose, drawLandmarks } from '../utils/visionTaskConfig';
import { getPose } from '../utils/poseClassification';
import { Switch } from "@/components/ui/switch"

const CameraView = ({ cam, webcamRef, onToggleCam }) => {
    const canvasRef = useRef(null);
    const [poseLandmarker, setPoseLandmarker] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const animationFrameRef = useRef(null);
    const lastVideoTimeRef = useRef(-1);
    const [pose, setPose] = useState('unrecognized');

    // Initialize pose landmarker when component mounts
    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            try {
                const landmarker = await initializePoseLandmarker();
                setPoseLandmarker(landmarker);
            } catch (error) {
                console.error('Failed to initialize pose landmarker:', error);
            }
            setIsLoading(false);
        };
        init();

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    // Render loop for pose detection
    const renderLoop = useCallback(() => {
        if (!cam || !poseLandmarker || !webcamRef.current?.video || !canvasRef.current) {
            animationFrameRef.current = requestAnimationFrame(renderLoop);
            return;
        }

        const video = webcamRef.current.video;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Ensure canvas matches video dimensions
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        }

        const currentTime = video.currentTime;
        if (currentTime !== lastVideoTimeRef.current && video.readyState >= 2) {
            lastVideoTimeRef.current = currentTime;

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Detect pose
            const results = detectPose(poseLandmarker, video, performance.now());

            // Draw landmarks
            if (results) {
                drawLandmarks(ctx, results, canvas);

                if (results.landmarks && results.landmarks.length > 0) {
                    const detectedPose = getPose(results.landmarks[0]);
                    setPose(detectedPose);
                }
            }
        }

        animationFrameRef.current = requestAnimationFrame(renderLoop);
    }, [cam, poseLandmarker, webcamRef]);

    // Start/stop render loop based on cam state
    useEffect(() => {
        if (cam && poseLandmarker) {
            lastVideoTimeRef.current = -1;
            animationFrameRef.current = requestAnimationFrame(renderLoop);
        } else {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        }

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [cam, poseLandmarker, renderLoop]);

    return (
        <div className="w-full h-[85vh] max-w-8xl bg-black bg-opacity-40 backdrop-blur-md rounded-3xl overflow-hidden shadow-2xl border border-white border-opacity-20 flex flex-col lg:flex-row">
            <div className="flex-1 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative">
                {cam ? (
                    <>
                        <Webcam
                            id="video"
                            className="absolute inset-0 w-full h-full object-cover"
                            ref={webcamRef}
                            mirrored={true}
                            videoConstraints={{
                                facingMode: "user",
                                width: 1280,
                                height: 720
                            }}
                        />
                        <canvas
                            ref={canvasRef}
                            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                            style={{ transform: 'scaleX(-1)' }}
                        />
                    </>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Camera className="w-24 h-24 text-white opacity-20" />
                    </div>
                )}
                <div className="relative z-10 text-center"></div>
            </div>

            <div className="w-full lg:w-80 bg-black bg-opacity-50 p-6 flex flex-col border-t lg:border-t-0 lg:border-l border-white border-opacity-10">
                <div className="flex-1 flex flex-col gap-4 mb-6">
                    <div className="bg-white bg-opacity-10 rounded-xl p-4 backdrop-blur-sm">
                        <div className="text-black text-sm mb-1">Current Pose</div>
                        <div className="text-gray-800 text-xl font-bold">{pose}</div>
                    </div>
                    <div className="bg-white bg-opacity-10 rounded-xl p-4 backdrop-blur-sm">
                        <div className="text-black text-sm mb-1">Status</div>
                        <div className="text-gray-800 text-xl font-bold">
                            {isLoading ? 'Loading model...' : poseLandmarker ? 'Ready' : 'Not initialized'}
                        </div>
                    </div>
                    <div className="bg-white bg-opacity-10 rounded-xl p-4 backdrop-blur-sm">
                        <div className="text-black text-sm mb-1">Visual Guidance</div>
                        <div className="text-black-200 text-xl font-bold">
                          <Switch />
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 mt-auto">
                    <button
                        className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={onToggleCam}
                        disabled={isLoading || !poseLandmarker}
                    >
                        {isLoading ? 'Loading...' : cam ? "Stop Tracking" : "Start Tracking"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CameraView;
