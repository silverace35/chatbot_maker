import { useState, FormEvent } from 'react'
import { Box, TextField, IconButton, Tooltip } from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import StopIcon from '@mui/icons-material/Stop'
import type { ChatInputProps } from './ChatInput.types'

export default function ChatInput({
  onSubmit,
  onStop,
  isStreaming = false,
  disabled = false,
  placeholder = 'Tapez votre message...',
}: ChatInputProps) {
  const [message, setMessage] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (isStreaming) {
      if (onStop) onStop()
      return
    }
    const trimmed = message.trim()
    if (trimmed && !disabled) {
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

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        p: 2,
        borderTop: 1,
        borderColor: 'divider',
        display: 'flex',
        gap: 1,
      }}
    >
      <TextField
        fullWidth
        multiline
        maxRows={4}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={placeholder}
        disabled={disabled && !isStreaming}
        variant="outlined"
        size="small"
        onKeyDown={handleKeyDown}
      />
      <Tooltip title={isStreaming ? 'Arrêter la génération' : 'Envoyer'}>
        <IconButton
          type="submit"
          color={isStreaming ? 'error' : 'primary'}
          disabled={(!isStreaming && (disabled || !message.trim()))}
          sx={{ alignSelf: 'flex-end' }}
        >
          {isStreaming ? <StopIcon /> : <SendIcon />}
        </IconButton>
      </Tooltip>
    </Box>
  )
}
