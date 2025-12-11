import { useState, useEffect } from 'react'
import { Box, Typography, CircularProgress, Alert, Paper } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { chatService } from '@/services/chat/chat.service'
import { profileService } from '@/services/profile/profile.service'
import type { ChatSession } from '@/services/chat/chat.service.types'
import type { Profile } from '@/services/profile/profile.service.types'
import ConversationList from '../components/ConversationList'

interface HistoryPageProps {
  onLoadConversation?: (session: ChatSession, profile: Profile) => void
}

export default function HistoryPage({ onLoadConversation }: HistoryPageProps) {
  const { t } = useTranslation()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Load both sessions and profiles in parallel
      const [loadedSessions, loadedProfiles] = await Promise.all([
        chatService.listSessions(),
        profileService.listProfiles(),
      ])

      setSessions(loadedSessions)
      setProfiles(loadedProfiles)
    } catch (err) {
      console.error('Error loading history:', err)
      setError('Erreur lors du chargement de l\'historique. Vérifiez que le backend est démarré.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoadConversation = (session: ChatSession) => {
    const profile = profiles.find((p) => p.id === session.profileId)
    if (profile && onLoadConversation) {
      onLoadConversation(session, profile)
    }
  }

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Chargement de l'historique...
        </Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
      }}
    >
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="h5" component="h1" gutterBottom>
          {t('history.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {sessions.length === 0
            ? t('history.emptyStateDescription')
            : `${sessions.length} conversation${sessions.length > 1 ? 's' : ''}`}
        </Typography>
      </Paper>

      {/* Conversation List */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}>
        {sessions.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 2,
            }}
          >
            <Typography variant="h6" color="text.secondary">
              {t('history.emptyState')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('history.emptyStateDescription')}
            </Typography>
          </Box>
        ) : (
          <ConversationList
            sessions={sessions}
            profiles={profiles}
            onLoadConversation={handleLoadConversation}
          />
        )}
      </Box>
    </Box>
  )
}
