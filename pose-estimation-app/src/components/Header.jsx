import React from 'react';
import { Home, Settings } from 'lucide-react';

const Header = ({ onHomeClick }) => (
    <header className="bg-black bg-opacity-30 backdrop-blur-sm p-4 flex items-center justify-between border-b border-white border-opacity-10">
        <button
            onClick={onHomeClick}
            className="flex items-center gap-2 text-white hover:text-purple-300 transition-colors"
        >
            <Home className="w-5 h-5" />
            <span className="font-medium">Home</span>
        </button>
        <h2 className="text-xl font-bold text-white">Pose Tracking</h2>
        <button className="text-white hover:text-purple-300 transition-colors">
            <Settings className="w-5 h-5" />
        </button>
    </header>
);

export default Header;
