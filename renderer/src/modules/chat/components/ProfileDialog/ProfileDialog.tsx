import { useState, FormEvent, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  FormControlLabel,
  Checkbox,
  Typography,
  Divider,
} from '@mui/material'
import type { ProfileDialogProps } from './ProfileDialog.types'

export default function ProfileDialog({
  open,
  onClose,
  onSubmit,
  loading = false,
  profile = null,
}: ProfileDialogProps) {
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
        // Utiliser directement le modèle d'embedding Ollama par défaut
        // (doit correspondre à EMBEDDING_MODEL côté backend, ex: nomic-embed-text)
        embeddingModelId: ragEnabled ? 'nomic-embed-text' : undefined,
        ragSettings: ragEnabled ? { topK: 5, similarityThreshold: 0.7 } : undefined,
      })
      // Reset form
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
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{profile ? 'Modifier le profil' : 'Créer un nouveau profil'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Nom du profil"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
              autoFocus
              disabled={loading}
              placeholder="Ex: Assistant Python, Coach sportif..."
            />
            <TextField
              label="Description (optionnel)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              disabled={loading}
              placeholder="Ex: Expert en programmation Python"
            />
            <TextField
              label="Contexte système"
              value={systemContext}
              onChange={(e) => setSystemContext(e.target.value)}
              required
              fullWidth
              multiline
              rows={4}
              disabled={loading}
              placeholder="Ex: Tu es un expert Python. Réponds toujours en donnant des exemples de code clairs et commentés."
              helperText="Ce texte définit le comportement et la personnalité de l'assistant"
            />
            
            <Divider />
            
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                RAG (Retrieval Augmented Generation)
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={ragEnabled}
                    onChange={(e) => setRagEnabled(e.target.checked)}
                    disabled={loading}
                  />
                }
                label="Activer la base de connaissance"
              />
              <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                Permet d'ajouter des fichiers pour enrichir les réponses de l'assistant
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !name.trim() || !systemContext.trim()}
          >
            {profile ? 'Enregistrer' : 'Créer'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
