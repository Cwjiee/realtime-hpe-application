import React, { useState, useEffect } from 'react';
import { Header } from '../components';
import { useAuth } from '../context/AuthContext';
import { Loader2, Plus, Trash2, CheckCircle2, ChevronRight, AlertCircle, Dumbbell, Activity, Save } from 'lucide-react';

const API_BASE = 'http://localhost:8000';

const AVAILABLE_POSES = [
    { value: 'warrior1', label: 'Warrior I' },
    { value: 'warrior2', label: 'Warrior II' },
    { value: 'tree', label: 'Tree' },
    { value: 'triangle', label: 'Triangle' },
];

const BuildSetPage = ({ onHomeClick }) => {
    const { token } = useAuth();

    // Custom sets list state
    const [customSets, setCustomSets] = useState([]);
    const [loadingSets, setLoadingSets] = useState(true);
    const [fetchError, setFetchError] = useState(null);

    // Form builder state
    const [setName, setSetName] = useState('');
    const [selectedPoses, setSelectedPoses] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    useEffect(() => {
        fetchCustomSets();
    }, []);

    const fetchCustomSets = async () => {
        setLoadingSets(true);
        setFetchError(null);
        try {
            const res = await fetch(`${API_BASE}/api/custom-sets`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!res.ok) throw new Error('Failed to fetch custom sets');
            const data = await res.json();
            setCustomSets(data.custom_sets || []);
        } catch (err) {
            console.error('Error fetching custom sets:', err);
            setFetchError('Could not load custom sets.');
        } finally {
            setLoadingSets(false);
        }
    };

    const handleAddPose = (poseValue) => {
        setSelectedPoses([...selectedPoses, poseValue]);
        setSubmitSuccess(false);
    };

    const handleRemovePose = (indexToRemove) => {
        setSelectedPoses(selectedPoses.filter((_, idx) => idx !== indexToRemove));
    };

    const handleCreateSet = async (e) => {
        e.preventDefault();
        setSubmitError(null);
        setSubmitSuccess(false);

        if (!setName.trim()) {
            setSubmitError('Please provide a name for your set.');
            return;
        }

        if (selectedPoses.length === 0) {
            setSubmitError('Please add at least one pose to your set.');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch(`${API_BASE}/api/custom-sets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: setName.trim(),
                    poses: selectedPoses
                })
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail || 'Failed to create set');
            }

            setSubmitSuccess(true);
            setSetName('');
            setSelectedPoses([]);
            fetchCustomSets(); // Refresh the list
        } catch (err) {
            console.error('Failed to create custom set:', err);
            setSubmitError(err.message || 'An error occurred while creating the set.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteSet = async (setId) => {
        if (!window.confirm('Are you sure you want to delete this set?')) return;

        try {
            const res = await fetch(`${API_BASE}/api/custom-sets/${setId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!res.ok) throw new Error('Failed to delete set');
            fetchCustomSets(); // Refresh the list after deletion
        } catch (err) {
            console.error('Failed to delete custom set:', err);
            alert('Failed to delete the set. Please try again.');
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-purple-100 via-white to-purple-200">
            <Header onHomeClick={onHomeClick} />

            <div className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Build Custom Pose Set</h1>
                    <p className="text-gray-600">Create and manage your own personalized yoga sequences</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Left Panel: Builder */}
                    <div className="bg-white/70 backdrop-blur-md rounded-3xl p-8 border border-white/50 shadow-xl self-start">
                        <div className="flex items-center gap-3 mb-6 border-b border-purple-100 pb-4">
                            <h2 className="text-xl font-bold text-gray-800">Create New Set</h2>
                        </div>

                        {submitError && (
                            <div className="mb-4 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <p>{submitError}</p>
                            </div>
                        )}

                        {submitSuccess && (
                            <div className="mb-4 flex items-start gap-3 bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 text-sm">
                                <CheckCircle2 className="w-5 h-5 shrink-0" />
                                <p>Set successfully created!</p>
                            </div>
                        )}

                        <form onSubmit={handleCreateSet} className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700">Set Name</label>
                                <input
                                    type="text"
                                    value={setName}
                                    onChange={(e) => setSetName(e.target.value)}
                                    placeholder="e.g., Morning Wakeup Flow"
                                    className="w-full px-4 py-3 bg-white/50 border border-purple-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder-gray-400 transition-all font-medium"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="block text-sm font-semibold text-gray-700">Add Poses to Sequence</label>
                                <div className="flex flex-wrap gap-2">
                                    {AVAILABLE_POSES.map((pose) => (
                                        <button
                                            key={pose.value}
                                            type="button"
                                            onClick={() => handleAddPose(pose.value)}
                                            className="px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white border border-purple-100 hover:border-purple-600 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1 active:scale-95"
                                        >
                                            <Plus className="w-4 h-4" />
                                            {pose.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-4 min-h-[160px]">
                                <label className="block text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">Your Sequence</label>
                                {selectedPoses.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center p-6 text-center h-full">
                                        <Dumbbell className="w-10 h-10 text-gray-300 mb-2" />
                                        <p className="text-gray-400 text-sm">Click the poses above to add them to your sequence.</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        {selectedPoses.map((poseValue, index) => {
                                            const poseLabel = AVAILABLE_POSES.find(p => p.value === poseValue)?.label || poseValue;
                                            return (
                                                <div key={index} className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm group">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">
                                                            {index + 1}
                                                        </div>
                                                        <span className="font-medium text-gray-800">{poseLabel}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemovePose(index)}
                                                        className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100 md:opacity-100"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-3.5 rounded-xl transition-all duration-200 shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                        <span>Save Custom Set</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Right Panel: List */}
                    <div className="flex flex-col space-y-4">
                        <div className="flex items-center gap-2 mb-2 px-2">
                            <Activity className="w-5 h-5 text-gray-500" />
                            <h2 className="text-xl font-bold text-gray-800">Your Saved Sets</h2>
                        </div>

                        {loadingSets ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-white/40 rounded-3xl border border-white/50 backdrop-blur-sm flex-1">
                                <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-4" />
                                <p className="text-gray-500">Loading custom sets...</p>
                            </div>
                        ) : fetchError ? (
                            <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-6">
                                <p>{fetchError}</p>
                            </div>
                        ) : customSets.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-white/40 rounded-3xl border border-white/50 backdrop-blur-sm flex-1 text-center px-6">
                                <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                                    <Activity className="w-10 h-10 text-purple-400" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800 mb-2">No custom sets yet</h3>
                                <p className="text-gray-500 max-w-sm">Use the builder to create your first custom sequence.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {customSets.map((set) => (
                                    <div key={set.set_id} className="bg-white/70 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-md hover:shadow-lg transition-all group">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">{set.name}</h3>
                                                <p className="text-sm text-gray-500 mt-1">
                                                    {set.poses.length} pose{set.poses.length !== 1 ? 's' : ''} • Created on {new Date(set.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteSet(set.set_id)}
                                                className="text-gray-400 hover:text-red-500 p-2 rounded-xl hover:bg-red-50 transition-colors"
                                                title="Delete Set"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {set.poses.map((poseValue, index) => {
                                                const label = AVAILABLE_POSES.find(p => p.value === poseValue)?.label || poseValue;
                                                return (
                                                    <span key={index} className="text-xs font-semibold px-2.5 py-1 bg-purple-50 text-purple-700 rounded-md border border-purple-100">
                                                        {index + 1}. {label}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default BuildSetPage;
