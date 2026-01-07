import React from 'react';
import { Camera } from 'lucide-react';
import Webcam from 'react-webcam';

const CameraView = ({ cam, webcamRef, onToggleCam }) => (
    <div className="w-full max-w-4xl bg-black bg-opacity-40 backdrop-blur-md rounded-3xl overflow-hidden shadow-2xl border border-white border-opacity-20">
        <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative">
            {cam ? (
                <Webcam
                    className="absolute inset-0 w-full h-full object-cover"
                    ref={webcamRef}
                    mirrored={true}
                    videoConstraints={{
                        facingMode: "user",
                        width: 1280,
                        height: 720
                    }}
                />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                    <Camera className="w-24 h-24 text-white opacity-20" />
                </div>
            )}
            <div className="relative z-10 text-center"></div>
        </div>

        <div className="bg-black bg-opacity-50 p-6">
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white bg-opacity-10 rounded-xl p-4 backdrop-blur-sm">
                    <div className="text-black text-sm mb-1">Current Pose</div>
                    <div className="text-gray-800 text-xl font-bold">Tree Pose</div>
                </div>
            </div>

            <div className="flex gap-4">
                <button
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                    onClick={onToggleCam}
                >
                    {cam ? "Stop Tracking" : "Start Tracking"}
                </button>
            </div>
        </div>
    </div>
);

export default CameraView;
