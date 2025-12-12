import { useState, useEffect, useRef, useCallback } from 'react'
import { Box, Typography, CircularProgress, Alert, useTheme, alpha, IconButton, Tooltip } from '@mui/material'
import HistoryIcon from '@mui/icons-material/History'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useTranslation } from 'react-i18next'
import { chatService } from '@/services/chat/chat.service'
import { profileService } from '@/services/profile/profile.service'
import type { ChatSession } from '@/services/chat/chat.service.types'
import type { Profile } from '@/services/profile/profile.service.types'
import ConversationList from '../components/ConversationList'
import { EmptyState } from '@/modules/shared/components'

interface HistoryPageProps {
  onLoadConversation?: (session: ChatSession, profile: Profile) => void
}

export default function HistoryPage({ onLoadConversation }: HistoryPageProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  const loadData = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) {
        setIsLoading(true)
      }
      setError(null)

      // Load both sessions and profiles in parallel
      const [loadedSessions, loadedProfiles] = await Promise.all([
        chatService.listSessions(),
        profileService.listProfiles(),
      ])

      if (isMountedRef.current) {
        setSessions(loadedSessions)
        setProfiles(loadedProfiles)
      }
    } catch (err) {
      console.error('Error loading history:', err)
      if (isMountedRef.current) {
        setError(t('history.error'))
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [t])

  // Chargement initial et polling
  useEffect(() => {
    isMountedRef.current = true
    loadData(true)

    // Polling toutes les 3 secondes pour mettre à jour l'historique
    pollingRef.current = setInterval(() => {
      if (isMountedRef.current) {
        loadData(false) // Sans afficher le loading
      }
    }, 3000)

    return () => {
      isMountedRef.current = false
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [loadData])

  const handleRefresh = () => {
    loadData(true)
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
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary">
          {t('history.loading')}
        </Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{ borderRadius: 2 }}
        >
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
      <Box
        sx={{
          p: 3,
          borderBottom: `1px solid ${theme.palette.divider}`,
          backgroundColor: alpha(theme.palette.background.paper, 0.5),
          backdropFilter: 'blur(10px)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.2)} 0%, ${alpha(theme.palette.secondary.main, 0.2)} 100%)`,
            }}
          >
            <HistoryIcon sx={{ color: theme.palette.primary.main }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" fontWeight={700}>
              {t('history.title')}
            </Typography>
          </Box>
          <Tooltip title={t('history.refresh') || 'Rafraîchir'}>
            <IconButton onClick={handleRefresh} disabled={isLoading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {sessions.length === 0
            ? t('history.emptyStateDescription')
            : t('history.conversationsCount', { count: sessions.length })}
        </Typography>
      </Box>

      {/* Conversation List */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}>
        {sessions.length === 0 ? (
          <EmptyState
            icon={<HistoryIcon />}
            title={t('history.emptyState')}
            description={t('history.emptyStateDescription')}
          />
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
