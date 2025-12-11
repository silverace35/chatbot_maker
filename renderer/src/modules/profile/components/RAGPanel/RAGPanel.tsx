import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  CircularProgress,
  Alert,
  useTheme,
  alpha,
  Tooltip,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  InsertDriveFile as FileIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { ragService } from '@/services/rag/rag.service';
import { profileService } from '@/services/profile/profile.service';
import type { Resource, Profile } from '@/types/electron-api';
import { GlassCard, StatusBadge, IndexingProgress } from '@/modules/shared/components';
import { useIndexingStatus } from '@/hooks/useIndexingStatus';

interface RAGPanelProps {
  profile: Profile;
  onProfileUpdate?: (profile: Profile) => void;
}

export default function RAGPanel({ profile, onProfileUpdate }: RAGPanelProps) {
  const theme = useTheme();
  const [resources, setResources] = useState<Resource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Indexing status hook
  const {
    indexingJob,
    isIndexing,
    progress: indexingProgress,
    statusMessage: indexingStatusMessage,
    error: indexingError,
    startIndexing,
    refreshStatus: refreshIndexingStatus,
  } = useIndexingStatus({
    profileId: profile.id,
    enabled: profile.ragEnabled,
    onProfileUpdated: onProfileUpdate,
  });

  // Load resources
  const loadResources = async () => {
    try {
      const data = await ragService.listResources(profile.id);
      setResources(data);
    } catch (err) {
      console.error('Error loading resources:', err);
    }
  };

  useEffect(() => {
    loadResources();
  }, [profile.id]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      await ragService.uploadFiles(profile.id, Array.from(files));
      await loadResources();

      // Mark profile index as stale if it was ready
      if (profile.indexStatus === 'ready') {
        const updatedProfile = await profileService.updateProfile(profile.id, { indexStatus: 'stale' });
        onProfileUpdate?.(updatedProfile);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      // Reset input
      event.target.value = '';
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette ressource ?')) return;

    try {
      await ragService.deleteResource(profile.id, resourceId);
      await loadResources();

      // Mark profile index as stale if it was ready
      if (profile.indexStatus === 'ready') {
        const updatedProfile = await profileService.updateProfile(profile.id, { indexStatus: 'stale' });
        onProfileUpdate?.(updatedProfile);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleStartIndexing = async () => {
    await startIndexing();
  };

  // Dériver le statut pour l'affichage
  const getIndexStatusBadge = (): 'success' | 'warning' | 'error' | 'default' | 'pending' | 'info' => {
    if (isIndexing) return 'info';
    switch (profile.indexStatus) {
      case 'ready': return 'success';
      case 'processing': return 'info';
      case 'stale': return 'warning';
      case 'error': return 'error';
      case 'pending': return 'pending';
      default: return 'default';
    }
  };

  const getIndexStatusLabel = () => {
    if (isIndexing) return 'Indexation...';
    switch (profile.indexStatus) {
      case 'ready': return 'Indexé';
      case 'processing': return 'Indexation...';
      case 'stale': return 'À mettre à jour';
      case 'error': return 'Erreur';
      case 'pending': return 'En attente';
      default: return 'Non indexé';
    }
  };

  if (!profile.ragEnabled) {
    return (
      <GlassCard sx={{ p: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Le RAG n'est pas activé pour ce profil. Activez-le dans les paramètres du profil pour gérer des ressources.
        </Typography>
      </GlassCard>
    );
  }

  return (
    <GlassCard sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="h6" fontWeight={600}>
            Fichiers sources
          </Typography>
          <StatusBadge
            status={getIndexStatusBadge()}
            label={getIndexStatusLabel()}
            pulse={isIndexing}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            component="label"
            startIcon={uploading ? <CircularProgress size={16} /> : <UploadIcon />}
            disabled={uploading}
            size="small"
            sx={{ borderRadius: 2 }}
          >
            {uploading ? 'Upload...' : 'Ajouter'}
            <input
              type="file"
              hidden
              multiple
              onChange={handleFileUpload}
              accept=".txt,.md,.json,.csv"
            />
          </Button>
          <Button
            variant="contained"
            startIcon={isIndexing ? <CircularProgress size={16} color="inherit" /> : <PlayIcon />}
            onClick={handleStartIndexing}
            disabled={isIndexing || resources.length === 0}
            size="small"
            sx={{ borderRadius: 2 }}
          >
            {isIndexing ? 'Indexation...' : 'Indexer'}
          </Button>
        </Box>
      </Box>

      {/* Error */}
      {(error || indexingError) && (
        <Alert
          severity="error"
          sx={{ mb: 2, borderRadius: 2 }}
          onClose={() => setError(null)}
        >
          {error || indexingError}
        </Alert>
      )}

      {/* Indexing progress */}
      {(isIndexing || indexingJob) && (
        <Box sx={{ mb: 3 }}>
          <IndexingProgress
            job={indexingJob}
            isIndexing={isIndexing}
            progress={indexingProgress}
            statusMessage={indexingStatusMessage}
            error={indexingError}
            onRefresh={refreshIndexingStatus}
          />
        </Box>
      )}


      {/* Resources list */}
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
        {resources.length} fichier{resources.length !== 1 ? 's' : ''}
      </Typography>

      {resources.length === 0 ? (
        <Box
          sx={{
            py: 4,
            textAlign: 'center',
            borderRadius: 2,
            border: `2px dashed ${theme.palette.divider}`,
            backgroundColor: alpha(theme.palette.background.default, 0.5),
          }}
        >
          <UploadIcon sx={{ fontSize: 40, color: theme.palette.text.secondary, mb: 1, opacity: 0.5 }} />
          <Typography variant="body2" color="text.secondary">
            Ajoutez des fichiers pour créer votre base de connaissance
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Formats supportés: .txt, .md, .json, .csv
          </Typography>
        </Box>
      ) : (
        <List sx={{ py: 0 }}>
          {resources.map((resource) => (
            <ListItem
              key={resource.id}
              sx={{
                px: 2,
                py: 1.5,
                mb: 1,
                borderRadius: 2,
                backgroundColor: alpha(theme.palette.background.default, 0.5),
                border: `1px solid ${theme.palette.divider}`,
                '&:last-child': { mb: 0 },
              }}
            >
              <Box
                sx={{
                  mr: 2,
                  p: 1,
                  borderRadius: 1.5,
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                }}
              >
                <FileIcon sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
              </Box>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" fontWeight={500}>
                      {resource.originalName || 'Sans nom'}
                    </Typography>
                    {resource.indexed && (
                      <CheckCircleIcon sx={{ fontSize: 16, color: theme.palette.success.main }} />
                    )}
                  </Box>
                }
                secondary={
                  <Typography variant="caption" color="text.secondary">
                    {resource.type?.toUpperCase()} • {Math.round((resource.sizeBytes || 0) / 1024)} KB
                  </Typography>
                }
              />
              <Tooltip title="Supprimer">
                <IconButton
                  edge="end"
                  onClick={() => handleDeleteResource(resource.id)}
                  size="small"
                  sx={{
                    color: theme.palette.text.secondary,
                    '&:hover': {
                      color: theme.palette.error.main,
                      backgroundColor: alpha(theme.palette.error.main, 0.1),
                    },
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </ListItem>
          ))}
        </List>
      )}
    </GlassCard>
  );
}
