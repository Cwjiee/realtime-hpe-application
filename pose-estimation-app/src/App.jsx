import React, { useState } from 'react';
import { HomePage, TrackingPage } from './pages';

const YogaPoseTracker = () => {
  const [currentPage, setCurrentPage] = useState('home');

  const handleHomeClick = () => {
    setCurrentPage('home');
  };

  const handleStartSession = () => {
    setCurrentPage('tracking');
  };

  return currentPage === 'home' ? (
    <HomePage onStartSession={handleStartSession} />
  ) : (
    <TrackingPage onHomeClick={handleHomeClick} />
  );
};

export default YogaPoseTracker;
