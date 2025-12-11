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
  LinearProgress,
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
import type { Resource, IndexingJob, Profile } from '@/types/electron-api';
import { GlassCard, StatusBadge } from '@/modules/shared/components';

interface RAGPanelProps {
  profile: Profile;
  onProfileUpdate?: (profile: Profile) => void;
}

export default function RAGPanel({ profile, onProfileUpdate }: RAGPanelProps) {
  const theme = useTheme();
  const [resources, setResources] = useState<Resource[]>([]);
  const [indexingJob, setIndexingJob] = useState<IndexingJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Load resources
  const loadResources = async () => {
    try {
      const data = await ragService.listResources(profile.id);
      setResources(data);
    } catch (err) {
      console.error('Error loading resources:', err);
    }
  };

  // Load latest indexing job
  const loadIndexingJob = async () => {
    try {
      const jobs = await ragService.listIndexingJobs(profile.id);
      if (jobs.length > 0) {
        setIndexingJob(jobs[0]);
      }
    } catch (err) {
      console.error('Error loading indexing jobs:', err);
    }
  };

  // Poll indexing job status
  useEffect(() => {
    if (indexingJob && (indexingJob.status === 'pending' || indexingJob.status === 'processing')) {
      const interval = setInterval(async () => {
        try {
          const updatedJob = await ragService.getIndexingJob(indexingJob.id);
          setIndexingJob(updatedJob);

          // If completed, reload profile to get updated index status
          if (updatedJob.status === 'completed' || updatedJob.status === 'failed') {
            const updatedProfile = await profileService.getProfile(profile.id);
            onProfileUpdate?.(updatedProfile);
          }
        } catch (err) {
          console.error('Error polling job status:', err);
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [indexingJob, profile.id, onProfileUpdate]);

  useEffect(() => {
    loadResources();
    loadIndexingJob();
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
    setLoading(true);
    setError(null);

    try {
      const job = await ragService.startIndexing(profile.id);
      setIndexingJob(job);

      // Reload profile to get updated status
      const updatedProfile = await profileService.getProfile(profile.id);
      onProfileUpdate?.(updatedProfile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Indexing failed to start');
    } finally {
      setLoading(false);
    }
  };

  const getIndexStatus = (): 'success' | 'warning' | 'error' | 'default' | 'pending' | 'info' => {
    switch (profile.indexStatus) {
      case 'ready': return 'success';
      case 'processing': return 'info';
      case 'stale': return 'warning';
      case 'error': return 'error';
      case 'pending': return 'pending';
      default: return 'default';
    }
  };

  const getStatusLabel = () => {
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
            status={getIndexStatus()}
            label={getStatusLabel()}
            pulse={profile.indexStatus === 'processing'}
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
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <PlayIcon />}
            onClick={handleStartIndexing}
            disabled={loading || resources.length === 0}
            size="small"
            sx={{ borderRadius: 2 }}
          >
            Indexer
          </Button>
        </Box>
      </Box>

      {/* Error */}
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2, borderRadius: 2 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* Indexing progress */}
      {indexingJob && (indexingJob.status === 'processing' || indexingJob.status === 'pending') && (
        <Box
          sx={{
            mb: 3,
            p: 2,
            borderRadius: 2,
            backgroundColor: alpha(theme.palette.info.main, 0.1),
            border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" fontWeight={500}>
              Indexation en cours...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {indexingJob.progress}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={indexingJob.progress}
            sx={{
              borderRadius: 1,
              height: 6,
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {indexingJob.processedSteps} / {indexingJob.totalSteps} ressources traitées
          </Typography>
        </Box>
      )}

      {indexingJob && indexingJob.status === 'failed' && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          Erreur d'indexation : {indexingJob.error}
        </Alert>
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
