import React, { useState } from 'react';
import { HomePage, TrackingPage, SetPage } from './pages';

const YogaPoseTracker = () => {
  const [currentPage, setCurrentPage] = useState('home');

  const handleHomeClick = () => {
    setCurrentPage('home');
  };

  const handleStartSession = () => {
    setCurrentPage('tracking');
  };

  const handleStartSet = () => {
    setCurrentPage('set');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'tracking':
        return <TrackingPage onHomeClick={handleHomeClick} />;
      case 'set':
        return <SetPage onHomeClick={handleHomeClick} />;
      default:
        return <HomePage onStartSession={handleStartSession} onStartSet={handleStartSet} />;
    }
  };

  return renderPage();
};

export default YogaPoseTracker;
