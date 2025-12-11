import { Box } from '@mui/material'
import type { ChatSession } from '@/services/chat/chat.service.types'
import type { Profile } from '@/services/profile/profile.service.types'
import ConversationItem from './ConversationItem'

interface ConversationListProps {
  sessions: ChatSession[]
  profiles: Profile[]
  onLoadConversation: (session: ChatSession) => void
}

export default function ConversationList({
  sessions,
  profiles,
  onLoadConversation,
}: ConversationListProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      {sessions.map((session) => {
        const profile = profiles.find((p) => p.id === session.profileId)
        return (
          <ConversationItem
            key={session.id}
            session={session}
            profile={profile}
            onLoad={() => onLoadConversation(session)}
          />
        )
      })}
    </Box>
  )
}
