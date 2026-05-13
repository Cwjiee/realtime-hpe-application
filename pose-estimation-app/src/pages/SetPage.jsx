import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Camera, ChevronRight, Home, CheckCircle2, Loader2, Timer, Activity, Trophy, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import Webcam from 'react-webcam';
import { initializePoseLandmarker, detectPose, drawLandmarks, drawGuidanceLandmarks } from '../utils/visionTaskConfig';
import { computeJointGuidance } from '../utils/angleUtils';
import { Switch } from "@/components/ui/switch";

// Import yoga pose outline images
import mountainPose from '../assets/mountain.png';
import plankPose from '../assets/plank.jpg';
import treePose from '../assets/tree.jpg';
import trianglePose from '../assets/triangle.jpg';
import warrior1Pose from '../assets/warrior1.png';
import warrior2Pose from '../assets/warrior2.png';
import { API_BASE } from '../config';

// Pose set sequence
const poseSequence = [
    { value: 'warrior1', label: 'Warrior I', image: warrior1Pose },
    { value: 'warrior2', label: 'Warrior II', image: warrior2Pose },
    { value: 'tree', label: 'Tree', image: treePose },
    { value: 'triangle', label: 'Triangle', image: trianglePose },
];

const POSE_INFO = {
    'warrior1': { value: 'warrior1', label: 'Warrior I', image: warrior1Pose },
    'warrior2': { value: 'warrior2', label: 'Warrior II', image: warrior2Pose },
    'tree': { value: 'tree', label: 'Tree', image: treePose },
    'triangle': { value: 'triangle', label: 'Triangle', image: trianglePose },
};

// Phase constants
const PHASE = {
    LOADING: 'loading',       // Model is loading
    SELECT_SET: 'select_set', // Selecting sequence
    READY: 'ready',           // Ready to start tracking
    COUNTDOWN: 'countdown',   // 5-second countdown before tracking
    TRACKING: 'tracking',     // 5-second pose tracking (collecting frames)
    PROCESSING: 'processing', // Sending frames to backend
    RESULTS: 'results',       // Showing results for current pose
    COMPLETE: 'complete',     // All poses completed
};

const SetPage = ({ onHomeClick }) => {
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const [poseLandmarker, setPoseLandmarker] = useState(null);
    const { token } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const animationFrameRef = useRef(null);
    const lastVideoTimeRef = useRef(-1);

    const [visualGuidanceEnabled, setVisualGuidanceEnabled] = useState(false);
    const [visualOutlineEnabled, setVisualOutlineEnabled] = useState(false);
    const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
    const [completedPoses, setCompletedPoses] = useState([]);

    // Custom Sets State
    const [customSets, setCustomSets] = useState([]);
    const [fetchingSets, setFetchingSets] = useState(false);
    const [activeSequence, setActiveSequence] = useState(poseSequence);

    // Session state
    const [sessionId, setSessionId] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);

    // Phase-based state
    const [phase, setPhase] = useState(PHASE.LOADING);
    const [countdown, setCountdown] = useState(5);
    const [trackingTimeLeft, setTrackingTimeLeft] = useState(5);
    const [collectedFrames, setCollectedFrames] = useState([]);
    const collectedFramesRef = useRef([]);
    const [poseResults, setPoseResults] = useState(null);
    const [error, setError] = useState(null);
    const [liveGuidance, setLiveGuidance] = useState(null);
    const guidanceThrottleRef = useRef(0);

    const currentTargetPose = activeSequence[currentPoseIndex];

    // Fetch custom sets
    useEffect(() => {
        const fetchCustomSets = async () => {
            if (!token) return;
            setFetchingSets(true);
            try {
                const res = await fetch(`${API_BASE}/api/custom-sets`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setCustomSets(data.custom_sets || []);
                }
            } catch (err) {
                console.error("Failed to fetch custom sets:", err);
            }
            setFetchingSets(false);
        };
        fetchCustomSets();
    }, [token]);

    // Initialize pose landmarker
    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            try {
                // Create session in parallel with model loading
                const [landmarker] = await Promise.all([
                    initializePoseLandmarker(),
                ]);
                setPoseLandmarker(landmarker);
            } catch (error) {
                console.error('Failed to initialize:', error);
                setError('Failed to load pose detection model.');
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

    // Create a new session in MongoDB
    const createSession = async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/api/session/start`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setSessionId(data.session_id);
            }
        } catch (err) {
            console.error('Failed to create session:', err);
        }
    };

    // Set phase to select_set once model is loaded
    useEffect(() => {
        if (poseLandmarker && phase === PHASE.LOADING) {
            setPhase(PHASE.SELECT_SET);
        }
    }, [poseLandmarker, phase]);

    const handleSelectSet = (sequenceData) => {
        setActiveSequence(sequenceData);
        setPhase(PHASE.READY);
    };

    // Start tracking flow
    const handleStart = () => {
        setPhase(PHASE.COUNTDOWN);
        setCountdown(5);
        createSession(); // Create session when exercise actually starts
    };

    // Countdown timer
    useEffect(() => {
        if (phase !== PHASE.COUNTDOWN) return;

        if (countdown <= 0) {
            // Countdown finished → start tracking
            setPhase(PHASE.TRACKING);
            setTrackingTimeLeft(5);
            collectedFramesRef.current = [];
            setCollectedFrames([]);
            return;
        }

        const timer = setTimeout(() => {
            setCountdown(prev => prev - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [phase, countdown]);

    // Tracking timer
    useEffect(() => {
        if (phase !== PHASE.TRACKING) return;

        if (trackingTimeLeft <= 0) {
            // Tracking finished → process frames
            setPhase(PHASE.PROCESSING);
            sendFramesToBackend();
            return;
        }

        const timer = setTimeout(() => {
            setTrackingTimeLeft(prev => prev - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [phase, trackingTimeLeft]);

    // Send collected frames to backend for scoring
    const sendFramesToBackend = async () => {
        const frames = collectedFramesRef.current;
        setError(null);

        if (frames.length === 0) {
            setError('No pose data captured. Please try again.');
            setPhase(PHASE.RESULTS);
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/analyze-frames`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    pose_name: currentTargetPose.value,
                    frames: frames,
                    session_id: sessionId,
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || `Server error: ${res.status}`);
            }

            const data = await res.json();
            setPoseResults(data);

            // Mark as completed only if not already in the list
            setCompletedPoses(prev =>
                prev.includes(currentPoseIndex) ? prev : [...prev, currentPoseIndex]
            );
        } catch (err) {
            console.error('Failed to analyze frames:', err);
            setError(err.message || 'Failed to process pose data.');
        }

        setPhase(PHASE.RESULTS);
    };

    // Move to next pose
    const handleNextPose = () => {
        if (currentPoseIndex < activeSequence.length - 1) {
            setCurrentPoseIndex(prev => prev + 1);
            setPoseResults(null);
            setError(null);
            setPhase(PHASE.COUNTDOWN);
            setCountdown(5);
        } else {
            setPhase(PHASE.COMPLETE);
            fetchAnalytics();
        }
    };

    // Fetch session analytics from backend
    const fetchAnalytics = async () => {
        if (!sessionId) return;
        setAnalyticsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/session/${sessionId}/analytics`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setAnalytics(data);
            }
        } catch (err) {
            console.error('Failed to fetch analytics:', err);
        }
        setAnalyticsLoading(false);
    };

    // Retry current pose
    const handleRetry = () => {
        setPoseResults(null);
        setError(null);
        // Remove from completed list when retrying
        setCompletedPoses(prev => prev.filter(idx => idx !== currentPoseIndex));
        setPhase(PHASE.COUNTDOWN);
        setCountdown(5);
    };

    // Render loop for pose detection & frame collection
    const renderLoop = useCallback(() => {
        if (!poseLandmarker || !webcamRef.current?.video || !canvasRef.current) {
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

            // Draw landmarks with optional guidance colouring
            if (results && results.landmarks && results.landmarks.length > 0) {
                const userLandmarks = results.landmarks[0];
                let guidance = null;

                // Compute real-time joint guidance when visual guidance is enabled
                if (visualGuidanceEnabled && currentTargetPose) {
                    guidance = computeJointGuidance(userLandmarks, currentTargetPose.value);

                    // Throttle state updates to ~5 Hz to avoid React re-render overhead
                    const now = performance.now();
                    if (now - guidanceThrottleRef.current > 200) {
                        guidanceThrottleRef.current = now;
                        setLiveGuidance(guidance);
                    }
                }

                // Use guidance-aware drawing when enabled, otherwise standard drawing
                if (visualGuidanceEnabled && guidance) {
                    drawGuidanceLandmarks(ctx, results, canvas, guidance);
                } else {
                    drawLandmarks(ctx, results, canvas);
                }

                // Collect frame landmarks during tracking phase
                if (phase === 'tracking') {
                    const frameData = userLandmarks.map(lm => ({
                        x: lm.x,
                        y: lm.y,
                        z: lm.z,
                        visibility: lm.visibility,
                    }));

                    collectedFramesRef.current.push(frameData);
                    setCollectedFrames([...collectedFramesRef.current]);
                }
            }
        }

        animationFrameRef.current = requestAnimationFrame(renderLoop);
    }, [poseLandmarker, visualGuidanceEnabled, currentTargetPose, phase]);

    // Start/stop render loop based on phase
    useEffect(() => {
        const shouldTrack = phase === PHASE.TRACKING || phase === PHASE.COUNTDOWN;

        if (shouldTrack && poseLandmarker) {
            lastVideoTimeRef.current = -1;
            animationFrameRef.current = requestAnimationFrame(renderLoop);
        } else {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            // Clear landmarks when tracking stops
            if (canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
            setLiveGuidance(null);
        }

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [phase, poseLandmarker, renderLoop]);

    // Camera should be on for all phases except loading and select_set
    const cameraOn = phase !== PHASE.LOADING && phase !== PHASE.SELECT_SET;
    const isSetComplete = phase === PHASE.COMPLETE;

    // Get phase display info
    const getPhaseInfo = () => {
        switch (phase) {
            case PHASE.LOADING:
                return { label: 'Loading Model...', color: 'text-gray-500' };
            case PHASE.SELECT_SET:
                return { label: 'Select Routine', color: 'text-indigo-600' };
            case PHASE.READY:
                return { label: 'Ready', color: 'text-blue-500' };
            case PHASE.COUNTDOWN:
                return { label: 'Get Ready!', color: 'text-yellow-600' };
            case PHASE.TRACKING:
                return { label: 'Hold Your Pose!', color: 'text-green-600' };
            case PHASE.PROCESSING:
                return { label: 'Analyzing...', color: 'text-purple-600' };
            case PHASE.RESULTS:
                return { label: 'Results', color: 'text-blue-600' };
            case PHASE.COMPLETE:
                return { label: 'Set Complete!', color: 'text-green-600' };
            default:
                return { label: '', color: '' };
        }
    };

    const phaseInfo = getPhaseInfo();

    // Helper to get score color
    const getScoreColor = (score) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 50) return 'text-yellow-600';
        return 'text-red-500';
    };

    const getScoreBgColor = (score) => {
        if (score >= 80) return 'bg-green-500';
        if (score >= 50) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const getScoreGradient = (score) => {
        if (score >= 80) return 'from-green-400 to-emerald-600';
        if (score >= 50) return 'from-yellow-400 to-amber-600';
        return 'from-red-400 to-rose-600';
    };

    // If set is complete, render the analytics dashboard
    if (isSetComplete) {
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
                    <h1 className="text-xl font-bold text-gray-900">Session Analytics</h1>
                    <div className="w-20" />
                </header>

                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                    <div className="max-w-4xl mx-auto space-y-6">

                        {/* Loading State */}
                        {analyticsLoading && (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                                <p className="text-gray-600 font-medium">Loading your session analytics...</p>
                            </div>
                        )}

                        {/* Analytics Dashboard */}
                        {analytics && !analyticsLoading && (
                            <>
                                {/* Congrats Banner */}
                                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h2 className="text-2xl font-bold">Set Complete!</h2>
                                    </div>
                                    <p className="text-purple-100">You completed {analytics.total_poses} poses in this session. Here's how you did.</p>
                                </div>

                                {/* Overall Score */}
                                <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 border border-white/50 shadow-lg">
                                    <div className="text-gray-600 text-sm mb-3 flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4" />
                                        Overall Average Score
                                    </div>
                                    <div className="flex items-end gap-4">
                                        <div className={`text-6xl font-bold ${getScoreColor(analytics.overall_avg_score)}`}>
                                            {analytics.overall_avg_score.toFixed(1)}%
                                        </div>
                                        <div className="text-gray-400 text-sm mb-2">
                                            across {analytics.total_poses} poses
                                        </div>
                                    </div>
                                    {/* Overall score bar */}
                                    <div className="mt-4 w-full bg-gray-200 rounded-full h-3">
                                        <div
                                            className={`h-3 rounded-full bg-gradient-to-r ${getScoreGradient(analytics.overall_avg_score)} transition-all duration-1000 ease-out`}
                                            style={{ width: `${Math.min(analytics.overall_avg_score, 100)}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Best & Worst Pose */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {analytics.best_pose && (
                                        <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-green-200 shadow-lg">
                                            <div className="flex items-center gap-2 text-green-600 mb-3">
                                                <TrendingUp className="w-5 h-5" />
                                                <span className="text-sm font-medium">Best Pose</span>
                                            </div>
                                            <div className="text-xl font-bold text-gray-900">{analytics.best_pose.name}</div>
                                            <div className="text-3xl font-bold text-green-600 mt-1">
                                                {analytics.best_pose.avg_score.toFixed(1)}%
                                            </div>
                                        </div>
                                    )}
                                    {analytics.worst_pose && (
                                        <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-orange-200 shadow-lg">
                                            <div className="flex items-center gap-2 text-orange-600 mb-3">
                                                <TrendingDown className="w-5 h-5" />
                                                <span className="text-sm font-medium">Needs Improvement</span>
                                            </div>
                                            <div className="text-xl font-bold text-gray-900">{analytics.worst_pose.name}</div>
                                            <div className="text-3xl font-bold text-orange-600 mt-1">
                                                {analytics.worst_pose.avg_score.toFixed(1)}%
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Per-Pose Breakdown */}
                                <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 border border-white/50 shadow-lg">
                                    <h3 className="text-gray-700 font-semibold mb-4">Pose Breakdown</h3>
                                    <div className="space-y-4">
                                        {analytics.poses.map((pose, index) => (
                                            <div key={index} className="bg-white/50 rounded-xl p-4 border border-purple-50">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-semibold text-gray-800">{pose.label}</span>
                                                    <span className={`text-lg font-bold ${getScoreColor(pose.avg_score)}`}>
                                                        {pose.avg_score.toFixed(1)}%
                                                    </span>
                                                </div>
                                                {/* Score bar */}
                                                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                                                    <div
                                                        className={`h-2.5 rounded-full ${getScoreBgColor(pose.avg_score)} transition-all duration-700 ease-out`}
                                                        style={{ width: `${Math.min(pose.avg_score, 100)}%` }}
                                                    />
                                                </div>
                                                <div className="flex gap-4 text-xs text-gray-500">
                                                    <span>Max: <span className="font-medium text-gray-700">{pose.max_score.toFixed(1)}%</span></span>
                                                    <span>Min: <span className="font-medium text-gray-700">{pose.min_score.toFixed(1)}%</span></span>
                                                    <span>Frames: <span className="font-medium text-gray-700">{pose.total_frames}</span></span>
                                                </div>
                                                {/* Feedback Tips */}
                                                {pose.feedback && pose.feedback.length > 0 && (
                                                    <div className="mt-2 pt-2 border-t border-purple-50">
                                                        <ul className="space-y-1">
                                                            {pose.feedback.map((tip, tipIdx) => (
                                                                <li key={tipIdx} className="flex items-start gap-2 text-xs">
                                                                    <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${
                                                                        tip.startsWith('Great') ? 'bg-green-400' : 'bg-amber-400'
                                                                    }`} />
                                                                    <span className="text-gray-600">{tip}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Back to Home */}
                                <div className="flex justify-center pt-2 pb-4">
                                    <button
                                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-3 px-10 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                                        onClick={onHomeClick}
                                    >
                                        Back to Home
                                    </button>
                                </div>
                            </>
                        )}

                        {/* Fallback if no analytics */}
                        {!analytics && !analyticsLoading && (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <CheckCircle2 className="w-16 h-16 text-green-500" />
                                <h2 className="text-2xl font-bold text-gray-800">Set Complete!</h2>
                                <p className="text-gray-500">Great job completing all poses.</p>
                                <button
                                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-200 shadow-lg"
                                    onClick={onHomeClick}
                                >
                                    Back to Home
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

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
                    {activeSequence && activeSequence.map((poseItem, index) => (
                        <React.Fragment key={index}>
                            <div
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${index === currentPoseIndex && phase !== PHASE.SELECT_SET
                                    ? 'bg-purple-600 text-white shadow-lg scale-105'
                                    : completedPoses.includes(index)
                                        ? 'bg-green-100 text-green-700 border border-green-200'
                                        : 'bg-white/50 text-gray-500'
                                    }`}
                            >
                                {completedPoses.includes(index) && (
                                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                                )}
                                <span className="font-medium">{poseItem.label}</span>
                            </div>
                            {index < activeSequence.length - 1 && (
                                <ChevronRight className="w-5 h-5 text-gray-500" />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-8">
                <div className="w-full h-[70vh] max-w-8xl bg-white/40 backdrop-blur-md rounded-3xl overflow-hidden shadow-2xl border border-white/50 flex flex-col lg:flex-row">
                    {/* Camera View */}
                    {/* Split View Container */}
                    <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden bg-white/20">
                        {/* Left: Visual Outline (Reference Pose) - Only shown when enabled */}
                        {visualOutlineEnabled && (
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

                        {/* Right: Camera Feed or Set Selection */}
                        <div className="flex-1 flex items-center justify-center relative bg-black/5">
                            {phase === PHASE.SELECT_SET ? (
                                <div className="absolute inset-0 bg-white/90 backdrop-blur-md overflow-y-auto p-6 md:p-10 flex flex-col items-center">
                                    <h2 className="text-3xl font-bold text-gray-800 mb-8 mt-4">Choose Your Routine</h2>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
                                        {/* Default Set Card */}
                                        <div
                                            onClick={() => handleSelectSet(poseSequence)}
                                            className="bg-gradient-to-br from-indigo-50 to-purple-100 rounded-3xl p-6 border-4 border-transparent hover:border-purple-400 cursor-pointer transition-all shadow-md hover:shadow-xl group flex flex-col"
                                        >
                                            <div className="flex items-center gap-4 mb-4">
                                                <h3 className="text-2xl font-bold text-gray-900 group-hover:text-purple-700 transition-colors">Default Flow</h3>
                                            </div>
                                            <div className="flex flex-wrap gap-2 mt-auto">
                                                {poseSequence.map((p, i) => (
                                                    <span key={i} className="text-xs font-semibold px-2.5 py-1 bg-white/70 text-purple-800 rounded-lg shadow-sm">
                                                        {i + 1}. {p.label}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Custom Sets */}
                                        {fetchingSets ? (
                                            <div className="flex flex-col items-center justify-center min-h-[200px] bg-white/50 rounded-3xl col-span-1 border border-gray-100">
                                                <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-3" />
                                                <p className="text-sm font-medium text-gray-500">Loading custom sets...</p>
                                            </div>
                                        ) : customSets.map((set) => {
                                            const seq = set.poses.map(poseValue => POSE_INFO[poseValue]).filter(Boolean);
                                            return (
                                                <div
                                                    key={set.set_id}
                                                    onClick={() => handleSelectSet(seq)}
                                                    className="bg-white rounded-3xl p-6 border-4 border-transparent hover:border-teal-400 cursor-pointer transition-all shadow-md hover:shadow-xl group flex flex-col"
                                                >
                                                    <div className="flex items-center gap-4 mb-4">
                                                        <h3 className="text-2xl font-bold text-gray-900 group-hover:text-teal-700 transition-colors">{set.name}</h3>
                                                    </div>
                                                    <p className="text-gray-500 text-xs mb-6 flex-1">Created on {new Date(set.created_at).toLocaleDateString()}</p>
                                                    <div className="flex flex-wrap gap-2 mt-auto">
                                                        {seq.map((p, i) => (
                                                            <span key={i} className="text-xs font-semibold px-2.5 py-1 bg-teal-50 text-teal-800 rounded-lg shadow-sm border border-teal-100">
                                                                {i + 1}. {p.label}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {!fetchingSets && customSets.length === 0 && (
                                        <div className="mt-8 text-center text-gray-500">
                                            <p className="mb-2">You haven't created any custom sets yet.</p>
                                            <p>Use the <span className="font-semibold text-purple-600">Build Set</span> tool from the Home page to create personalized routines.</p>
                                        </div>
                                    )}
                                </div>
                            ) : cameraOn ? (
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

                                    {/* Ready Overlay */}
                                    {phase === PHASE.READY && (
                                        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/40 backdrop-blur-sm">
                                            <button
                                                onClick={handleStart}
                                                className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-10 rounded-full text-xl shadow-2xl transform transition hover:scale-105 flex items-center gap-3"
                                            >
                                                <Camera className="w-7 h-7" />
                                                Start Pose Set
                                            </button>
                                        </div>
                                    )}

                                    {/* Countdown Overlay */}
                                    {phase === PHASE.COUNTDOWN && (
                                        <div className="absolute inset-0 flex items-center justify-center z-10">
                                            <div className="bg-black/50 backdrop-blur-sm rounded-full w-40 h-40 flex flex-col items-center justify-center animate-pulse">
                                                <div className="text-white/70 text-sm font-medium mb-1">GET READY</div>
                                                <div className="text-white text-7xl font-bold tabular-nums drop-shadow-lg"
                                                    style={{
                                                        animation: 'countPop 1s ease-in-out infinite',
                                                    }}
                                                >
                                                    {countdown}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Tracking Indicator Overlay */}
                                    {phase === PHASE.TRACKING && (
                                        <div className="absolute inset-0 z-10 pointer-events-none">
                                            {/* Pulsing border */}
                                            <div className="absolute inset-0 border-4 border-green-400 rounded-none"
                                                style={{ animation: 'borderPulse 1s ease-in-out infinite' }}
                                            />
                                            {/* Timer pill at top */}
                                            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-500/90 backdrop-blur-sm rounded-full px-6 py-2 flex items-center gap-2 shadow-lg">
                                                <Activity className="w-5 h-5 text-white animate-pulse" />
                                                <span className="text-white font-bold text-lg tabular-nums">{trackingTimeLeft}s</span>
                                                <span className="text-white/80 text-sm">remaining</span>
                                            </div>
                                            {/* Frame counter */}
                                            <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 text-green-400 text-sm font-mono">
                                                {collectedFrames.length} frames
                                            </div>
                                        </div>
                                    )}

                                    {/* Processing Overlay */}
                                    {phase === PHASE.PROCESSING && (
                                        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/30 backdrop-blur-sm">
                                            <div className="bg-white/90 backdrop-blur-md rounded-2xl px-8 py-6 flex flex-col items-center gap-3 shadow-xl">
                                                <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
                                                <div className="text-gray-800 font-semibold text-lg">Analyzing your pose...</div>
                                                <div className="text-gray-500 text-sm">{collectedFrames.length} frames captured</div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                                    <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
                                    <p className="text-purple-400 font-medium">Loading pose detection model...</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Side Panel */}
                    <div className="w-full lg:w-80 bg-white/60 backdrop-blur-md flex flex-col border-t lg:border-t-0 lg:border-l border-purple-100">
                        <div className="flex-1 flex flex-col gap-4 p-6 overflow-y-auto">
                            {/* Target Pose Display */}
                            <div className="bg-purple-600 rounded-xl p-4 shadow-md">
                                <div className="text-purple-100 text-sm mb-1">Target Pose</div>
                                <div className="text-white text-2xl font-bold">{currentTargetPose.label}</div>
                            </div>

                            {/* Phase Status */}
                            <div className="bg-white/50 rounded-xl p-4 border border-purple-100">
                                <div className="text-gray-600 text-sm mb-1">Status</div>
                                <div className={`text-xl font-bold ${phaseInfo.color}`}>
                                    {phaseInfo.label}
                                </div>
                                {phase === PHASE.TRACKING && (
                                    <div className="mt-2">
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-green-500 h-2 rounded-full transition-all duration-1000 ease-linear"
                                                style={{ width: `${((5 - trackingTimeLeft) / 5) * 100}%` }}
                                            />
                                        </div>
                                        <div className="text-gray-500 text-xs mt-1">{collectedFrames.length} frames collected</div>
                                    </div>
                                )}
                            </div>

                            {/* Results Display */}
                            {phase === PHASE.RESULTS && poseResults && (
                                <div className="bg-white/50 rounded-xl p-4 border border-purple-100">
                                    <div className="text-gray-600 text-sm mb-2">Pose Score</div>
                                    <div className={`text-3xl font-bold ${poseResults.avg_score >= 80 ? 'text-green-600' : poseResults.avg_score >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                                        {poseResults.avg_score?.toFixed(1)}%
                                    </div>
                                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                                        <div className="bg-white/60 rounded-lg p-2">
                                            <div className="text-gray-500 text-xs">Max</div>
                                            <div className="font-semibold text-gray-800">{poseResults.max_score?.toFixed(1)}%</div>
                                        </div>
                                        <div className="bg-white/60 rounded-lg p-2">
                                            <div className="text-gray-500 text-xs">Min</div>
                                            <div className="font-semibold text-gray-800">{poseResults.min_score?.toFixed(1)}%</div>
                                        </div>
                                        <div className="bg-white/60 rounded-lg p-2 col-span-2">
                                            <div className="text-gray-500 text-xs">Frames Analyzed</div>
                                            <div className="font-semibold text-gray-800">{poseResults.total_frames}</div>
                                        </div>
                                    </div>

                                    {/* Feedback Tips */}
                                    {poseResults.feedback && poseResults.feedback.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-purple-100">
                                            <div className="text-gray-600 text-xs font-semibold mb-2">Feedback</div>
                                            <ul className="space-y-1.5">
                                                {poseResults.feedback.map((tip, idx) => (
                                                    <li key={idx} className="flex items-start gap-2 text-sm">
                                                        <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                                                            tip.startsWith('Great') ? 'bg-green-400' : 'bg-amber-400'
                                                        }`} />
                                                        <span className="text-gray-700">{tip}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Error Display */}
                            {error && (
                                <div className="bg-red-50 rounded-xl p-4 border border-red-200 text-red-700 text-sm">
                                    {error}
                                </div>
                            )}

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

                            <div className="bg-white/50 rounded-xl p-4 border border-purple-100">
                                <div className="text-gray-600 text-sm mb-1">Visual Outline</div>
                                <div className="flex items-center gap-3">
                                    <Switch
                                        checked={visualOutlineEnabled}
                                        onCheckedChange={setVisualOutlineEnabled}
                                    />
                                    <span className="text-gray-800 text-sm">
                                        {visualOutlineEnabled ? 'On' : 'Off'}
                                    </span>
                                </div>
                            </div>

                            {/* Live Joint Guidance Panel */}
                            {visualGuidanceEnabled && liveGuidance && (phase === PHASE.TRACKING || phase === PHASE.COUNTDOWN) && (
                                <div className="bg-white/50 rounded-xl p-4 border border-purple-100">
                                    <div className="text-gray-600 text-xs font-semibold mb-2">Joint Guidance</div>
                                    <div className="space-y-1.5">
                                        {Object.entries(liveGuidance).map(([joint, { status, error }]) => {
                                            const label = joint.replace('_', ' ');
                                            const statusColor = status === 'good'
                                                ? 'bg-green-500'
                                                : status === 'warn'
                                                    ? 'bg-amber-500'
                                                    : 'bg-red-500';
                                            const textColor = status === 'good'
                                                ? 'text-green-700'
                                                : status === 'warn'
                                                    ? 'text-amber-700'
                                                    : 'text-red-600';
                                            return (
                                                <div key={joint} className="flex items-center gap-2 text-xs">
                                                    <span className={`w-2 h-2 rounded-full shrink-0 ${statusColor}`} />
                                                    <span className="capitalize text-gray-700 flex-1">{label}</span>
                                                    <span className={`font-mono font-semibold ${textColor}`}>
                                                        {status === 'good' ? '✓' : `${Math.round(error)}°`}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Progress */}
                            <div className="bg-white/50 rounded-xl p-4 border border-purple-100">
                                <div className="text-gray-600 text-sm mb-2">Progress</div>
                                <div className="flex gap-2">
                                    {poseSequence.map((_, index) => (
                                        <div
                                            key={index}
                                            className={`flex-1 h-2 rounded-full ${completedPoses.includes(index)
                                                ? 'bg-green-500'
                                                : index === currentPoseIndex && phase !== PHASE.SELECT_SET
                                                    ? 'bg-purple-500'
                                                    : 'bg-gray-200'
                                                }`}
                                        />
                                    ))}
                                </div>
                                <div className="text-gray-600 text-sm mt-2">
                                    {completedPoses.length} / {activeSequence.length} poses completed
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 mt-auto p-6 border-t border-purple-100">
                            {phase === PHASE.RESULTS && (
                                <>
                                    <button
                                        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 rounded-xl transition-all duration-200"
                                        onClick={handleRetry}
                                    >
                                        Retry
                                    </button>
                                    <button
                                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                                        onClick={handleNextPose}
                                    >
                                        {currentPoseIndex < activeSequence.length - 1 ? 'Next Pose' : 'Finish'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* CSS Animations */}
            <style>{`
                @keyframes countPop {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.15); }
                }
                @keyframes borderPulse {
                    0%, 100% { border-color: rgba(74, 222, 128, 0.8); }
                    50% { border-color: rgba(74, 222, 128, 0.3); }
                }
            `}</style>
        </div>
    );
};

export default SetPage;
