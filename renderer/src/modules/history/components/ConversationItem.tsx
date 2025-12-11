import { Card, CardContent, CardActionArea, Typography, Box, Chip } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { ChatSession, ChatMessage } from '@/services/chat/chat.service.types'
import type { Profile } from '@/services/profile/profile.service.types'

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

function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ConversationItem({ session, profile, onLoad }: ConversationItemProps) {
  const { t } = useTranslation()
  const lastMessage = getLastMessage(session.messages)
  const messageCount = session.messages.length

  return (
    <Card
      sx={{
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: 4,
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardActionArea onClick={onLoad}>
        <CardContent>
          {/* Profile Info */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" component="div">
                {profile?.name || 'Profil inconnu'}
              </Typography>
              {profile?.ragEnabled && (
                <Chip
                  label="RAG"
                  size="small"
                  color={profile.indexStatus === 'ready' ? 'success' : 'default'}
                  sx={{ height: 20 }}
                />
              )}
            </Box>
            <Chip
              label={t('history.messagesCount', { count: messageCount })}
              size="small"
              variant="outlined"
            />
          </Box>

          {/* Profile Description */}
          {profile?.system_context && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: 'block',
                mb: 1.5,
                fontStyle: 'italic',
              }}
            >
              {truncateText(profile.system_context, 80)}
            </Typography>
          )}

          {/* Last Message */}
          {lastMessage && (
            <Box
              sx={{
                bgcolor: 'grey.50',
                p: 1.5,
                borderRadius: 1,
                borderLeft: 3,
                borderColor: lastMessage.role === 'user' ? 'primary.main' : 'secondary.main',
                mb: 1.5,
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                {t('history.lastMessage')} ({lastMessage.role === 'user' ? 'Vous' : profile?.name || 'Assistant'})
              </Typography>
              <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                {truncateText(lastMessage.content, 150)}
              </Typography>
            </Box>
          )}

          {/* Timestamps */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {t('history.createdAt')}: {formatDate(session.createdAt)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('history.updatedAt')}: {formatDate(session.updatedAt)}
            </Typography>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}
