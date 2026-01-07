import React from 'react';

const FeedbackPanel = () => (
    <div className="mt-6 max-w-4xl w-full">
        <div className="bg-black bg-opacity-40 backdrop-blur-md rounded-2xl p-6 border border-white border-opacity-20">
            <h3 className="text-white font-semibold text-lg mb-4">Feedback &amp; Tips</h3>
            <div className="space-y-3">
                <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2" />
                    <p className="text-gray-300 text-sm">Good balance - keep your core engaged</p>
                </div>
                <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2" />
                    <p className="text-gray-300 text-sm">Try to straighten your standing leg more</p>
                </div>
            </div>
        </div>
    </div>
);

export default FeedbackPanel;
