import { useState, FormEvent, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Switch,
  Typography,
  Avatar,
  useTheme,
  alpha,
  CircularProgress,
} from '@mui/material'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import StorageIcon from '@mui/icons-material/Storage'
import type { ProfileDialogProps } from './ProfileDialog.types'

export default function ProfileDialog({
  open,
  onClose,
  onSubmit,
  loading = false,
  profile = null,
}: ProfileDialogProps) {
  const theme = useTheme()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [systemContext, setSystemContext] = useState('')
  const [ragEnabled, setRagEnabled] = useState(false)

  // Initialize form with profile data when editing
  useEffect(() => {
    if (profile) {
      setName(profile.name)
      setDescription(profile.description || '')
      setSystemContext(profile.system_context)
      setRagEnabled(profile.ragEnabled || false)
    } else {
      // Reset form when creating new profile
      setName('')
      setDescription('')
      setSystemContext('')
      setRagEnabled(false)
    }
  }, [profile, open])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (name.trim() && systemContext.trim()) {
      onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        system_context: systemContext.trim(),
        ragEnabled,
        embeddingModelId: ragEnabled ? 'nomic-embed-text' : undefined,
        ragSettings: ragEnabled ? { topK: 5, similarityThreshold: 0.7 } : undefined,
      })
      setName('')
      setDescription('')
      setSystemContext('')
      setRagEnabled(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
    }
  }

return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            backgroundColor: theme.palette.background.paper,
          },
        },
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{
                width: 48,
                height: 48,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              }}
            >
              {name ? name.charAt(0).toUpperCase() : <SmartToyIcon />}
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight={600}>
                {profile ? 'Modifier le profil' : 'Nouveau profil'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {profile ? 'Modifiez les paramètres de votre assistant' : 'Créez un nouvel assistant personnalisé'}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="Nom du profil"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
              autoFocus
              disabled={loading}
              placeholder="Ex: Assistant Python, Coach sportif..."
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
            <TextField
              label="Description (optionnel)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              disabled={loading}
              placeholder="Ex: Expert en programmation Python"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
            <TextField
              label="Contexte système"
              value={systemContext}
              onChange={(e) => setSystemContext(e.target.value)}
              required
              fullWidth
              multiline
              rows={5}
              disabled={loading}
              placeholder="Ex: Tu es un expert Python. Réponds toujours en donnant des exemples de code clairs et commentés."
              helperText="Ce texte définit le comportement et la personnalité de l'assistant"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
            
            {/* RAG Section */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                backgroundColor: ragEnabled
                  ? alpha(theme.palette.secondary.main, 0.1)
                  : alpha(theme.palette.grey[500], 0.1),
                border: `1px solid ${ragEnabled 
                  ? alpha(theme.palette.secondary.main, 0.3)
                  : theme.palette.divider}`,
                transition: 'all 0.2s ease',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1.5,
                    backgroundColor: ragEnabled
                      ? alpha(theme.palette.secondary.main, 0.2)
                      : alpha(theme.palette.grey[500], 0.2),
                  }}
                >
                  <StorageIcon
                    sx={{
                      color: ragEnabled ? theme.palette.secondary.main : theme.palette.text.secondary,
                      fontSize: 24,
                    }}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      Base de connaissance (RAG)
                    </Typography>
                    <Switch
                      checked={ragEnabled}
                      onChange={(e) => setRagEnabled(e.target.checked)}
                      disabled={loading}
                      color="secondary"
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Permet d'ajouter des fichiers pour enrichir les réponses de l'assistant avec vos propres données.
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1.5 }}>
          <Button
            onClick={handleClose}
            disabled={loading}
            sx={{ borderRadius: 2, px: 3 }}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !name.trim() || !systemContext.trim()}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{ borderRadius: 2, px: 3 }}
          >
            {profile ? 'Enregistrer' : 'Créer le profil'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
