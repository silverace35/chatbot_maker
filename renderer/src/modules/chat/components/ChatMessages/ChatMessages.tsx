import { useEffect, useRef } from 'react'
import { Box, Paper, Typography, CircularProgress, Fab } from '@mui/material'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import ReactMarkdown from 'react-markdown'
import type { ChatMessagesProps } from './ChatMessages.types'

export default function ChatMessages({ messages, isLoading, assistantName }: ChatMessagesProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  const scrollToBottom = () => {
    const el = containerRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }

  // Toujours forcer la vue tout en bas à chaque changement de messages
  useEffect(() => {
    scrollToBottom()
  }, [messages.length])

  const getRoleLabel = (role: string) => {
    if (role === 'user') return 'Vous'
    if (role === 'assistant') return assistantName || 'Assistant'
    return 'Système'
  }

  return (
    <Box
      ref={containerRef}
      sx={{
        flex: 1,
        overflow: 'auto',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        position: 'relative',
      }}
    >
      {messages.length === 0 && !isLoading && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
          }}
        >
          <Typography variant="body1" color="text.secondary">
            Aucun message pour le moment. Commencez une conversation!
          </Typography>
        </Box>
      )}

      {messages.map((message, index) => (
        <Box
          key={index}
          sx={{
            display: 'flex',
            justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
            mb: 1,
          }}
        >
          <Paper
            elevation={1}
            sx={{
              p: 2,
              maxWidth: '70%',
              backgroundColor:
                message.role === 'user'
                  ? 'primary.main'
                  : message.role === 'system'
                  ? 'grey.200'
                  : 'background.paper',
              color: message.role === 'user' ? 'primary.contrastText' : 'text.primary',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mb: 0.5,
                opacity: 0.7,
                fontWeight: 'bold',
              }}
            >
              {getRoleLabel(message.role)}
            </Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </Typography>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mt: 0.5,
                opacity: 0.6,
              }}
            >
              {new Date(message.timestamp).toLocaleTimeString()}
            </Typography>
          </Paper>
        </Box>
      ))}

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      <Fab
        color="primary"
        size="small"
        onClick={scrollToBottom}
        sx={{
          position: 'fixed',
          bottom: 80,
          right: 24,
          zIndex: 1300,
        }}
      >
        <KeyboardArrowDownIcon />
      </Fab>
    </Box>
  )
}
