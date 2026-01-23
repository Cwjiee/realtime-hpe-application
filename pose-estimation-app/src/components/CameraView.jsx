import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera } from 'lucide-react';
import Webcam from 'react-webcam';
import { initializePoseLandmarker, detectPose, drawLandmarks } from '../utils/visionTaskConfig';
import { classifyPoseBySimilarity, calculateMatchAgainstTarget } from '../utils/poseMatching';
import { Switch } from "@/components/ui/switch"

// Import yoga pose outline images
import mountainPose from '../assets/mountain.png';
import plankPose from '../assets/plank.jpg';
import treePose from '../assets/tree.jpg';
import trianglePose from '../assets/triangle.jpg';
import warrior1Pose from '../assets/warrior1.png';
import warrior2Pose from '../assets/warrior2.png';

// Pose options for dropdown
const poseOptions = [
    { value: 'mountain', label: 'Mountain Pose', image: mountainPose },
    { value: 'plank', label: 'Plank Pose', image: plankPose },
    { value: 'tree', label: 'Tree Pose', image: treePose },
    { value: 'triangle', label: 'Triangle Pose', image: trianglePose },
    { value: 'warrior1', label: 'Warrior I Pose', image: warrior1Pose },
    { value: 'warrior2', label: 'Warrior II Pose', image: warrior2Pose },
];

const CameraView = ({ cam, webcamRef, onToggleCam }) => {
    const canvasRef = useRef(null);
    const [poseLandmarker, setPoseLandmarker] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const animationFrameRef = useRef(null);
    const lastVideoTimeRef = useRef(-1);
    const [pose, setPose] = useState('unrecognized');
    const [matchScore, setMatchScore] = useState(0);
    const [visualGuidanceEnabled, setVisualGuidanceEnabled] = useState(false);
    const [selectedPose, setSelectedPose] = useState('mountain');

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
                    const userLandmarks = results.landmarks[0];

                    // Classify pose by similarity to reference poses
                    const result = classifyPoseBySimilarity(userLandmarks);
                    setPose(result.label);

                    // Calculate match against selected target pose
                    const targetMatch = calculateMatchAgainstTarget(userLandmarks, selectedPose);
                    setMatchScore(targetMatch);
                }
            }
        }

        animationFrameRef.current = requestAnimationFrame(renderLoop);
    }, [cam, poseLandmarker, webcamRef, selectedPose]);

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
                        {/* Visual Guidance Overlay */}
                        {visualGuidanceEnabled && (
                            <img
                                src={poseOptions.find(p => p.value === selectedPose)?.image}
                                alt={`${selectedPose} pose guide`}
                                className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-60"
                                style={{ transform: 'scaleX(-1)' }}
                            />
                        )}
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
                        <div className="text-black text-sm mb-1">Match Score</div>
                        <div className={`text-2xl font-bold ${matchScore >= 80 ? 'text-green-600' : matchScore >= 50 ? 'text-yellow-600' : 'text-gray-600'}`}>
                            {matchScore}%
                        </div>
                    </div>
                    <div className="bg-white bg-opacity-10 rounded-xl p-4 backdrop-blur-sm">
                        <div className="text-black text-sm mb-1">Status</div>
                        <div className="text-gray-800 text-xl font-bold">
                            {isLoading ? 'Loading model...' : poseLandmarker ? 'Ready' : 'Not initialized'}
                        </div>
                    </div>
                    <div className="bg-white bg-opacity-10 rounded-xl p-4 backdrop-blur-sm">
                        <div className="text-black text-sm mb-2">Target Pose</div>
                        <select
                            value={selectedPose}
                            onChange={(e) => setSelectedPose(e.target.value)}
                            className="w-full bg-white bg-opacity-20 text-gray-900 font-semibold rounded-lg px-3 py-2 mb-3 border border-white border-opacity-30 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                        >
                            {poseOptions.map((option) => (
                                <option key={option.value} value={option.value} className="bg-gray-800 text-white">
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <div className="text-black text-sm mb-1">Visual Guidance</div>
                        <div className="flex items-center gap-3">
                            <Switch
                                checked={visualGuidanceEnabled}
                                onCheckedChange={setVisualGuidanceEnabled}
                            />
                            <span className="text-gray-800 text-sm">
                                {visualGuidanceEnabled ? 'On' : 'Off'}
                            </span>
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
