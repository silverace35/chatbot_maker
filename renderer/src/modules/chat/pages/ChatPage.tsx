import { useState, useEffect, useRef } from 'react'
import { Box, Alert, Typography, Chip, useTheme, alpha, IconButton, Tooltip, Button } from '@mui/material'
import StorageIcon from '@mui/icons-material/Storage'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import AddCommentIcon from '@mui/icons-material/AddComment'
import ChatMessages from '../components/ChatMessages/ChatMessages'
import ChatInput from '../components/ChatInput/ChatInput'
import ProfileSelector from '../components/ProfileSelector/ProfileSelector'
import { chatService } from '@/services/chat/chat.service'
import { profileService } from '@/services/profile/profile.service'
import type { ChatMessage, ChatSession } from '@/services/chat/chat.service.types'
import type { Profile } from '@/services/profile/profile.service.types'
import type { CreateProfileFormData } from './ChatPage.types'
import type { ChatStreamHandle } from '@/services/chat/chat.service'

interface ChatPageProps {
  loadedSession?: ChatSession | null
  loadedProfile?: Profile | null
  onSessionCleared?: () => void
  onCreateProfile?: () => void
}

export default function ChatPage({ loadedSession, loadedProfile, onSessionCleared, onCreateProfile }: ChatPageProps) {
  const theme = useTheme()
  // State
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const streamHandleRef = useRef<ChatStreamHandle | null>(null)

  // Load profiles on mount
  useEffect(() => {
    loadProfiles()
  }, [])

  // Handle loaded session from history
  useEffect(() => {
    if (loadedSession && loadedProfile) {
      // Stop any ongoing stream
      if (streamHandleRef.current) {
        streamHandleRef.current.stop()
        streamHandleRef.current = null
      }
      
      // Load the conversation
      setSelectedProfileId(loadedProfile.id)
      setCurrentSessionId(loadedSession.id)
      setMessages(loadedSession.messages as ChatMessage[])
      setIsLoading(false)
      setIsStreaming(false)
      
      // Clear the loaded session after processing
      if (onSessionCleared) {
        onSessionCleared()
      }
    }
  }, [loadedSession, loadedProfile, onSessionCleared])

  const loadProfiles = async () => {
    try {
      setError(null)
      const loadedProfiles = await profileService.listProfiles()
      setProfiles(loadedProfiles)

      // Auto-select first profile if none selected
      if (!selectedProfileId && loadedProfiles.length > 0) {
        setSelectedProfileId(loadedProfiles[0].id)
      }
    } catch (err) {
      console.error('Error loading profiles:', err)
      setError('Erreur lors du chargement des profils. Vérifiez que le backend est démarré.')
    }
  }

  const handleSelectProfile = (profileId: string) => {
    // Si on change de profil, on reset la conversation
    if (profileId !== selectedProfileId) {
      // Ne pas changer de profil si une génération est en cours
      if (isStreaming || isLoading) {
        setError("Veuillez attendre la fin de la génération avant de changer de profil.")
        return
      }

      setSelectedProfileId(profileId)
      // Reset session when changing profile
      setCurrentSessionId(null)
      setMessages([])
      setError(null)
    }
  }

  const handleNewConversation = () => {
    // Ne pas créer de nouvelle conversation si une génération est en cours
    if (isStreaming || isLoading) {
      setError("Veuillez attendre la fin de la génération.")
      return
    }

    setCurrentSessionId(null)
    setMessages([])
    setError(null)
  }

  const handleSendMessage = async (message: string) => {
    if (!selectedProfileId) {
      setError("Veuillez sélectionner un profil avant d'envoyer un message.")
      return
    }

    // Bloquer si une génération est déjà en cours
    if (isStreaming || isLoading) {
      console.log('[ChatPage] Generation already in progress, ignoring')
      return
    }

    try {
      setIsLoading(true)
      setIsStreaming(true)
      setError(null)

      // Ajouter le message utilisateur temporairement à l'UI
      const tempUserMessage: ChatMessage = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, tempUserMessage])

      const handle = chatService.sendMessageStream(
        {
          sessionId: currentSessionId || undefined,
          profileId: selectedProfileId,
          message,
        },
        (event) => {
          if (event.type === 'chunk') {
            const chunk = event.content ?? ''
            if (!chunk) return

            setMessages((prev) => {
              const last = prev[prev.length - 1]
              if (last && last.role === 'assistant') {
                return [...prev.slice(0, -1), { ...last, content: last.content + chunk }]
              }
              return [...prev, {
                role: 'assistant' as const,
                content: chunk,
                timestamp: new Date().toISOString(),
              }]
            })
          }

          if (event.type === 'done') {
            console.log('[ChatPage] Stream completed')
            if (event.sessionId) {
              setCurrentSessionId(event.sessionId)
            }
            if (event.messages && event.messages.length > 0) {
              setMessages(event.messages as ChatMessage[])
            }
            setIsLoading(false)
            setIsStreaming(false)
            streamHandleRef.current = null
          }

          if (event.type === 'aborted') {
            // Ne devrait plus arriver car on ne permet plus d'arrêter
            console.log('[ChatPage] Stream aborted (unexpected)')
            setIsLoading(false)
            setIsStreaming(false)
            streamHandleRef.current = null
          }

          if (event.type === 'error') {
            const baseError = event.error || "Erreur lors de l'envoi du message."
            setError(
              !currentSessionId
                ? `${baseError} Le modèle local peut être en cours de chargement. Réessayez dans quelques secondes.`
                : baseError,
            )
            setIsLoading(false)
            setIsStreaming(false)
            streamHandleRef.current = null
          }
        },
      )

      streamHandleRef.current = handle
    } catch (err) {
      console.error('Error sending message:', err)
      setError("Erreur lors de l'envoi du message. Vérifiez que le backend est démarré.")
      setMessages((prev) => prev.slice(0, -1))
      setIsLoading(false)
      setIsStreaming(false)
      streamHandleRef.current = null
    }
  }


  const selectedProfile = profiles.find((p) => p.id === selectedProfileId)

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
      }}
    >
      {/* Header with Profile Selector */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${theme.palette.divider}`,
          backgroundColor: alpha(theme.palette.background.paper, 0.6),
          backdropFilter: 'blur(10px)',
          pr: 2,
        }}
      >
        <ProfileSelector
          profiles={profiles}
          selectedProfileId={selectedProfileId}
          onSelectProfile={handleSelectProfile}
          onCreateProfile={onCreateProfile || (() => {})}
          loading={isLoading}
        />

        {/* Bouton Nouveau Chat - toujours visible si un profil est sélectionné */}
        {selectedProfileId && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddCommentIcon />}
            onClick={handleNewConversation}
            disabled={messages.length === 0 && !currentSessionId}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              flexShrink: 0,
            }}
          >
            Nouveau chat
          </Button>
        )}
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{
            m: 2,
            borderRadius: 2,
          }}
        >
          {error}
        </Alert>
      )}

      {/* Profile Info Banner */}
      {selectedProfile && (
        <Box
          sx={{
            mx: { xs: 2, md: 4 },
            mt: 2,
            p: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            borderRadius: 2,
            backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.1 : 0.05),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          }}
        >
          <InfoOutlinedIcon
            sx={{
              color: theme.palette.primary.main,
              fontSize: 20,
            }}
          />
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" fontWeight={500}>
              {selectedProfile.name}
            </Typography>
            {selectedProfile.description && (
              <Typography variant="caption" color="text.secondary">
                {selectedProfile.description}
              </Typography>
            )}
          </Box>
          {selectedProfile.ragEnabled && (
            <Chip
              icon={<StorageIcon sx={{ fontSize: '16px !important' }} />}
              label="Base de connaissance active"
              size="small"
              sx={{
                backgroundColor: alpha(theme.palette.secondary.main, 0.15),
                color: theme.palette.secondary.main,
                fontWeight: 500,
                '& .MuiChip-icon': {
                  color: theme.palette.secondary.main,
                },
              }}
            />
          )}
        </Box>
      )}

      {/* Messages Area */}
      <ChatMessages messages={messages} isLoading={isLoading} assistantName={selectedProfile?.name} />

      {/* Input Area */}
      <ChatInput
        onSubmit={handleSendMessage}
        isStreaming={isStreaming}
        disabled={isLoading || !selectedProfileId}
        placeholder={
          selectedProfileId
            ? 'Posez votre question...'
            : 'Sélectionnez un profil pour commencer'
        }
      />
    </Box>
  )
}
