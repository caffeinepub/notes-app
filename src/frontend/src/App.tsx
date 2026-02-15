import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import { useGetCallerUserProfile } from './hooks/useUserProfile';
import LoginScreen from './screens/LoginScreen';
import NotesDashboard from './screens/NotesDashboard';
import ProfileSetupModal from './components/ProfileSetupModal';
import { Toaster } from '@/components/ui/sonner';
import { useEffect } from 'react';

export default function App() {
  const { identity, clear } = useInternetIdentity();
  const queryClient = useQueryClient();
  const { data: userProfile, isLoading: profileLoading, isFetched } = useGetCallerUserProfile();

  const isAuthenticated = !!identity;

  // Force dark mode
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // Clear all cached data on logout
  const handleLogout = async () => {
    await clear();
    queryClient.clear();
  };

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  const showProfileSetup = isAuthenticated && !profileLoading && isFetched && userProfile === null;

  return (
    <>
      {showProfileSetup ? (
        <ProfileSetupModal />
      ) : (
        <NotesDashboard onLogout={handleLogout} userName={userProfile?.name || ''} />
      )}
      <Toaster />
    </>
  );
}
