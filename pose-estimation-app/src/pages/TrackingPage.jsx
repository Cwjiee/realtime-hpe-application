import React, { useState, useRef } from 'react';
import { Header, CameraView, FeedbackPanel } from '../components';

const TrackingPage = ({ onHomeClick }) => {
    const [cam, setCam] = useState(false);
    const webcamRef = useRef(null);

    const handleToggleCam = () => {
        setCam(!cam);
    };

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900">
            <Header onHomeClick={onHomeClick} />

            <div className="flex-1 flex flex-col items-center justify-center p-8">
                <CameraView
                    cam={cam}
                    webcamRef={webcamRef}
                    onToggleCam={handleToggleCam}
                />
                <FeedbackPanel />
            </div>
        </div>
    );
};

export default TrackingPage;
