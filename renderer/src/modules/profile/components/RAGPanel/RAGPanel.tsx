import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  CircularProgress,
  Chip,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  HourglassEmpty as HourglassIcon,
} from '@mui/icons-material';
import { ragService } from '@/services/rag/rag.service';
import { profileService } from '@/services/profile/profile.service';
import type { Resource, IndexingJob, Profile } from '@/types/electron-api';

interface RAGPanelProps {
  profile: Profile;
  onProfileUpdate?: (profile: Profile) => void;
}

export default function RAGPanel({ profile, onProfileUpdate }: RAGPanelProps) {
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

  const getIndexStatusChip = () => {
    const statusConfig = {
      none: { label: 'Non indexé', color: 'default' as const, icon: undefined },
      pending: { label: 'En attente', color: 'warning' as const, icon: <HourglassIcon /> },
      processing: { label: 'Indexation...', color: 'info' as const, icon: <CircularProgress size={16} /> },
      ready: { label: 'Prêt', color: 'success' as const, icon: <CheckCircleIcon /> },
      stale: { label: 'À mettre à jour', color: 'warning' as const, icon: <RefreshIcon /> },
      error: { label: 'Erreur', color: 'error' as const, icon: <ErrorIcon /> },
    };

    const config = statusConfig[profile.indexStatus];
    return <Chip label={config.label} color={config.color} size="small" icon={config.icon} />;
  };

  if (!profile.ragEnabled) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Le RAG n'est pas activé pour ce profil. Activez-le dans les paramètres du profil pour gérer des ressources.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6">Base de connaissance</Typography>
          {getIndexStatusChip()}
        </Box>
        <Button
          variant="contained"
          component="label"
          startIcon={<UploadIcon />}
          disabled={uploading}
          size="small"
        >
          {uploading ? 'Upload...' : 'Ajouter fichiers'}
          <input
            type="file"
            hidden
            multiple
            onChange={handleFileUpload}
            accept=".txt,.md,.json,.csv"
          />
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Indexing progress */}
      {indexingJob && (indexingJob.status === 'processing' || indexingJob.status === 'pending') && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>
            Indexation en cours... {indexingJob.progress}%
          </Typography>
          <LinearProgress variant="determinate" value={indexingJob.progress} />
          <Typography variant="caption" color="text.secondary">
            {indexingJob.processedSteps} / {indexingJob.totalSteps} ressources traitées
          </Typography>
        </Box>
      )}

      {indexingJob && indexingJob.status === 'failed' && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Erreur d'indexation : {indexingJob.error}
        </Alert>
      )}

      {/* Resources list */}
      <Typography variant="subtitle2" gutterBottom>
        Fichiers ({resources.length})
      </Typography>

      {resources.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          Aucun fichier. Ajoutez des fichiers pour créer une base de connaissance.
        </Typography>
      ) : (
        <List dense>
          {resources.map((resource) => (
            <ListItem key={resource.id} divider>
              <ListItemText
                primary={resource.originalName || 'Sans nom'}
                secondary={`${resource.type} • ${Math.round((resource.sizeBytes || 0) / 1024)} KB • ${
                  resource.indexed ? 'Indexé' : 'Non indexé'
                }`}
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  aria-label="delete"
                  onClick={() => handleDeleteResource(resource.id)}
                  size="small"
                >
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}

      {/* Index button */}
      {resources.length > 0 && (
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={handleStartIndexing}
            disabled={loading || indexingJob?.status === 'processing' || indexingJob?.status === 'pending'}
            startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
            fullWidth
          >
            {profile.indexStatus === 'none' ? 'Lancer l\'indexation' : 'Réindexer'}
          </Button>
        </Box>
      )}
    </Paper>
  );
}
