import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Switch,
  useTheme,
  alpha,
  CircularProgress,
  Avatar,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
  Alert,
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import StorageIcon from '@mui/icons-material/Storage';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import UploadIcon from '@mui/icons-material/Upload';
import DeleteIcon from '@mui/icons-material/Delete';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { GlassCard, StatusBadge } from '@/modules/shared/components';
import { profileService } from '@/services/profile/profile.service';
import { ragService } from '@/services/rag/rag.service';
import type { Profile, CreateProfilePayload } from '@/services/profile/profile.service.types';
import type { Resource } from '@/types/electron-api';
import { useNotification } from '@/contexts/NotificationContext';

interface EditProfilePageProps {
  profileId: string;
  onSaved: () => void;
  onCancel: () => void;
}

export default function EditProfilePage({ profileId, onSaved, onCancel }: EditProfilePageProps) {
  const theme = useTheme();
  const { showSuccess, showError, showInfo } = useNotification();

  // Profile data
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemContext, setSystemContext] = useState('');
  const [ragEnabled, setRagEnabled] = useState(false);

  // Loading states
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // RAG files
  const [existingResources, setExistingResources] = useState<Resource[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [indexing, setIndexing] = useState(false);

  // Load profile and resources on mount
  useEffect(() => {
    loadProfile();
  }, [profileId]);

  const loadProfile = async () => {
    try {
      setLoadingProfile(true);
      setError(null);

      const loadedProfile = await profileService.getProfile(profileId);
      setProfile(loadedProfile);
      setName(loadedProfile.name);
      setDescription(loadedProfile.description || '');
      setSystemContext(loadedProfile.system_context);
      setRagEnabled(loadedProfile.ragEnabled || false);

      // Load existing resources if RAG is enabled
      if (loadedProfile.ragEnabled) {
        try {
          const resources = await ragService.listResources(profileId);
          setExistingResources(resources);
        } catch (err) {
          console.error('Error loading resources:', err);
        }
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Erreur lors du chargement du profil.');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setNewFiles(prev => [...prev, ...Array.from(files)]);
    event.target.value = '';
  };

  const handleRemoveNewFile = (index: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteExistingResource = async (resourceId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce fichier ?')) return;

    try {
      await ragService.deleteResource(profileId, resourceId);
      setExistingResources(prev => prev.filter(r => r.id !== resourceId));
      showSuccess('Fichier supprimé avec succès');
    } catch (err) {
      console.error('Error deleting resource:', err);
      setError('Erreur lors de la suppression du fichier.');
      showError('Erreur lors de la suppression du fichier');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleStartIndexing = async () => {
    try {
      setIndexing(true);
      showInfo('Indexation en cours...');
      await ragService.startIndexing(profileId);
      const updatedProfile = await profileService.getProfile(profileId);
      setProfile(updatedProfile);
      showSuccess('Indexation terminée avec succès');
    } catch (err) {
      console.error('Error starting indexing:', err);
      setError('Erreur lors du démarrage de l\'indexation.');
      showError('Erreur lors de l\'indexation');
    } finally {
      setIndexing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !systemContext.trim()) return;

    try {
      setSaving(true);
      setError(null);

      const payload: Partial<CreateProfilePayload> = {
        name: name.trim(),
        description: description.trim() || undefined,
        system_context: systemContext.trim(),
        ragEnabled,
        embeddingModelId: ragEnabled ? 'nomic-embed-text' : undefined,
        ragSettings: ragEnabled ? { topK: 5, similarityThreshold: 0.7 } : undefined,
      };

      await profileService.updateProfile(profileId, payload);

      if (ragEnabled && newFiles.length > 0) {
        setUploadingFiles(true);
        try {
          await ragService.uploadFiles(profileId, newFiles);
        } catch (uploadErr) {
          console.error('Error uploading files:', uploadErr);
        }
        setUploadingFiles(false);
      }

      showSuccess(`Le profil "${name.trim()}" a été mis à jour avec succès`);
      onSaved();
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Erreur lors de la mise à jour du profil. Veuillez réessayer.');
      showError('Erreur lors de la mise à jour du profil');
    } finally {
      setSaving(false);
    }
  };

  // Dériver le statut d'index pour l'affichage
  const getIndexStatusBadge = (): 'success' | 'warning' | 'error' | 'default' | 'pending' | 'info' => {
    if (indexing) return 'info';
    if (!profile) return 'default';
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
    if (indexing) return 'Indexation...';
    if (!profile) return 'Non indexé';
    switch (profile.indexStatus) {
      case 'ready': return 'Indexé';
      case 'processing': return 'Indexation...';
      case 'stale': return 'À réindexer';
      case 'error': return 'Erreur';
      case 'pending': return 'En attente';
      default: return 'Non indexé';
    }
  };

  const canSubmit = name.trim().length > 0 && systemContext.trim().length > 0 && !saving;
  const totalFiles = existingResources.length + newFiles.length;

  if (loadingProfile) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Profil non trouvé</Alert>
        <Button onClick={onCancel} sx={{ mt: 2 }}>Retour</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', overflow: 'auto', p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={onCancel} sx={{ borderRadius: 2 }}>
          Retour
        </Button>
      </Box>

      <Box sx={{ maxWidth: 800, mx: 'auto' }}>
        {/* Title Section */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4 }}>
          <Avatar
            sx={{
              width: 72,
              height: 72,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
            }}
          >
            {name ? name.charAt(0).toUpperCase() : <SmartToyIcon sx={{ fontSize: 36 }} />}
          </Avatar>
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Modifier le profil
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Modifiez les paramètres de votre assistant IA.
            </Typography>
          </Box>
        </Box>

        {/* Error */}
        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Basic Info */}
          <GlassCard sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
              Informations générales
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                label="Nom du profil"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                fullWidth
                disabled={saving}
                placeholder="Ex: Assistant Python, Coach sportif..."
                helperText="Un nom court et descriptif pour identifier facilement ce profil"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />

              <TextField
                label="Description (optionnel)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
                disabled={saving}
                placeholder="Ex: Un expert en programmation Python"
                helperText="Une brève description du rôle de cet assistant"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Box>
          </GlassCard>

          {/* System Context */}
          <GlassCard sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
              Contexte système
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Ce texte définit la personnalité, le comportement et les connaissances de base de l'assistant.
            </Typography>

            <TextField
              value={systemContext}
              onChange={(e) => setSystemContext(e.target.value)}
              required
              fullWidth
              multiline
              rows={8}
              disabled={saving}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  fontFamily: '"Fira Code", monospace',
                  fontSize: '0.9rem',
                },
              }}
            />
          </GlassCard>

          {/* RAG Section */}
          <GlassCard sx={{ p: 3, mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: ragEnabled ? 3 : 0 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  backgroundColor: ragEnabled
                    ? alpha(theme.palette.secondary.main, 0.2)
                    : alpha(theme.palette.grey[500], 0.2),
                  transition: 'all 0.3s ease',
                }}
              >
                <StorageIcon
                  sx={{
                    color: ragEnabled ? theme.palette.secondary.main : theme.palette.text.secondary,
                    fontSize: 28,
                  }}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="h6" fontWeight={600}>
                      Base de connaissance (RAG)
                    </Typography>
                    {ragEnabled && profile.ragEnabled && (
                      <StatusBadge
                        status={getIndexStatusBadge()}
                        label={getIndexStatusLabel()}
                        pulse={indexing}
                      />
                    )}
                  </Box>
                  <Switch
                    checked={ragEnabled}
                    onChange={(e) => {
                      setRagEnabled(e.target.checked);
                      if (!e.target.checked) {
                        setNewFiles([]);
                      }
                    }}
                    disabled={saving}
                    color="secondary"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Activez cette option pour ajouter des fichiers qui enrichiront les réponses de l'assistant.
                </Typography>
              </Box>
            </Box>

            {/* RAG Content */}
            {ragEnabled && (
              <Box
                sx={{
                  p: 3,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.secondary.main, 0.05),
                  border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
                }}
              >
                {/* Header with index button */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Fichiers sources ({totalFiles})
                  </Typography>
                  {(existingResources.length > 0 || newFiles.length > 0) && (
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={indexing ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon />}
                      onClick={handleStartIndexing}
                      disabled={indexing || saving}
                      sx={{ borderRadius: 2 }}
                    >
                      {indexing ? 'Indexation...' : 'Indexer'}
                    </Button>
                  )}
                </Box>

                {/* Existing Resources */}
                {existingResources.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                      Fichiers existants
                    </Typography>
                    <List sx={{ py: 0 }}>
                      {existingResources.map((resource) => (
                        <ListItem
                          key={resource.id}
                          sx={{
                            px: 2,
                            py: 1,
                            mb: 0.5,
                            borderRadius: 1.5,
                            backgroundColor: alpha(theme.palette.background.paper, 0.6),
                            border: `1px solid ${theme.palette.divider}`,
                          }}
                          secondaryAction={
                            <Tooltip title="Supprimer">
                              <IconButton
                                edge="end"
                                size="small"
                                onClick={() => handleDeleteExistingResource(resource.id)}
                                sx={{
                                  color: theme.palette.text.secondary,
                                  '&:hover': { color: theme.palette.error.main },
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          }
                        >
                          <Box
                            sx={{
                              mr: 1.5,
                              p: 0.75,
                              borderRadius: 1,
                              backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                              display: 'flex',
                            }}
                          >
                            <InsertDriveFileIcon sx={{ fontSize: 18, color: theme.palette.secondary.main }} />
                          </Box>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" fontWeight={500} noWrap>
                                  {resource.originalName || 'Sans nom'}
                                </Typography>
                                {resource.indexed && (
                                  <CheckCircleIcon sx={{ fontSize: 16, color: theme.palette.success.main }} />
                                )}
                              </Box>
                            }
                            secondary={
                              <Typography variant="caption" color="text.secondary">
                                {resource.type?.toUpperCase()} • {formatFileSize(resource.sizeBytes || 0)}
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                {/* Upload zone */}
                <Box
                  component="label"
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `2px dashed ${alpha(theme.palette.secondary.main, 0.4)}`,
                    borderRadius: 2,
                    p: 3,
                    textAlign: 'center',
                    backgroundColor: alpha(theme.palette.secondary.main, 0.03),
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: theme.palette.secondary.main,
                      backgroundColor: alpha(theme.palette.secondary.main, 0.08),
                    },
                  }}
                >
                  <input
                    type="file"
                    multiple
                    hidden
                    onChange={handleFileSelect}
                    accept=".txt,.md,.json,.csv,.pdf"
                    disabled={saving}
                  />
                  <UploadIcon sx={{ fontSize: 40, color: theme.palette.secondary.main, mb: 1 }} />
                  <Typography variant="body1" fontWeight={500} sx={{ mb: 0.5 }}>
                    Cliquez pour ajouter des fichiers
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Formats supportés : .txt, .md, .json, .csv, .pdf
                  </Typography>
                </Box>

                {/* New files to upload */}
                {newFiles.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Nouveaux fichiers à ajouter ({newFiles.length})
                      </Typography>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => setNewFiles([])}
                        sx={{ textTransform: 'none' }}
                      >
                        Tout supprimer
                      </Button>
                    </Box>
                    <List sx={{ py: 0 }}>
                      {newFiles.map((file, index) => (
                        <ListItem
                          key={`${file.name}-${index}`}
                          sx={{
                            px: 2,
                            py: 1,
                            mb: 0.5,
                            borderRadius: 1.5,
                            backgroundColor: alpha(theme.palette.info.main, 0.1),
                            border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
                          }}
                          secondaryAction={
                            <Tooltip title="Supprimer">
                              <IconButton
                                edge="end"
                                size="small"
                                onClick={() => handleRemoveNewFile(index)}
                                sx={{
                                  color: theme.palette.text.secondary,
                                  '&:hover': { color: theme.palette.error.main },
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          }
                        >
                          <Box
                            sx={{
                              mr: 1.5,
                              p: 0.75,
                              borderRadius: 1,
                              backgroundColor: alpha(theme.palette.info.main, 0.2),
                              display: 'flex',
                            }}
                          >
                            <InsertDriveFileIcon sx={{ fontSize: 18, color: theme.palette.info.main }} />
                          </Box>
                          <ListItemText
                            primary={
                              <Typography variant="body2" fontWeight={500} noWrap>
                                {file.name}
                              </Typography>
                            }
                            secondary={
                              <Typography variant="caption" color="text.secondary">
                                {formatFileSize(file.size)} • Nouveau
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </Box>
            )}
          </GlassCard>

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={onCancel}
              disabled={saving}
              sx={{ borderRadius: 2, px: 4 }}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!canSubmit}
              startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
              sx={{ borderRadius: 2, px: 4 }}
            >
              {uploadingFiles
                ? 'Upload des fichiers...'
                : saving
                  ? 'Enregistrement...'
                  : newFiles.length > 0
                    ? `Enregistrer avec ${newFiles.length} nouveau${newFiles.length > 1 ? 'x' : ''} fichier${newFiles.length > 1 ? 's' : ''}`
                    : 'Enregistrer'}
            </Button>
          </Box>
        </form>
      </Box>
    </Box>
  );
}

