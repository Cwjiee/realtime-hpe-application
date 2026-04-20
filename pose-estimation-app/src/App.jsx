import React, { useState } from 'react';
import {
  HomePage, TrackingPage, SetPage, LoginPage, SignupPage,
  SessionHistoryPage, SessionDetailPage, LeaderboardPage, UploadVideoPage, BuildSetPage
} from './pages';
import { useAuth } from './context/AuthContext';

const YogaPoseTracker = () => {
  const { isAuthenticated, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState(isAuthenticated ? 'home' : 'login');
  const [selectedSessionId, setSelectedSessionId] = useState(null);

  const handleHomeClick = () => setCurrentPage('home');
  const handleStartSession = () => setCurrentPage('tracking');
  const handleStartSet = () => setCurrentPage('set');
  const handleBuildSet = () => setCurrentPage('build-set');
  const handleHistoryClick = () => setCurrentPage('history');
  const handleLeaderboardClick = () => setCurrentPage('leaderboard');
  const handleUploadVideo = () => setCurrentPage('upload');
  const handleLogin = () => setCurrentPage('home');
  const handleSignup = () => setCurrentPage('login');
  const handleNeedAccount = () => setCurrentPage('signup');
  const handleHaveAccount = () => setCurrentPage('login');
  const handleLogout = () => {
    logout();
    setCurrentPage('login');
  };

  const handleSessionSelect = (sessionId) => {
    setSelectedSessionId(sessionId);
    setCurrentPage('session-detail');
  };

  const handleBackToHistory = () => {
    setSelectedSessionId(null);
    setCurrentPage('history');
  };

  const renderPage = () => {
    if (!isAuthenticated) {
      if (currentPage === 'signup') {
        return <SignupPage onSignup={handleSignup} onHaveAccount={handleHaveAccount} />;
      }
      return <LoginPage onLogin={handleLogin} onNeedAccount={handleNeedAccount} />;
    }

    switch (currentPage) {
      case 'tracking':
        return <TrackingPage onHomeClick={handleHomeClick} />;
      case 'set':
        return <SetPage onHomeClick={handleHomeClick} />;
      case 'build-set':
        return <BuildSetPage onHomeClick={handleHomeClick} />;
      case 'history':
        return <SessionHistoryPage onHomeClick={handleHomeClick} onSessionSelect={handleSessionSelect} />;
      case 'session-detail':
        return (
          <SessionDetailPage
            sessionId={selectedSessionId}
            onBackClick={handleBackToHistory}
            onHomeClick={handleHomeClick}
          />
        );
      case 'leaderboard':
        return <LeaderboardPage onHomeClick={handleHomeClick} />;
      case 'upload':
        return <UploadVideoPage onHomeClick={handleHomeClick} />;
      default:
        return (
          <HomePage
            onStartSession={handleStartSession}
            onStartSet={handleStartSet}
            onBuildSet={handleBuildSet}
            onLogout={handleLogout}
            onSessionHistory={handleHistoryClick}
            onLeaderboard={handleLeaderboardClick}
            onUploadVideo={handleUploadVideo}
          />
        );
    }
  };

  return renderPage();
};

export default YogaPoseTracker;
