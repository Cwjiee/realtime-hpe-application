import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Webcam from 'react-webcam';
import { initializePoseLandmarker, detectPose, drawLandmarks, drawGuidanceLandmarks } from '../utils/visionTaskConfig';
import { computeJointGuidance } from '../utils/angleUtils';

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
        setCountdown(8);
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

    const getScoreColor = (s) => s >= 80 ? 'var(--ya-ok)' : s >= 50 ? 'var(--ya-warn)' : 'var(--ya-fix)';
    const getScoreBg = (s) => s >= 80 ? 'rgba(110,118,87,0.2)' : s >= 50 ? 'rgba(168,120,46,0.18)' : 'rgba(142,58,24,0.15)';

    const getPhaseLabel = () => {
        switch (phase) {
            case PHASE.LOADING: return 'Loading…';
            case PHASE.SELECT_SET: return 'Select routine';
            case PHASE.READY: return 'Ready to begin';
            case PHASE.COUNTDOWN: return 'Get ready!';
            case PHASE.TRACKING: return 'Hold your pose';
            case PHASE.PROCESSING: return 'Analysing…';
            case PHASE.RESULTS: return 'Results';
            case PHASE.COMPLETE: return 'Set complete!';
            default: return '';
        }
    };

    // ==================== COMPLETE SCREEN ====================
    if (isSetComplete) {
        return (
            <div className="ya-page" style={{ overflow: 'auto' }}>
                <div className="ya-shell" style={{ maxWidth: 900 }}>
                    <header style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
                        <button className="ya-home-link" onClick={onHomeClick}>
                            <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>Home
                        </button>
                    </header>

                    {analyticsLoading && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 12 }}>
                            <div className="ya-spinner" style={{ width: 36, height: 36 }} />
                            <p style={{ color: 'var(--ya-muted)', fontSize: 14 }}>Loading your session analytics…</p>
                        </div>
                    )}

                    {analytics && !analyticsLoading && (<>
                        {/* Banner */}
                        <section style={{ background: 'linear-gradient(165deg, var(--ya-forest) 0%, var(--ya-forest-deep) 100%)', borderRadius: 18, padding: '28px 30px', color: 'var(--ya-paper-2)', marginBottom: 16 }}>
                            <h2 style={{ fontFamily: 'var(--ya-serif)', fontSize: 28, fontWeight: 400, margin: '0 0 6px' }}>Set <em style={{ fontStyle: 'italic', color: 'var(--ya-pale-sage)' }}>complete!</em></h2>
                            <p style={{ fontSize: 14, color: 'rgba(236,226,200,0.72)', margin: 0 }}>You completed {analytics.total_poses} poses in this session.</p>
                        </section>

                        {/* Overall */}
                        <section style={{ background: 'var(--ya-paper-2)', border: '1px solid var(--ya-rule)', borderRadius: 18, padding: '24px 28px', marginBottom: 14 }}>
                            <div style={{ fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--ya-muted)', marginBottom: 8 }}>Overall Average</div>
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginBottom: 14 }}>
                                <span style={{ fontFamily: 'var(--ya-serif)', fontSize: 56, fontWeight: 400, lineHeight: 0.9, color: 'var(--ya-ink)' }}>{analytics.overall_avg_score.toFixed(1)}%</span>
                                <span style={{ fontSize: 13, color: 'var(--ya-muted)', marginBottom: 6 }}>across {analytics.total_poses} poses</span>
                            </div>
                            <div style={{ width: '100%', height: 8, background: 'rgba(196,182,147,0.35)', borderRadius: 99, overflow: 'hidden' }}>
                                <div style={{ height: '100%', borderRadius: 99, background: getScoreColor(analytics.overall_avg_score), width: `${Math.min(analytics.overall_avg_score, 100)}%`, transition: 'width 1s ease-out' }} />
                            </div>
                        </section>

                        {/* Best/Worst */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                            {analytics.best_pose && (
                                <article style={{ background: 'var(--ya-paper-2)', border: '1px solid rgba(110,118,87,0.25)', borderRadius: 16, padding: '18px 20px' }}>
                                    <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--ya-ok)', marginBottom: 8 }}>Best Pose</div>
                                    <p style={{ fontFamily: 'var(--ya-serif)', fontSize: 22, fontWeight: 400, margin: '0 0 4px' }}>{analytics.best_pose.name}</p>
                                    <span style={{ fontFamily: 'var(--ya-serif)', fontSize: 30, color: 'var(--ya-ok)' }}>{analytics.best_pose.avg_score.toFixed(1)}%</span>
                                </article>
                            )}
                            {analytics.worst_pose && (
                                <article style={{ background: 'var(--ya-paper-2)', border: '1px solid rgba(168,120,46,0.25)', borderRadius: 16, padding: '18px 20px' }}>
                                    <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--ya-warn)', marginBottom: 8 }}>Needs Improvement</div>
                                    <p style={{ fontFamily: 'var(--ya-serif)', fontSize: 22, fontWeight: 400, margin: '0 0 4px' }}>{analytics.worst_pose.name}</p>
                                    <span style={{ fontFamily: 'var(--ya-serif)', fontSize: 30, color: 'var(--ya-warn)' }}>{analytics.worst_pose.avg_score.toFixed(1)}%</span>
                                </article>
                            )}
                        </div>

                        {/* Per-Pose */}
                        <section style={{ background: 'var(--ya-paper-2)', border: '1px solid var(--ya-rule)', borderRadius: 18, padding: '24px 28px', marginBottom: 14 }}>
                            <h3 style={{ fontFamily: 'var(--ya-serif)', fontSize: 22, fontWeight: 400, margin: '0 0 16px' }}>Pose <em style={{ fontStyle: 'italic', color: 'var(--ya-brown-2)' }}>breakdown</em></h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {analytics.poses.map((pose, i) => (
                                    <article key={i} style={{ background: 'var(--ya-paper-3)', border: '1px solid var(--ya-rule)', borderRadius: 14, padding: '16px 18px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                            <span style={{ fontFamily: 'var(--ya-serif)', fontSize: 18, color: 'var(--ya-ink)' }}>{pose.label}</span>
                                            <span style={{ fontFamily: 'var(--ya-serif)', fontSize: 22, color: getScoreColor(pose.avg_score) }}>{pose.avg_score.toFixed(1)}%</span>
                                        </div>
                                        <div style={{ width: '100%', height: 6, background: 'rgba(196,182,147,0.35)', borderRadius: 99, overflow: 'hidden', marginBottom: 10 }}>
                                            <div style={{ height: '100%', borderRadius: 99, background: getScoreBg(pose.avg_score), width: `${Math.min(pose.avg_score, 100)}%`, transition: 'width 0.7s ease-out' }} />
                                        </div>
                                        <div style={{ display: 'flex', gap: 18, fontSize: 11, color: 'var(--ya-muted)' }}>
                                            <span>Max: <b style={{ color: 'var(--ya-ink-soft)', fontWeight: 600 }}>{pose.max_score.toFixed(1)}%</b></span>
                                            <span>Min: <b style={{ color: 'var(--ya-ink-soft)', fontWeight: 600 }}>{pose.min_score.toFixed(1)}%</b></span>
                                            <span>Frames: <b style={{ color: 'var(--ya-ink-soft)', fontWeight: 600 }}>{pose.total_frames}</b></span>
                                        </div>
                                        {pose.feedback && pose.feedback.length > 0 && (
                                            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--ya-rule)' }}>
                                                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                                                    {pose.feedback.map((tip, j) => (
                                                        <li key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12 }}>
                                                            <span style={{ width: 5, height: 5, borderRadius: '50%', marginTop: 5, flexShrink: 0, background: tip.startsWith('Great') ? 'var(--ya-ok)' : 'var(--ya-warn)' }} />
                                                            <span style={{ color: 'var(--ya-ink-soft)' }}>{tip}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </article>
                                ))}
                            </div>
                        </section>

                        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 24px' }}>
                            <button className="ya-sp-start" onClick={onHomeClick} style={{ width: 'auto', padding: '14px 40px' }}>Back to Home</button>
                        </div>
                    </>)}

                    {!analytics && !analyticsLoading && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 12, textAlign: 'center' }}>
                            <p style={{ fontFamily: 'var(--ya-serif)', fontSize: 28, color: 'var(--ya-ink)' }}>Set <em style={{ fontStyle: 'italic', color: 'var(--ya-brown-2)' }}>complete!</em></p>
                            <p style={{ color: 'var(--ya-muted)', fontSize: 14 }}>Great job completing all poses.</p>
                            <button className="ya-sp-start" onClick={onHomeClick} style={{ width: 'auto', padding: '14px 40px', marginTop: 8 }}>Back to Home</button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="ya-page" style={{ overflow: 'hidden' }}>
            <div className="ya-shell-flex">
                {/* TOP BAR */}
                <header className="ya-sp-topbar">
                    <button className="ya-home-link" onClick={onHomeClick}>
                        <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>Home
                    </button>
                    <h2 className="ya-page-title">Yoga Pose <em>Set</em></h2>
                    <div className="ya-right-meta">
                        {cameraOn && <span className="ya-live"><span className="ya-dot-pulse" />Live</span>}
                        {!cameraOn && <span>{activeSequence.length} poses</span>}
                    </div>
                </header>

                {/* SEQUENCE BREADCRUMB */}
                <div className="ya-sequence">
                    {activeSequence.map((poseItem, index) => (
                        <React.Fragment key={index}>
                            <span className={`ya-seq-step ${index === currentPoseIndex && phase !== PHASE.SELECT_SET ? 'active' : ''} ${completedPoses.includes(index) ? 'done' : ''}`}>
                                <span className="num">{String(index + 1).padStart(2, '0')}</span>
                                {completedPoses.includes(index) && '✓ '}{poseItem.label}
                            </span>
                            {index < activeSequence.length - 1 && (
                                <span className="ya-seq-sep"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></span>
                            )}
                        </React.Fragment>
                    ))}
                </div>

                {/* MAIN LAYOUT */}
                <main className="ya-sp-layout">
                    {/* LEFT — viewer / routine select */}
                    {phase === PHASE.SELECT_SET ? (
                        <section style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                            <div className="ya-routines-head">
                                <h1>Choose your <em>routine</em></h1>
                                <span className="ya-count">{1 + customSets.length} sets</span>
                            </div>
                            <div className="ya-routine-grid">
                                {/* Default */}
                                <article className={`ya-routine ${activeSequence === poseSequence ? 'selected' : ''}`} onClick={() => handleSelectSet(poseSequence)}>
                                    <span className="ya-check"><svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-11"/></svg></span>
                                    <h3>Default Flow</h3>
                                    <p className="ya-date">Curated · default sequence</p>
                                    <div className="ya-poses">
                                        {poseSequence.map((p, i) => <span key={i} className="ya-pose-tag"><span className="ya-n">{i + 1}</span>{p.label}</span>)}
                                    </div>
                                </article>
                                {/* Custom */}
                                {fetchingSets ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 180, background: 'var(--ya-paper-2)', borderRadius: 16, border: '1px solid var(--ya-rule)' }}>
                                        <div className="ya-spinner" /><span style={{ marginLeft: 12, fontSize: 13, color: 'var(--ya-muted)' }}>Loading sets…</span>
                                    </div>
                                ) : customSets.map((set) => {
                                    const seq = set.poses.map(v => POSE_INFO[v]).filter(Boolean);
                                    return (
                                        <article key={set.set_id} className="ya-routine" onClick={() => handleSelectSet(seq)}>
                                            <span className="ya-check"><svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-11"/></svg></span>
                                            <h3>{set.name}</h3>
                                            <p className="ya-date">Created {new Date(set.created_at).toLocaleDateString()}</p>
                                            <div className="ya-poses">
                                                {seq.map((p, i) => <span key={i} className="ya-pose-tag"><span className="ya-n">{i + 1}</span>{p.label}</span>)}
                                            </div>
                                        </article>
                                    );
                                })}
                                {!fetchingSets && customSets.length === 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 180, background: 'var(--ya-paper-2)', borderRadius: 16, border: '1px solid var(--ya-rule)', padding: 24, textAlign: 'center', color: 'var(--ya-muted)', fontSize: 13 }}>
                                        <p>No custom sets yet.</p>
                                        <p>Use <b style={{ color: 'var(--ya-forest)' }}>Build Set</b> from Home to create one.</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    ) : (
                        <section className="ya-viewer">
                            {/* Reference outline */}
                            {visualOutlineEnabled && (
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', zIndex: 2 }}>
                                    <div style={{ flex: 1, borderRight: '1px solid rgba(236,226,200,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(248,241,220,0.95)' }}>
                                        <img src={currentTargetPose.image} alt={`${currentTargetPose.label} reference`} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                                        <span className="ya-viewer-tag"><span className="ya-dot" />Reference</span>
                                    </div>
                                    <div style={{ flex: 1, position: 'relative' }}>
                                        {cameraOn && <>
                                            <Webcam id="video" ref={webcamRef} mirrored style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} videoConstraints={{ facingMode: "user", width: 1280, height: 720 }} />
                                            <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', transform: 'scaleX(-1)' }} />
                                        </>}
                                    </div>
                                </div>
                            )}
                            {/* Camera (when outline is off) */}
                            {!visualOutlineEnabled && cameraOn && <>
                                <Webcam id="video" ref={webcamRef} mirrored style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} videoConstraints={{ facingMode: "user", width: 1280, height: 720 }} />
                                <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', transform: 'scaleX(-1)' }} />
                            </>}
                            {/* Loading */}
                            {!cameraOn && <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: 'var(--ya-muted)' }}><div className="ya-spinner" /><p style={{ fontSize: 13 }}>Loading pose detection…</p></div>}
                            {/* Ready */}
                            {phase === PHASE.READY && (
                                <div className="ya-ready-overlay">
                                    <button className="ya-sp-start" onClick={handleStart} style={{ padding: '18px 36px', fontSize: 16 }}>
                                        <span>Start Pose Set</span>
                                        <span className="arr"><svg viewBox="0 0 24 24"><path d="M5 12h14"/><path d="M13 5l7 7-7 7"/></svg></span>
                                    </button>
                                </div>
                            )}
                            {/* Countdown */}
                            {phase === PHASE.COUNTDOWN && (
                                <div className="ya-countdown-overlay">
                                    <div className="ya-countdown-circle">
                                        <div className="ya-countdown-label">Get Ready</div>
                                        <div className="ya-countdown-number">{countdown}</div>
                                    </div>
                                </div>
                            )}
                            {/* Tracking */}
                            {phase === PHASE.TRACKING && (
                                <div className="ya-tracking-overlay">
                                    <div className="ya-tracking-border" />
                                    <div className="ya-tracking-pill"><span className="ya-dot-pulse" />{trackingTimeLeft}s remaining</div>
                                    <div className="ya-frames-counter">{collectedFrames.length} frames</div>
                                </div>
                            )}
                            {/* Processing */}
                            {phase === PHASE.PROCESSING && (
                                <div className="ya-processing-overlay">
                                    <div className="ya-processing-card">
                                        <div className="ya-spinner" />
                                        <div style={{ fontFamily: 'var(--ya-serif)', fontSize: 18, color: 'var(--ya-ink)' }}>Analysing your pose…</div>
                                        <div style={{ fontSize: 12, color: 'var(--ya-muted)' }}>{collectedFrames.length} frames captured</div>
                                    </div>
                                </div>
                            )}
                        </section>
                    )}

                    {/* RIGHT — sidebar */}
                    <aside className="ya-sp-sidebar">
                        {/* Target Pose */}
                        <div className="ya-sp-target">
                            <p className="ya-lbl">Target pose</p>
                            <h3 className="ya-name">{currentTargetPose.label}</h3>
                        </div>

                        {/* Status */}
                        <div className="ya-sp-status">
                            <div className="ya-sp-status-head">
                                <span className="ya-lbl">Status</span>
                                {phase === PHASE.TRACKING && <span className="ya-countdown">{trackingTimeLeft}s remaining</span>}
                            </div>
                            <p className="ya-msg">{phase === PHASE.TRACKING ? <>Hold your <em>pose</em></> : getPhaseLabel()}</p>
                            {phase === PHASE.TRACKING && (
                                <>
                                    <div className="ya-frames-bar">
                                        {Array.from({ length: 30 }).map((_, i) => (
                                            <span key={i} className={`ya-seg ${i < collectedFrames.length ? 'done' : ''}`} />
                                        ))}
                                    </div>
                                    <div className="ya-frames-foot">
                                        <span><b>{collectedFrames.length}</b> frames collected</span>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Results */}
                        {phase === PHASE.RESULTS && poseResults && (
                            <div className="ya-sp-status">
                                <div style={{ fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--ya-muted)', marginBottom: 8 }}>Pose Score</div>
                                <div style={{ fontFamily: 'var(--ya-serif)', fontSize: 36, color: getScoreColor(poseResults.avg_score), lineHeight: 1, marginBottom: 12 }}>{poseResults.avg_score?.toFixed(1)}%</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                                    <div style={{ background: 'var(--ya-paper-3)', borderRadius: 10, padding: '8px 12px' }}><div style={{ fontSize: 10, color: 'var(--ya-muted)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>Max</div><div style={{ fontWeight: 600, color: 'var(--ya-ink)', fontSize: 14 }}>{poseResults.max_score?.toFixed(1)}%</div></div>
                                    <div style={{ background: 'var(--ya-paper-3)', borderRadius: 10, padding: '8px 12px' }}><div style={{ fontSize: 10, color: 'var(--ya-muted)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>Min</div><div style={{ fontWeight: 600, color: 'var(--ya-ink)', fontSize: 14 }}>{poseResults.min_score?.toFixed(1)}%</div></div>
                                </div>
                                <div style={{ background: 'var(--ya-paper-3)', borderRadius: 10, padding: '8px 12px', marginBottom: 4 }}><div style={{ fontSize: 10, color: 'var(--ya-muted)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>Frames</div><div style={{ fontWeight: 600, color: 'var(--ya-ink)', fontSize: 14 }}>{poseResults.total_frames}</div></div>
                                {poseResults.feedback && poseResults.feedback.length > 0 && (
                                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--ya-rule)' }}>
                                        <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ya-muted)', marginBottom: 6 }}>Feedback</div>
                                        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                                            {poseResults.feedback.map((tip, idx) => (
                                                <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12 }}>
                                                    <span style={{ width: 5, height: 5, borderRadius: '50%', marginTop: 5, flexShrink: 0, background: tip.startsWith('Great') ? 'var(--ya-ok)' : 'var(--ya-warn)' }} />
                                                    <span style={{ color: 'var(--ya-ink-soft)' }}>{tip}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Error */}
                        {error && <div className="ya-auth-error">{error}</div>}

                        {/* Toggles */}
                        <div className="ya-toggle-card">
                            <div className="ya-toggle-row">
                                <div className="ya-t-text"><span className="ya-t-title">Visual guidance</span><span className="ya-t-hint">On-screen alignment cues</span></div>
                                <label className="ya-switch"><input type="checkbox" checked={visualGuidanceEnabled} onChange={e => setVisualGuidanceEnabled(e.target.checked)} /><span className="ya-slider" /></label>
                            </div>
                            <div className="ya-toggle-row">
                                <div className="ya-t-text"><span className="ya-t-title">Visual outline</span><span className="ya-t-hint">Overlay pose silhouette</span></div>
                                <label className="ya-switch"><input type="checkbox" checked={visualOutlineEnabled} onChange={e => setVisualOutlineEnabled(e.target.checked)} /><span className="ya-slider" /></label>
                            </div>
                        </div>

                        {/* Joint Guidance */}
                        {visualGuidanceEnabled && liveGuidance && (phase === PHASE.TRACKING || phase === PHASE.COUNTDOWN) && (
                            <div className="ya-joints">
                                <div className="ya-joints-head">
                                    <span className="ya-lbl">Joint guidance</span>
                                    <span className="ya-summary"><b>{Object.values(liveGuidance).filter(j => j.status === 'good').length}</b> of {Object.keys(liveGuidance).length} aligned</span>
                                </div>
                                <ul className="ya-joint-list">
                                    {Object.entries(liveGuidance).map(([joint, { status, userAngle, refAngle }]) => {
                                        const label = joint.replace('_', ' ');
                                        let hint = <svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-11"/></svg>;
                                        if (status !== 'good') {
                                            const diff = userAngle - refAngle;
                                            if (joint.includes('elbow')) hint = diff > 0 ? 'Bend more' : 'Straighten';
                                            else if (joint.includes('knee')) hint = diff > 0 ? 'Bend leg' : 'Straighten leg';
                                            else if (joint.includes('shoulder')) hint = diff > 0 ? 'Lower arm' : 'Raise arm';
                                            else if (joint.includes('hip')) hint = diff > 0 ? 'Close hip' : 'Open hip';
                                            else hint = 'Adjust';
                                        }
                                        return (
                                            <li key={joint} className={`ya-joint ${status}`}>
                                                <span className="ya-dot" />
                                                <span className="ya-jname" style={{ textTransform: 'capitalize' }}>{label}</span>
                                                <span className="ya-verdict">{hint}</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}

                        {/* Progress */}
                        <div className="ya-sp-progress">
                            <div className="ya-top">
                                <span className="ya-lbl">Progress</span>
                                <span className="ya-count">{completedPoses.length} / {activeSequence.length} poses</span>
                            </div>
                            <div className="ya-bar">
                                {activeSequence.map((_, index) => (
                                    <span key={index} className={`ya-seg ${completedPoses.includes(index) ? 'done' : index === currentPoseIndex && phase !== PHASE.SELECT_SET ? 'active' : ''}`} />
                                ))}
                            </div>
                        </div>

                        {/* Actions */}
                        {phase === PHASE.RESULTS && (
                            <div className="ya-sp-actions">
                                <button className="ya-btn-retry" onClick={handleRetry}>Retry</button>
                                <button className="ya-btn-next" onClick={handleNextPose}>
                                    {currentPoseIndex < activeSequence.length - 1 ? 'Next Pose' : 'Finish'}
                                    <svg viewBox="0 0 24 24"><path d="M5 12h14"/><path d="M13 5l7 7-7 7"/></svg>
                                </button>
                            </div>
                        )}
                    </aside>
                </main>
            </div>
        </div>
    );
};

export default SetPage;

