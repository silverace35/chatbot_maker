import { useEffect, useRef, useState } from 'react'
import { Box, Typography, Avatar, Fab, useTheme, alpha, IconButton, Tooltip } from '@mui/material'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import PersonIcon from '@mui/icons-material/Person'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckIcon from '@mui/icons-material/Check'
import ReactMarkdown from 'react-markdown'
import type { ChatMessagesProps } from './ChatMessages.types'

export default function ChatMessages({ messages, isLoading, assistantName }: ChatMessagesProps) {
  const theme = useTheme()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const scrollToBottom = () => {
    const el = containerRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }

  const handleScroll = () => {
    const el = containerRef.current
    if (!el) return
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100
    setShowScrollButton(!isNearBottom)
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages.length])

  const handleCopy = async (content: string, index: number) => {
    await navigator.clipboard.writeText(content)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Box
      ref={containerRef}
      onScroll={handleScroll}
      sx={{
        flex: 1,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {/* Empty State */}
      {messages.length === 0 && !isLoading && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 4,
            textAlign: 'center',
            width: '100%',
            maxWidth: 500,
          }}
        >
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.2)} 0%, ${alpha(theme.palette.secondary.main, 0.2)} 100%)`,
              mb: 3,
            }}
          >
            <SmartToyIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />
          </Box>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Commencez une conversation
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
            Posez une question ou démarrez une discussion avec votre assistant IA personnalisé.
          </Typography>
        </Box>
      )}

      {/* Messages */}
      <Box sx={{ flex: 1, py: 2 }}>
        {messages.map((message, index) => {
          const isUser = message.role === 'user'
          const isSystem = message.role === 'system'

          return (
            <Box
              key={index}
              sx={{
                py: 2,
                px: { xs: 2, md: 4 },
                backgroundColor: isUser
                  ? 'transparent'
                  : alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.05 : 0.03),
                borderBottom: `1px solid ${theme.palette.divider}`,
                animation: 'fadeIn 0.3s ease-out',
                '@keyframes fadeIn': {
                  from: { opacity: 0, transform: 'translateY(10px)' },
                  to: { opacity: 1, transform: 'translateY(0)' },
                },
              }}
            >
              <Box
                sx={{
                  maxWidth: 800,
                  mx: 'auto',
                  display: 'flex',
                  gap: 2,
                  alignItems: 'flex-start',
                }}
              >
                {/* Avatar */}
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    flexShrink: 0,
                    background: isUser
                      ? `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.dark} 100%)`
                      : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    boxShadow: `0 2px 8px ${alpha(isUser ? theme.palette.secondary.main : theme.palette.primary.main, 0.3)}`,
                  }}
                >
                  {isUser ? <PersonIcon sx={{ fontSize: 20 }} /> : <SmartToyIcon sx={{ fontSize: 20 }} />}
                </Avatar>

                {/* Message Content */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {/* Header */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {isUser ? 'Vous' : (assistantName || 'Assistant')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatTime(message.timestamp)}
                    </Typography>
                  </Box>

                  {/* Content */}
                  <Box
                    sx={{
                      '& p': { m: 0, mb: 1.5, '&:last-child': { mb: 0 } },
                      '& pre': {
                        backgroundColor: theme.palette.mode === 'dark'
                          ? alpha(theme.palette.grey[900], 0.5)
                          : theme.palette.grey[100],
                        borderRadius: 2,
                        p: 2,
                        overflow: 'auto',
                        fontSize: '0.875rem',
                        border: `1px solid ${theme.palette.divider}`,
                      },
                      '& code': {
                        backgroundColor: theme.palette.mode === 'dark'
                          ? alpha(theme.palette.grey[800], 0.5)
                          : theme.palette.grey[100],
                        borderRadius: 1,
                        px: 0.75,
                        py: 0.25,
                        fontSize: '0.875em',
                        fontFamily: '"Fira Code", "Consolas", monospace',
                      },
                      '& pre code': {
                        backgroundColor: 'transparent',
                        p: 0,
                      },
                      '& ul, & ol': { pl: 3, my: 1 },
                      '& li': { mb: 0.5 },
                      '& a': {
                        color: theme.palette.primary.main,
                        textDecoration: 'none',
                        '&:hover': { textDecoration: 'underline' },
                      },
                      '& blockquote': {
                        borderLeft: `3px solid ${theme.palette.primary.main}`,
                        pl: 2,
                        ml: 0,
                        color: theme.palette.text.secondary,
                        fontStyle: 'italic',
                      },
                    }}
                  >
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </Box>

                  {/* Actions */}
                  {!isUser && !isSystem && (
                    <Box sx={{ mt: 1, display: 'flex', gap: 0.5 }}>
                      <Tooltip title={copiedIndex === index ? 'Copié!' : 'Copier'}>
                        <IconButton
                          size="small"
                          onClick={() => handleCopy(message.content, index)}
                          sx={{
                            opacity: 0.5,
                            '&:hover': { opacity: 1 },
                          }}
                        >
                          {copiedIndex === index ? (
                            <CheckIcon sx={{ fontSize: 16, color: theme.palette.success.main }} />
                          ) : (
                            <ContentCopyIcon sx={{ fontSize: 16 }} />
                          )}
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          )
        })}

        {/* Typing Indicator */}
        {isLoading && (
          <Box
            sx={{
              py: 2,
              px: { xs: 2, md: 4 },
              backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.05 : 0.03),
            }}
          >
            <Box
              sx={{
                maxWidth: 800,
                mx: 'auto',
                display: 'flex',
                gap: 2,
                alignItems: 'flex-start',
              }}
            >
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                }}
              >
                <SmartToyIcon sx={{ fontSize: 20 }} />
              </Avatar>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, py: 1 }}>
                {[0, 1, 2].map((i) => (
                  <Box
                    key={i}
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: theme.palette.primary.main,
                      animation: 'bounce 1.4s infinite ease-in-out',
                      animationDelay: `${i * 0.16}s`,
                      '@keyframes bounce': {
                        '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: 0.4 },
                        '40%': { transform: 'scale(1)', opacity: 1 },
                      },
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        )}
      </Box>

      {/* Scroll to Bottom Button */}
      {showScrollButton && (
        <Fab
          size="small"
          onClick={scrollToBottom}
          sx={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            boxShadow: theme.shadows[4],
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
            },
          }}
        >
          <KeyboardArrowDownIcon />
        </Fab>
      )}
    </Box>
  )
}
