import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Button,
  Avatar,
  useTheme,
  alpha,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import type { Profile } from '@/services/profile/profile.service.types';
import { StatusBadge } from '@/modules/shared/components';

interface ProfileListProps {
  profiles: Profile[];
  selectedProfileId: string | null;
  onSelectProfile: (profileId: string) => void;
  onCreateProfile: () => void;
}

export default function ProfileList({
  profiles,
  selectedProfileId,
  onSelectProfile,
  onCreateProfile,
}: ProfileListProps) {
  const theme = useTheme();

  const getIndexStatus = (profile: Profile): 'success' | 'warning' | 'error' | 'default' | 'pending' => {
    if (!profile.ragEnabled) return 'default';
    switch (profile.indexStatus) {
      case 'ready': return 'success';
      case 'processing': return 'pending';
      case 'stale': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: alpha(theme.palette.background.paper, 0.5),
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 3,
          pb: 2,
        }}
      >
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Profils
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {profiles.length} profil{profiles.length !== 1 ? 's' : ''} créé{profiles.length !== 1 ? 's' : ''}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onCreateProfile}
          fullWidth
          sx={{
            borderRadius: 2,
            py: 1.25,
          }}
        >
          Nouveau profil
        </Button>
      </Box>

      {/* Profile List */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', px: 1 }}>
        {profiles.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ p: 3, textAlign: 'center' }}
          >
            Aucun profil. Créez-en un pour commencer.
          </Typography>
        ) : (
          <List sx={{ py: 0 }}>
            {profiles.map((profile) => (
              <ListItem key={profile.id} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  selected={profile.id === selectedProfileId}
                  onClick={() => onSelectProfile(profile.id)}
                  sx={{
                    borderRadius: 2,
                    py: 1.5,
                    px: 2,
                    '&.Mui-selected': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.12),
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 4,
                        height: '60%',
                        borderRadius: '0 4px 4px 0',
                        background: `linear-gradient(180deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                      },
                    },
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.08),
                    },
                  }}
                >
                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      mr: 2,
                      background: profile.id === selectedProfileId
                        ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`
                        : theme.palette.mode === 'dark'
                          ? alpha(theme.palette.grey[700], 0.5)
                          : alpha(theme.palette.grey[300], 0.8),
                      fontSize: '1rem',
                      fontWeight: 600,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {profile.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                          variant="body1"
                          fontWeight={profile.id === selectedProfileId ? 600 : 500}
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {profile.name}
                        </Typography>
                        {profile.ragEnabled && (
                          <StatusBadge
                            status={getIndexStatus(profile)}
                            label={profile.indexStatus === 'ready' ? 'RAG' : undefined}
                            sx={{ height: 20, fontSize: '0.65rem' }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {profile.description || 'Aucune description'}
                      </Typography>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Box>
  );
}
