import {
  Box,
  Paper,
  Typography,
  Button,
  Divider,
  Chip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import type { Profile } from '@/services/profile/profile.service.types';
import RAGPanel from '../RAGPanel/RAGPanel';

interface ProfileDetailsProps {
  profile: Profile;
  onEditProfile: () => void;
  onDeleteProfile: () => void;
  onProfileUpdate: (profile: Profile) => void;
}

export default function ProfileDetails({
  profile,
  onEditProfile,
  onDeleteProfile,
  onProfileUpdate,
}: ProfileDetailsProps) {
  return (
    <Box
      sx={{
        height: '100%',
        overflow: 'auto',
        p: 3,
      }}
    >
      {/* Profile Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" gutterBottom>
              {profile.name}
            </Typography>
            {profile.description && (
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {profile.description}
              </Typography>
            )}
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              {profile.ragEnabled && (
                <Chip
                  label="RAG activé"
                  color="primary"
                  size="small"
                />
              )}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<EditIcon />}
              onClick={onEditProfile}
            >
              Modifier
            </Button>
            <Button
              variant="outlined"
              size="small"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={onDeleteProfile}
            >
              Supprimer
            </Button>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Contexte système
          </Typography>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              bgcolor: 'grey.50',
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
            }}
          >
            {profile.system_context}
          </Paper>
        </Box>

        {profile.ragEnabled && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Configuration RAG
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Modèle d'embedding: {profile.embeddingModelId || 'Non défini'}
            </Typography>
            {profile.ragSettings && (
              <Typography variant="body2" color="text.secondary">
                Top-K: {profile.ragSettings.topK} • Seuil de similarité:{' '}
                {profile.ragSettings.similarityThreshold || 'Non défini'}
              </Typography>
            )}
          </Box>
        )}
      </Paper>

      {/* RAG Management Section */}
      {profile.ragEnabled && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Gestion de la base de connaissance
          </Typography>
          <RAGPanel profile={profile} onProfileUpdate={onProfileUpdate} />
        </Box>
      )}
    </Box>
  );
}
