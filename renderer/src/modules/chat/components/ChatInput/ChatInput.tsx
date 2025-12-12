import { useState, FormEvent } from 'react'
import { Box, TextField, IconButton, Tooltip, useTheme, alpha, Paper, CircularProgress } from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import type { ChatInputProps } from './ChatInput.types'

export default function ChatInput({
  onSubmit,
  onStop,
  isStreaming = false,
  disabled = false,
  placeholder = 'Tapez votre message...',
}: ChatInputProps) {
  const theme = useTheme()
  const [message, setMessage] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    // Ne rien faire si un stream est en cours
    if (isStreaming || disabled) return

    const trimmed = message.trim()
    if (trimmed) {
      onSubmit(trimmed)
      setMessage('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  // Désactiver l'envoi pendant le streaming ou si disabled
  const canSend = !disabled && !isStreaming && message.trim().length > 0

  return (
    <Box
      sx={{
        p: 2,
        px: { xs: 2, md: 4 },
        backgroundColor: 'transparent',
      }}
    >
      <Paper
        component="form"
        onSubmit={handleSubmit}
        elevation={0}
        sx={{
          maxWidth: 800,
          mx: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 1,
          pl: 2,
          borderRadius: 3,
          minHeight: 56,
          backgroundColor: theme.palette.mode === 'dark'
            ? alpha(theme.palette.grey[800], 0.6)
            : alpha(theme.palette.grey[100], 0.8),
          border: `1px solid ${isFocused 
            ? theme.palette.primary.main 
            : theme.palette.divider}`,
          boxShadow: isFocused
            ? `0 0 0 3px ${alpha(theme.palette.primary.main, 0.15)}`
            : 'none',
          transition: 'all 0.2s ease-in-out',
          backdropFilter: 'blur(10px)',
        }}
      >
        <TextField
          fullWidth
          multiline
          maxRows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={isStreaming ? 'Génération en cours...' : placeholder}
          disabled={disabled || isStreaming}
          variant="standard"
          onKeyDown={handleKeyDown}
          InputProps={{
            disableUnderline: true,
          }}
          sx={{
            '& .MuiInputBase-root': {
              fontSize: '0.95rem',
              lineHeight: 1.5,
              py: 0.5,
            },
            '& .MuiInputBase-input': {
              '&::placeholder': {
                color: theme.palette.text.secondary,
                opacity: 0.7,
              },
            },
          }}
        />

        <Tooltip
          title={isStreaming ? 'Génération en cours...' : (canSend ? 'Envoyer (Entrée)' : 'Tapez un message')}
          placement="top"
        >
          <span>
            <IconButton
              type="submit"
              disabled={!canSend}
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                transition: 'all 0.2s ease-in-out',
                ...(isStreaming ? {
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                } : canSend ? {
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  color: '#FFFFFF',
                  boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.4)}`,
                  '&:hover': {
                    background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
                    transform: 'scale(1.05)',
                    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.5)}`,
                  },
                } : {
                  backgroundColor: 'transparent',
                  color: theme.palette.text.disabled,
                }),
              }}
            >
              {isStreaming ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <SendIcon sx={{ fontSize: 20 }} />
              )}
            </IconButton>
          </span>
        </Tooltip>
      </Paper>

      {/* Helper text */}
      <Box sx={{ maxWidth: 800, mx: 'auto', mt: 1, px: 1 }}>
        <Box
          component="span"
          sx={{
            fontSize: '0.7rem',
            color: theme.palette.text.secondary,
            opacity: 0.6,
          }}
        >
          Appuyez sur Entrée pour envoyer, Maj+Entrée pour une nouvelle ligne
        </Box>
      </Box>
    </Box>
  )
}
