import { useState, useEffect } from 'react';
import { Box, Alert, Typography, useTheme, alpha } from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ProfileList from '../components/ProfileList/ProfileList';
import ProfileDetails from '../components/ProfileDetails/ProfileDetails';
import ProfileDialog from '@/modules/chat/components/ProfileDialog/ProfileDialog';
import { profileService } from '@/services/profile/profile.service';
import type { Profile, CreateProfilePayload } from '@/services/profile/profile.service.types';
import { EmptyState } from '@/modules/shared/components';

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);

  // Load profiles on mount
  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      setError(null);
      const loadedProfiles = await profileService.listProfiles();
      setProfiles(loadedProfiles);

      // Auto-select first profile if none selected
      if (!selectedProfileId && loadedProfiles.length > 0) {
        setSelectedProfileId(loadedProfiles[0].id);
      }
    } catch (err) {
      console.error('Error loading profiles:', err);
      setError('Erreur lors du chargement des profils. Vérifiez que le backend est démarré.');
    }
  };

  const handleCreateProfile = async (data: CreateProfilePayload) => {
    try {
      setIsSubmittingProfile(true);
      setError(null);

      if (editingProfile) {
        // Update existing profile
        const updated = await profileService.updateProfile(editingProfile.id, data);
        setProfiles(profiles.map((p) => (p.id === updated.id ? updated : p)));
        if (selectedProfileId === updated.id) {
          // Trigger re-render by updating selection
          setSelectedProfileId(null);
          setTimeout(() => setSelectedProfileId(updated.id), 0);
        }
      } else {
        // Create new profile
        const newProfile = await profileService.createProfile(data);
        setProfiles([...profiles, newProfile]);
        setSelectedProfileId(newProfile.id);
      }

      setProfileDialogOpen(false);
      setEditingProfile(null);
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Erreur lors de la sauvegarde du profil.');
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!selectedProfileId) return;

    const profile = profiles.find((p) => p.id === selectedProfileId);
    if (!profile) return;

    // TODO: Implement delete endpoint in backend
    // For now, disable delete functionality to avoid state inconsistency
    setError('La suppression de profil n\'est pas encore implémentée dans le backend.');
  };

  const handleEditProfile = () => {
    const profile = profiles.find((p) => p.id === selectedProfileId);
    if (profile) {
      setEditingProfile(profile);
      setProfileDialogOpen(true);
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
          onCreateProfile={() => {
            setEditingProfile(null);
            setProfileDialogOpen(true);
          }}
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
              onClick: () => {
                setEditingProfile(null);
                setProfileDialogOpen(true);
              },
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

      {/* Profile Dialog (Create/Edit) */}
      <ProfileDialog
        open={profileDialogOpen}
        onClose={() => {
          setProfileDialogOpen(false);
          setEditingProfile(null);
        }}
        onSubmit={handleCreateProfile}
        loading={isSubmittingProfile}
        profile={editingProfile}
      />
    </Box>
  );
}
