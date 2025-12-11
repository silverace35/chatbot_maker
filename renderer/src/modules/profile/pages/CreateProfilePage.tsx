import { useState } from 'react';
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
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import StorageIcon from '@mui/icons-material/Storage';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import UploadIcon from '@mui/icons-material/Upload';
import DeleteIcon from '@mui/icons-material/Delete';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { GlassCard } from '@/modules/shared/components';
import { profileService } from '@/services/profile/profile.service';
import { ragService } from '@/services/rag/rag.service';
import type { CreateProfilePayload } from '@/services/profile/profile.service.types';

interface CreateProfilePageProps {
  onProfileCreated: (profileId: string) => void;
  onCancel: () => void;
}

export default function CreateProfilePage({ onProfileCreated, onCancel }: CreateProfilePageProps) {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemContext, setSystemContext] = useState('');
  const [ragEnabled, setRagEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // État pour les fichiers RAG
  const [ragFiles, setRagFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Ajouter les nouveaux fichiers à la liste existante
    setRagFiles(prev => [...prev, ...Array.from(files)]);
    // Reset l'input pour permettre de sélectionner le même fichier à nouveau
    event.target.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setRagFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !systemContext.trim()) return;

    try {
      setLoading(true);
      setError(null);

      const payload: CreateProfilePayload = {
        name: name.trim(),
        description: description.trim() || undefined,
        system_context: systemContext.trim(),
        ragEnabled,
        embeddingModelId: ragEnabled ? 'nomic-embed-text' : undefined,
        ragSettings: ragEnabled ? { topK: 5, similarityThreshold: 0.7 } : undefined,
      };

      // 1. Créer le profil
      const newProfile = await profileService.createProfile(payload);

      // 2. Si RAG activé et fichiers sélectionnés, les uploader
      if (ragEnabled && ragFiles.length > 0) {
        setUploadingFiles(true);
        try {
          await ragService.uploadFiles(newProfile.id, ragFiles);
        } catch (uploadErr) {
          console.error('Error uploading files:', uploadErr);
          // On continue quand même, l'utilisateur pourra ajouter les fichiers plus tard
        }
        setUploadingFiles(false);
      }

      onProfileCreated(newProfile.id);
    } catch (err) {
      console.error('Error creating profile:', err);
      setError('Erreur lors de la création du profil. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = name.trim().length > 0 && systemContext.trim().length > 0 && !loading;

  return (
    <Box
      sx={{
        height: '100%',
        overflow: 'auto',
        p: 3,
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={onCancel}
          sx={{ borderRadius: 2 }}
        >
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
              Créer un nouveau profil
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Configurez un assistant IA personnalisé avec son propre contexte et comportement.
            </Typography>
          </Box>
        </Box>

        {/* Error */}
        {error && (
          <GlassCard sx={{ p: 2, mb: 3, borderColor: theme.palette.error.main }}>
            <Typography color="error">{error}</Typography>
          </GlassCard>
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
                autoFocus
                disabled={loading}
                placeholder="Ex: Assistant Python, Coach sportif, Expert marketing..."
                helperText="Un nom court et descriptif pour identifier facilement ce profil"
                sx={{
                  '& .MuiOutlinedInput-root': { borderRadius: 2 },
                }}
              />

              <TextField
                label="Description (optionnel)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
                disabled={loading}
                placeholder="Ex: Un expert en programmation Python qui aide à résoudre des problèmes de code"
                helperText="Une brève description du rôle de cet assistant"
                sx={{
                  '& .MuiOutlinedInput-root': { borderRadius: 2 },
                }}
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
              Soyez précis et détaillé pour obtenir les meilleurs résultats.
            </Typography>

            <TextField
              value={systemContext}
              onChange={(e) => setSystemContext(e.target.value)}
              required
              fullWidth
              multiline
              rows={8}
              disabled={loading}
              placeholder={`Exemple:
Tu es un expert en programmation Python avec 10 ans d'expérience. 

Tes responsabilités:
- Aider à résoudre des problèmes de code
- Expliquer les concepts de manière claire
- Proposer des solutions optimisées et des bonnes pratiques

Style de communication:
- Toujours fournir des exemples de code commentés
- Être patient et pédagogue
- Poser des questions de clarification si nécessaire`}
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
                  <Typography variant="h6" fontWeight={600}>
                    Base de connaissance (RAG)
                  </Typography>
                  <Switch
                    checked={ragEnabled}
                    onChange={(e) => {
                      setRagEnabled(e.target.checked);
                      if (!e.target.checked) {
                        setRagFiles([]); // Vider les fichiers si RAG désactivé
                      }
                    }}
                    disabled={loading}
                    color="secondary"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Activez cette option pour ajouter des fichiers (documents, FAQ, etc.)
                  qui enrichiront les réponses de l'assistant avec vos propres données.
                </Typography>
              </Box>
            </Box>

            {/* Section Upload de fichiers - visible seulement si RAG activé */}
            {ragEnabled && (
              <Box
                sx={{
                  p: 3,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.secondary.main, 0.05),
                  border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
                }}
              >
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                  Fichiers sources
                </Typography>

                {/* Zone d'upload */}
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
                    disabled={loading}
                  />
                  <UploadIcon
                    sx={{
                      fontSize: 40,
                      color: theme.palette.secondary.main,
                      mb: 1,
                    }}
                  />
                  <Typography variant="body1" fontWeight={500} sx={{ mb: 0.5 }}>
                    Cliquez pour ajouter des fichiers
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Formats supportés : .txt, .md, .json, .csv, .pdf
                  </Typography>
                </Box>

                {/* Liste des fichiers sélectionnés */}
                {ragFiles.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        {ragFiles.length} fichier{ragFiles.length > 1 ? 's' : ''} sélectionné{ragFiles.length > 1 ? 's' : ''}
                      </Typography>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => setRagFiles([])}
                        sx={{ textTransform: 'none' }}
                      >
                        Tout supprimer
                      </Button>
                    </Box>
                    <List sx={{ py: 0 }}>
                      {ragFiles.map((file, index) => (
                        <ListItem
                          key={`${file.name}-${index}`}
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
                                onClick={() => handleRemoveFile(index)}
                                sx={{
                                  color: theme.palette.text.secondary,
                                  '&:hover': {
                                    color: theme.palette.error.main,
                                  },
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
                            <InsertDriveFileIcon
                              sx={{ fontSize: 18, color: theme.palette.secondary.main }}
                            />
                          </Box>
                          <ListItemText
                            primary={
                              <Typography variant="body2" fontWeight={500} noWrap>
                                {file.name}
                              </Typography>
                            }
                            secondary={
                              <Typography variant="caption" color="text.secondary">
                                {formatFileSize(file.size)}
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                {/* Info */}
                <Box
                  sx={{
                    mt: 2,
                    p: 1.5,
                    borderRadius: 1.5,
                    backgroundColor: alpha(theme.palette.info.main, 0.1),
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    💡 Les fichiers seront uploadés lors de la création du profil. Vous pourrez ensuite lancer l'indexation depuis la page "Profils" pour que l'assistant puisse utiliser ces données.
                  </Typography>
                </Box>
              </Box>
            )}
          </GlassCard>

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={onCancel}
              disabled={loading}
              sx={{ borderRadius: 2, px: 4 }}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!canSubmit}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
              sx={{ borderRadius: 2, px: 4 }}
            >
              {uploadingFiles
                ? 'Upload des fichiers...'
                : loading
                  ? 'Création...'
                  : ragEnabled && ragFiles.length > 0
                    ? `Créer avec ${ragFiles.length} fichier${ragFiles.length > 1 ? 's' : ''}`
                    : 'Créer le profil'}
            </Button>
          </Box>
        </form>
      </Box>
    </Box>
  );
}

