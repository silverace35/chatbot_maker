import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Button,
  Chip,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import type { Profile } from '@/services/profile/profile.service.types';

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
  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRight: 1,
        borderColor: 'divider',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" gutterBottom>
          Profils
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onCreateProfile}
          fullWidth
          size="small"
        >
          Nouveau profil
        </Button>
      </Box>

      {/* Profile List */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {profiles.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ p: 2, textAlign: 'center' }}
          >
            Aucun profil. Créez-en un pour commencer.
          </Typography>
        ) : (
          <List>
            {profiles.map((profile) => (
              <ListItem key={profile.id} disablePadding>
                <ListItemButton
                  selected={profile.id === selectedProfileId}
                  onClick={() => onSelectProfile(profile.id)}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1">{profile.name}</Typography>
                        {profile.ragEnabled && (
                          <Chip
                            label="RAG"
                            size="small"
                            color={profile.indexStatus === 'ready' ? 'success' : 'default'}
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        )}
                      </Box>
                    }
                    secondary={profile.description || 'Aucune description'}
                    secondaryTypographyProps={{
                      noWrap: true,
                    }}
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
