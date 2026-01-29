import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, ChevronRight, Home, CheckCircle2 } from 'lucide-react';
import Webcam from 'react-webcam';
import { initializePoseLandmarker, detectPose, drawLandmarks } from '../utils/visionTaskConfig';
import { calculateMatchAgainstTarget } from '../utils/poseMatching';
import { Switch } from "@/components/ui/switch";

// Import yoga pose outline images
import mountainPose from '../assets/mountain.png';
import plankPose from '../assets/plank.jpg';
import treePose from '../assets/tree.jpg';
import trianglePose from '../assets/triangle.jpg';
import warrior1Pose from '../assets/warrior1.png';
import warrior2Pose from '../assets/warrior2.png';

// Pose set sequence
const poseSequence = [
    { value: 'warrior1', label: 'Warrior I', image: warrior1Pose },
    { value: 'warrior2', label: 'Warrior II', image: warrior2Pose },
    { value: 'tree', label: 'Tree', image: treePose },
    { value: 'triangle', label: 'Triangle', image: trianglePose },
];

const SetPage = ({ onHomeClick }) => {
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const [poseLandmarker, setPoseLandmarker] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [cam, setCam] = useState(false);
    const animationFrameRef = useRef(null);
    const lastVideoTimeRef = useRef(-1);

    const [matchScore, setMatchScore] = useState(0);
    const [visualGuidanceEnabled, setVisualGuidanceEnabled] = useState(false);
    const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
    const [completedPoses, setCompletedPoses] = useState([]);

    const currentTargetPose = poseSequence[currentPoseIndex];

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

    // Handle pose completion (when match score is high enough)
    const handlePoseComplete = useCallback(() => {
        if (!completedPoses.includes(currentPoseIndex)) {
            setCompletedPoses(prev => [...prev, currentPoseIndex]);
            // Auto-advance to next pose after a short delay
            if (currentPoseIndex < poseSequence.length - 1) {
                setTimeout(() => {
                    setCurrentPoseIndex(prev => prev + 1);
                }, 1500);
            }
        }
    }, [currentPoseIndex, completedPoses]);

    // Check for pose completion when match score is high
    useEffect(() => {
        if (matchScore >= 85) {
            handlePoseComplete();
        }
    }, [matchScore, handlePoseComplete]);

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

                    // Calculate match against current target pose in sequence
                    const targetMatch = calculateMatchAgainstTarget(userLandmarks, currentTargetPose.value);
                    setMatchScore(targetMatch);
                }
            }
        }

        animationFrameRef.current = requestAnimationFrame(renderLoop);
    }, [cam, poseLandmarker, currentTargetPose]);

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

    const handleToggleCam = () => {
        setCam(!cam);
    };

    const isSetComplete = completedPoses.length === poseSequence.length;

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-purple-100 via-white to-purple-200">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 bg-white/70 backdrop-blur-md border-b border-purple-200">
                <button
                    onClick={onHomeClick}
                    className="flex items-center gap-2 text-gray-700 hover:text-purple-600 transition-colors"
                >
                    <Home className="w-5 h-5" />
                    <span className="font-medium">Home</span>
                </button>
                <h1 className="text-xl font-bold text-gray-900">Yoga Pose Set</h1>
                <div className="w-20" /> {/* Spacer for centering */}
            </header>

            {/* Pose Sequence Bar */}
            <div className="bg-white/50 backdrop-blur-md px-6 py-4 border-b border-purple-200">
                <div className="flex items-center justify-center gap-2 flex-wrap">
                    {poseSequence.map((poseItem, index) => (
                        <React.Fragment key={poseItem.value}>
                            <button
                                onClick={() => setCurrentPoseIndex(index)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${index === currentPoseIndex
                                    ? 'bg-purple-600 text-white shadow-lg scale-105'
                                    : completedPoses.includes(index)
                                        ? 'bg-green-100 text-green-700 border border-green-200'
                                        : 'bg-white/50 text-gray-500 hover:bg-white/80'
                                    }`}
                            >
                                {completedPoses.includes(index) && (
                                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                                )}
                                <span className="font-medium">{poseItem.label}</span>
                            </button>
                            {index < poseSequence.length - 1 && (
                                <ChevronRight className="w-5 h-5 text-gray-500" />
                            )}
                        </React.Fragment>
                    ))}
                </div>
                {isSetComplete && (
                    <div className="text-center mt-3 text-green-400 font-semibold animate-pulse">
                        🎉 Congratulations! You've completed the set!
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-8">
                <div className="w-full h-[70vh] max-w-8xl bg-white/40 backdrop-blur-md rounded-3xl overflow-hidden shadow-2xl border border-white/50 flex flex-col lg:flex-row">
                    {/* Camera View */}
                    {/* Split View Container */}
                    <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden bg-white/20">
                        {/* Left: Visual Guidance (Reference Pose) - Only shown when enabled */}
                        {visualGuidanceEnabled && (
                            <div className="flex-1 border-b md:border-b-0 md:border-r border-purple-100 flex items-center justify-center relative p-4 bg-white/30">
                                <img
                                    src={currentTargetPose.image}
                                    alt={`${currentTargetPose.label} reference`}
                                    className="max-h-full max-w-full object-contain"
                                />
                                <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-lg text-gray-900 text-sm shadow-sm">
                                    Reference: {currentTargetPose.label}
                                </div>
                            </div>
                        )}

                        {/* Right: Camera Feed */}
                        <div className="flex-1 flex items-center justify-center relative">
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
                                    {/* Removed Visual Guidance Overlay */}
                                </>
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Camera className="w-24 h-24 text-purple-200" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Side Panel */}
                    <div className="w-full lg:w-80 bg-white/60 backdrop-blur-md p-6 flex flex-col border-t lg:border-t-0 lg:border-l border-purple-100">
                        <div className="flex-1 flex flex-col gap-4 mb-6">
                            {/* Target Pose Display */}
                            <div className="bg-purple-600 rounded-xl p-4 shadow-md">
                                <div className="text-purple-100 text-sm mb-1">Target Pose</div>
                                <div className="text-white text-2xl font-bold">{currentTargetPose.label}</div>
                            </div>



                            <div className="bg-white/50 rounded-xl p-4 border border-purple-100">
                                <div className="text-gray-600 text-sm mb-1">Match Score</div>
                                <div className={`text-2xl font-bold ${matchScore >= 80 ? 'text-green-600' : matchScore >= 50 ? 'text-yellow-600' : 'text-gray-600'}`}>
                                    {matchScore}%
                                </div>
                                {matchScore >= 85 && (
                                    <div className="text-green-500 text-sm mt-1 flex items-center gap-1">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Great form!
                                    </div>
                                )}
                            </div>

                            <div className="bg-white/50 rounded-xl p-4 border border-purple-100">
                                <div className="text-gray-600 text-sm mb-1">Status</div>
                                <div className="text-gray-900 text-xl font-bold">
                                    {isLoading ? 'Loading model...' : poseLandmarker ? 'Ready' : 'Not initialized'}
                                </div>
                            </div>

                            <div className="bg-white/50 rounded-xl p-4 border border-purple-100">
                                <div className="text-gray-600 text-sm mb-1">Visual Guidance</div>
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

                            {/* Progress */}
                            <div className="bg-white/50 rounded-xl p-4 border border-purple-100">
                                <div className="text-gray-600 text-sm mb-2">Progress</div>
                                <div className="flex gap-2">
                                    {poseSequence.map((_, index) => (
                                        <div
                                            key={index}
                                            className={`flex-1 h-2 rounded-full ${completedPoses.includes(index)
                                                ? 'bg-green-500'
                                                : index === currentPoseIndex
                                                    ? 'bg-purple-500'
                                                    : 'bg-gray-200'
                                                }`}
                                        />
                                    ))}
                                </div>
                                <div className="text-gray-600 text-sm mt-2">
                                    {completedPoses.length} / {poseSequence.length} poses completed
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 mt-auto">
                            <button
                                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={handleToggleCam}
                                disabled={isLoading || !poseLandmarker}
                            >
                                {isLoading ? 'Loading...' : cam ? "Stop Tracking" : "Start Tracking"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SetPage;
