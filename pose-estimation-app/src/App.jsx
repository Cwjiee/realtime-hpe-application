import React, { useState } from 'react';
import { HomePage, TrackingPage, SetPage, LoginPage, SignupPage, SessionHistoryPage, LeaderboardPage, UploadVideoPage } from './pages';

const YogaPoseTracker = () => {
  // Initial state is 'login' for the prototype
  const [currentPage, setCurrentPage] = useState('login');

  const handleHomeClick = () => {
    setCurrentPage('home');
  };

  const handleStartSession = () => {
    setCurrentPage('tracking');
  };

  const handleStartSet = () => {
    setCurrentPage('set');
  };

  const handleHistoryClick = () => {
    setCurrentPage('history');
  };

  const handleLeaderboardClick = () => {
    setCurrentPage('leaderboard');
  };

  const handleUploadVideo = () => {
    setCurrentPage('upload');
  };

  const handleLogin = () => {
    setCurrentPage('home');
  };

  const handleSignup = () => {
    setCurrentPage('home');
  };

  const handleNeedAccount = () => {
    setCurrentPage('signup');
  };

  const handleHaveAccount = () => {
    setCurrentPage('login');
  };

  const handleLogout = () => {
    setCurrentPage('login');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'login':
        return <LoginPage onLogin={handleLogin} onNeedAccount={handleNeedAccount} />;
      case 'signup':
        return <SignupPage onSignup={handleSignup} onHaveAccount={handleHaveAccount} />;
      case 'tracking':
        return <TrackingPage onHomeClick={handleHomeClick} />;
      case 'set':
        return <SetPage onHomeClick={handleHomeClick} />;
      case 'history':
        return <SessionHistoryPage onHomeClick={handleHomeClick} />;
      case 'leaderboard':
        return <LeaderboardPage onHomeClick={handleHomeClick} />;
      case 'upload':
        return <UploadVideoPage onHomeClick={handleHomeClick} />;
      default:
        return <HomePage
          onStartSession={handleStartSession}
          onStartSet={handleStartSet}
          onLogout={handleLogout}
          onSessionHistory={handleHistoryClick}
          onLeaderboard={handleLeaderboardClick}
          onUploadVideo={handleUploadVideo}
        />;
    }
  };

  return renderPage();
};

export default YogaPoseTracker;
