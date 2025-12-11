import { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Alert, Typography } from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ProfileList from '../components/ProfileList/ProfileList';
import ProfileDetails from '../components/ProfileDetails/ProfileDetails';
import { profileService } from '@/services/profile/profile.service';
import type { Profile } from '@/services/profile/profile.service.types';
import { EmptyState } from '@/modules/shared/components';

interface ProfilesPageProps {
  onCreateProfile?: () => void;
  onEditProfile?: (profileId: string) => void;
}

export default function ProfilesPage({ onCreateProfile, onEditProfile }: ProfilesPageProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const initialLoadDoneRef = useRef(false);

  // Load profiles
  const loadProfiles = useCallback(async (autoSelectFirst = false) => {
    try {
      const loadedProfiles = await profileService.listProfiles();

      if (!isMountedRef.current) return;

      setProfiles(loadedProfiles);
      setError(null);

      // Auto-select first profile only on initial load
      if (autoSelectFirst && loadedProfiles.length > 0) {
        setSelectedProfileId(prev => prev || loadedProfiles[0].id);
      }
    } catch (err) {
      console.error('Error loading profiles:', err);
      if (isMountedRef.current) {
        setError('Erreur lors du chargement des profils. Vérifiez que le backend est démarré.');
      }
    }
  }, []);

  // Load profiles on mount and start polling
  useEffect(() => {
    isMountedRef.current = true;

    // Initial load with auto-select
    loadProfiles(true);
    initialLoadDoneRef.current = true;

    // Poll for profile updates every 3 seconds to catch indexation status changes
    pollingRef.current = setInterval(() => {
      if (isMountedRef.current) {
        loadProfiles(false); // Don't auto-select on polls
      }
    }, 3000);

    return () => {
      isMountedRef.current = false;
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [loadProfiles]);

  const handleDeleteProfile = async () => {
    if (!selectedProfileId) return;

    const profile = profiles.find((p) => p.id === selectedProfileId);
    if (!profile) return;

    // TODO: Implement delete endpoint in backend
    setError('La suppression de profil n\'est pas encore implémentée dans le backend.');
  };

  const handleEditProfile = () => {
    if (selectedProfileId && onEditProfile) {
      onEditProfile(selectedProfileId);
    }
  };

  const handleProfileUpdate = (updatedProfile: Profile) => {
    setProfiles(profiles.map((p) => (p.id === updatedProfile.id ? updatedProfile : p)));
  };

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId);

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100%',
        width: '100%',
      }}
    >
      {/* Left: Profile List */}
      <Box
        sx={{
          width: 320,
          flexShrink: 0,
          borderRight: 1,
          borderColor: 'divider',
        }}
      >
        <ProfileList
          profiles={profiles}
          selectedProfileId={selectedProfileId}
          onSelectProfile={setSelectedProfileId}
          onCreateProfile={onCreateProfile || (() => {})}
        />
      </Box>

      {/* Right: Profile Details */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {error && (
          <Alert
            severity="error"
            onClose={() => setError(null)}
            sx={{ m: 2, borderRadius: 2 }}
          >
            {error}
          </Alert>
        )}

        {!selectedProfile && profiles.length === 0 ? (
          <EmptyState
            icon={<PersonAddIcon />}
            title="Aucun profil"
            description="Créez votre premier profil d'assistant pour commencer à personnaliser votre chatbot."
            action={{
              label: 'Créer un profil',
              onClick: onCreateProfile || (() => {}),
              icon: <PersonAddIcon />,
            }}
          />
        ) : !selectedProfile ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
            }}
          >
            <Typography variant="body1" color="text.secondary">
              Sélectionnez un profil pour voir les détails
            </Typography>
          </Box>
        ) : (
          <ProfileDetails
            profile={selectedProfile}
            onEditProfile={handleEditProfile}
            onDeleteProfile={handleDeleteProfile}
            onProfileUpdate={handleProfileUpdate}
          />
        )}
      </Box>
    </Box>
  );
}
