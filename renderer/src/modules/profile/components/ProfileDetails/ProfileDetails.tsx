import {
  Box,
  Typography,
  Button,
  Avatar,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Storage as StorageIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import type { Profile } from '@/services/profile/profile.service.types';
import RAGPanel from '../RAGPanel/RAGPanel';
import { GlassCard, StatusBadge } from '@/modules/shared/components';

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
  const theme = useTheme();

  const getIndexStatus = (): 'success' | 'warning' | 'error' | 'default' | 'pending' | 'info' => {
    if (!profile.ragEnabled) return 'default';
    switch (profile.indexStatus) {
      case 'ready': return 'success';
      case 'processing': return 'info';
      case 'stale': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = () => {
    switch (profile.indexStatus) {
      case 'ready': return 'Prêt';
      case 'processing': return 'Indexation...';
      case 'stale': return 'À mettre à jour';
      case 'error': return 'Erreur';
      default: return 'Non indexé';
    }
  };

  return (
    <Box
      sx={{
        height: '100%',
        overflow: 'auto',
        p: 3,
      }}
    >
      {/* Profile Header Card */}
      <GlassCard
        gradient
        sx={{
          p: 3,
          mb: 3,
        }}
      >
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
          {/* Avatar */}
          <Avatar
            sx={{
              width: 72,
              height: 72,
              fontSize: '2rem',
              fontWeight: 700,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
            }}
          >
            {profile.name.charAt(0).toUpperCase()}
          </Avatar>

          {/* Info */}
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
              <Box>
                <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
                  {profile.name}
                </Typography>
                {profile.description && (
                  <Typography variant="body1" color="text.secondary">
                    {profile.description}
                  </Typography>
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={onEditProfile}
                  sx={{ borderRadius: 2 }}
                >
                  Modifier
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={onDeleteProfile}
                  sx={{ borderRadius: 2 }}
                >
                  Supprimer
                </Button>
              </Box>
            </Box>

            {/* Status badges */}
            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              {profile.ragEnabled && (
                <StatusBadge
                  status={getIndexStatus()}
                  label={`RAG: ${getStatusLabel()}`}
                  pulse={profile.indexStatus === 'processing'}
                />
              )}
            </Box>
          </Box>
        </Box>
      </GlassCard>

      {/* System Context Section */}
      <GlassCard sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <SettingsIcon sx={{ color: theme.palette.primary.main }} />
          <Typography variant="h6" fontWeight={600}>
            Contexte système
          </Typography>
        </Box>
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            backgroundColor: alpha(theme.palette.background.default, 0.5),
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              whiteSpace: 'pre-wrap',
              fontFamily: '"Fira Code", monospace',
              fontSize: '0.85rem',
              lineHeight: 1.6,
            }}
          >
            {profile.system_context}
          </Typography>
        </Box>
      </GlassCard>

      {/* RAG Settings */}
      {profile.ragEnabled && (
        <GlassCard sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <StorageIcon sx={{ color: theme.palette.secondary.main }} />
            <Typography variant="h6" fontWeight={600}>
              Configuration RAG
            </Typography>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
              }}
            >
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                Modèle d'embedding
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {profile.embeddingModelId || 'Non défini'}
              </Typography>
            </Box>
            {profile.ragSettings && (
              <>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                    border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
                  }}
                >
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                    Top-K
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {profile.ragSettings.topK}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                    border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
                  }}
                >
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                    Seuil de similarité
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {profile.ragSettings.similarityThreshold || 'Non défini'}
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        </GlassCard>
      )}

      {/* RAG Management Section */}
      {profile.ragEnabled && (
        <Box>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <StorageIcon sx={{ color: theme.palette.secondary.main }} />
            Gestion de la base de connaissance
          </Typography>
          <RAGPanel profile={profile} onProfileUpdate={onProfileUpdate} />
        </Box>
      )}
    </Box>
  );
}
