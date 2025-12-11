import { useState, useEffect, useRef } from 'react'
import { Box, Alert, Typography, Paper } from '@mui/material'
import ChatMessages from '../components/ChatMessages/ChatMessages'
import ChatInput from '../components/ChatInput/ChatInput'
import ProfileSelector from '../components/ProfileSelector/ProfileSelector'
import ProfileDialog from '../components/ProfileDialog/ProfileDialog'
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
}

export default function ChatPage({ loadedSession, loadedProfile, onSessionCleared }: ChatPageProps) {
  // State
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [isCreatingProfile, setIsCreatingProfile] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const streamHandleRef = useRef<ChatStreamHandle | null>(null)
  const streamingGenerationIdRef = useRef<number | null>(null)

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

  const handleCreateProfile = async (data: CreateProfileFormData) => {
    try {
      setIsCreatingProfile(true)
      setError(null)
      const newProfile = await profileService.createProfile(data)
      setProfiles([...profiles, newProfile])
      setSelectedProfileId(newProfile.id)
      setProfileDialogOpen(false)
    } catch (err) {
      console.error('Error creating profile:', err)
      setError('Erreur lors de la création du profil.')
    } finally {
      setIsCreatingProfile(false)
    }
  }

  const handleSelectProfile = (profileId: string) => {
    // Stop any ongoing stream before changing profile
    if (streamHandleRef.current) {
      streamHandleRef.current.stop()
      streamHandleRef.current = null
      setIsStreaming(false)
      setIsLoading(false)
    }
    
    setSelectedProfileId(profileId)
    // Reset session when changing profile
    setCurrentSessionId(null)
    setMessages([])
  }

  const handleSendMessage = async (message: string) => {
    if (!selectedProfileId) {
      setError("Veuillez sélectionner un profil avant d'envoyer un message.")
      return
    }

    try {
      setIsLoading(true)
      setIsStreaming(true)
      setError(null)

      const tempUserMessage: ChatMessage = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, tempUserMessage])

      if (streamHandleRef.current) {
        streamHandleRef.current.stop()
      }

      const generationId = Date.now()
      streamingGenerationIdRef.current = generationId

      const handle = chatService.sendMessageStream(
        {
          sessionId: currentSessionId || undefined,
          profileId: selectedProfileId,
          message,
        },
        (event) => {
          if (streamingGenerationIdRef.current !== generationId) {
            return
          }

          if (event.type === 'chunk') {
            const chunk = event.content ?? ''
            if (!chunk) return

            setMessages((prev) => {
              const last = prev[prev.length - 1]
              if (last && last.role === 'assistant') {
                const updated: ChatMessage = {
                  ...last,
                  content: last.content + chunk,
                }
                return [...prev.slice(0, -1), updated]
              }

              const newAssistant: ChatMessage = {
                role: 'assistant',
                content: chunk,
                timestamp: new Date().toISOString(),
              }
              return [...prev, newAssistant]
            })
          }

          if (event.type === 'done') {
            if (!currentSessionId && event.sessionId) {
              setCurrentSessionId(event.sessionId)
            }
            if (event.messages && event.messages.length > 0) {
              setMessages(event.messages as ChatMessage[])
            }
            setIsLoading(false)
            setIsStreaming(false)
            streamingGenerationIdRef.current = null
            streamHandleRef.current = null
          }

          if (event.type === 'error') {
            const baseError = event.error || "Erreur lors de l'envoi du message."
            const isFirstMessageOfSession = !currentSessionId

            setError(
              isFirstMessageOfSession
                ? `${baseError} Le modèle local peut être en cours de chargement ou indisponible. Réessayez dans quelques secondes.`
                : baseError,
            )
            setIsLoading(false)
            setIsStreaming(false)
            streamingGenerationIdRef.current = null
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

  const handleStopStreaming = () => {
    if (streamHandleRef.current) {
      streamHandleRef.current.stop()
      streamHandleRef.current = null
    }
    streamingGenerationIdRef.current = null
    setIsLoading(false)
    setIsStreaming(false)
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
      {/* Profile Selector */}
      <ProfileSelector
        profiles={profiles}
        selectedProfileId={selectedProfileId}
        onSelectProfile={handleSelectProfile}
        onCreateProfile={() => setProfileDialogOpen(true)}
        loading={isLoading}
      />

      {/* Error Alert */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ m: 2 }}>
          {error}
        </Alert>
      )}

      {/* Selected Profile Info */}
      {selectedProfile && (
        <Paper
          elevation={0}
          sx={{
            mx: 2,
            mt: 2,
            p: 2,
            backgroundColor: 'grey.50',
            borderLeft: 3,
            borderColor: 'primary.main',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" fontWeight="bold">
              Profil actif: {selectedProfile.name}
            </Typography>
            {selectedProfile.ragEnabled && (
              <Typography variant="caption" sx={{ 
                px: 1, 
                py: 0.5, 
                borderRadius: 1, 
                bgcolor: selectedProfile.indexStatus === 'ready' ? 'success.light' : 'warning.light',
                color: selectedProfile.indexStatus === 'ready' ? 'success.dark' : 'warning.dark'
              }}>
                RAG: {selectedProfile.indexStatus === 'ready' ? '✓ Actif' : selectedProfile.indexStatus}
              </Typography>
            )}
          </Box>
          <Typography variant="caption" color="text.secondary">
            {selectedProfile.system_context}
          </Typography>
        </Paper>
      )}

      {/* Messages Area */}
      <ChatMessages messages={messages} isLoading={isLoading} assistantName={selectedProfile?.name} />

      {/* Input Area */}
      <ChatInput
        onSubmit={handleSendMessage}
        onStop={handleStopStreaming}
        isStreaming={isStreaming}
        disabled={isLoading || !selectedProfileId}
        placeholder={
          selectedProfileId
            ? 'Tapez votre message...'
            : 'Sélectionnez un profil pour commencer'
        }
      />

      {/* Profile Creation Dialog */}
      <ProfileDialog
        open={profileDialogOpen}
        onClose={() => setProfileDialogOpen(false)}
        onSubmit={handleCreateProfile}
        loading={isCreatingProfile}
      />
    </Box>
  )
}
