import React, { useEffect } from 'react';
import { AppProvider, useApp } from './lib/AppContext';

import { SplashScreen } from './screens/SplashScreen';
import { LoginScreen } from './screens/LoginScreen';
import { RegisterScreen } from './screens/RegisterScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { ForgotPasswordScreen } from './screens/ForgotPasswordScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { AdminDashboardScreen } from './screens/AdminDashboardScreen';
import { CalendarScreen } from './screens/CalendarScreen';
import { NutritionScreen } from './screens/NutritionScreen';
import { SleepScreen } from './screens/SleepScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { HelpScreen } from './screens/HelpScreen';
import { GuideScreen } from './screens/GuideScreen';
import { PremiumScreen } from './screens/PremiumScreen';
import { TrackingScreen } from './screens/TrackingScreen';
import { AIChatScreen } from './screens/AIChatScreen';
import { BottomNav } from './components/BottomNav';
import { recordLandingPageVisit } from './lib/landingAnalytics';

const APP_SCREENS = ['dashboard', 'calendar', 'nutrition', 'sleep', 'profile'];

function AppInner() {
  const { screen, isAdmin, setScreen } = useApp();
  const showNav = APP_SCREENS.includes(screen);

  useEffect(() => {
    void recordLandingPageVisit();
  }, []);

  useEffect(() => {
    if (screen === 'adminDashboard' && !isAdmin) setScreen('login');
  }, [screen, isAdmin, setScreen]);

  function renderScreen() {
    switch (screen) {

      case 'splash': return <SplashScreen />;
      case 'login': return <LoginScreen />;
      case 'register': return <RegisterScreen />;
      case 'onboarding': return <OnboardingScreen />;
      case 'forgotPassword': return <ForgotPasswordScreen />;
      case 'resetPassword': return <ForgotPasswordScreen />;
      case 'adminDashboard': return isAdmin ? <AdminDashboardScreen /> : <LoginScreen />;
      case 'dashboard': return <DashboardScreen />;
      case 'calendar': return <CalendarScreen />;
      case 'nutrition': return <NutritionScreen />;
      case 'sleep': return <SleepScreen />;
      case 'profile': return <ProfileScreen />;
      case 'settings': return <SettingsScreen />;
      case 'help': return <HelpScreen />;
      case 'guide': return <GuideScreen />;
      case 'premium': return <PremiumScreen />;
      case 'tracking': return <TrackingScreen />;
      case 'aiChat': return <AIChatScreen />;
      default: return <SplashScreen />;
    }
  }

  return (
    <div className="w-full h-[100dvh] flex flex-col bg-black">
      <div className="flex-1 relative flex flex-col overflow-hidden w-full h-full">
        {renderScreen()}
      </div>
      {showNav && (
        <div className="shrink-0 w-full z-50 bg-[#173325] pb-[env(safe-area-inset-bottom)] border-t border-white/10">
          <BottomNav />
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
