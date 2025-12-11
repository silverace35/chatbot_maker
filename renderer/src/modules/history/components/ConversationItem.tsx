import { Card, CardContent, CardActionArea, Typography, Box, Avatar, useTheme, alpha } from '@mui/material'
import { useTranslation } from 'react-i18next'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import type { ChatSession, ChatMessage } from '@/services/chat/chat.service.types'
import type { Profile } from '@/services/profile/profile.service.types'
import { StatusBadge } from '@/modules/shared/components'

interface ConversationItemProps {
  session: ChatSession
  profile?: Profile
  onLoad: () => void
}

function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

function getLastMessage(messages: ChatMessage[]): ChatMessage | null {
  if (messages.length === 0) return null
  return messages[messages.length - 1]
}

function formatDate(date: string | Date, locale: string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'À l\'instant'
  if (diffMins < 60) return `Il y a ${diffMins} min`
  if (diffHours < 24) return `Il y a ${diffHours}h`
  if (diffDays < 7) return `Il y a ${diffDays}j`
  return formatDate(d, 'fr-FR')
}

export default function ConversationItem({ session, profile, onLoad }: ConversationItemProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const lastMessage = getLastMessage(session.messages)
  const messageCount = session.messages.length

  return (
    <Card
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.mode === 'dark'
          ? alpha(theme.palette.grey[900], 0.5)
          : theme.palette.background.paper,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          borderColor: theme.palette.primary.main,
          boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.15)}`,
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardActionArea onClick={onLoad}>
        <CardContent sx={{ p: 2.5 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            {/* Avatar */}
            <Avatar
              sx={{
                width: 48,
                height: 48,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                fontSize: '1.1rem',
                fontWeight: 600,
              }}
            >
              {profile?.name?.charAt(0).toUpperCase() || '?'}
            </Avatar>

            {/* Info */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="h6" fontWeight={600} sx={{ lineHeight: 1.3 }}>
                  {profile?.name || 'Profil inconnu'}
                </Typography>
                {profile?.ragEnabled && (
                  <StatusBadge
                    status={profile.indexStatus === 'ready' ? 'success' : 'default'}
                    label="RAG"
                    sx={{ height: 20, fontSize: '0.65rem' }}
                  />
                )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ChatBubbleOutlineIcon sx={{ fontSize: 14, color: theme.palette.text.secondary }} />
                  <Typography variant="caption" color="text.secondary">
                    {t('history.messagesCount', { count: messageCount })}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <AccessTimeIcon sx={{ fontSize: 14, color: theme.palette.text.secondary }} />
                  <Typography variant="caption" color="text.secondary">
                    {formatRelativeTime(session.updatedAt)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Last Message Preview */}
          {lastMessage && (
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                backgroundColor: theme.palette.mode === 'dark'
                  ? alpha(theme.palette.grey[800], 0.5)
                  : alpha(theme.palette.grey[100], 0.8),
                borderLeft: `3px solid ${lastMessage.role === 'user' ? theme.palette.primary.main : theme.palette.secondary.main}`,
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: 'block',
                  mb: 0.5,
                  fontWeight: 500,
                }}
              >
                {lastMessage.role === 'user' ? 'Vous' : (profile?.name || 'Assistant')}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  wordBreak: 'break-word',
                  color: theme.palette.text.primary,
                }}
              >
                {truncateText(lastMessage.content, 150)}
              </Typography>
            </Box>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  )
}
