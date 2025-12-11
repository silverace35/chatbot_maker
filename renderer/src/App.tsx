import './App.css'
import { useState } from 'react'
import { Box, useTheme, alpha } from '@mui/material'
import ChatPage from '@/modules/chat/pages/ChatPage'
import ProfilesPage from '@/modules/profile/pages/ProfilesPage'
import HistoryPage from '@/modules/history/pages/HistoryPage'
import CreateProfilePage from '@/modules/profile/pages/CreateProfilePage'
import EditProfilePage from '@/modules/profile/pages/EditProfilePage'
import Sidebar, { AppTab } from '@/modules/shared/components/Sidebar'
import type { ChatSession } from '@/services/chat/chat.service.types'
import type { Profile } from '@/services/profile/profile.service.types'

function App() {
  const theme = useTheme()
  const [currentTab, setCurrentTab] = useState<AppTab>('chat')
  const [loadedSession, setLoadedSession] = useState<ChatSession | null>(null)
  const [loadedProfile, setLoadedProfile] = useState<Profile | null>(null)
  const [showCreateProfile, setShowCreateProfile] = useState(false)
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null)
  // Clé pour forcer un nouveau chat
  const [chatKey, setChatKey] = useState(0)
  // Clé pour forcer le refresh de la page profils
  const [profilesKey, setProfilesKey] = useState(0)

  const handleLoadConversation = (session: ChatSession, profile: Profile) => {
    setLoadedSession(session)
    setLoadedProfile(profile)
    setCurrentTab('chat')
  }

  const handleSessionCleared = () => {
    setLoadedSession(null)
    setLoadedProfile(null)
  }

  const handleCreateProfile = () => {
    setShowCreateProfile(true)
  }

  const handleEditProfile = (profileId: string) => {
    setEditingProfileId(profileId)
  }

  const handleProfileCreated = (profileId: string) => {
    setShowCreateProfile(false)
    setProfilesKey(prev => prev + 1)
    // Ouvrir le chat avec le nouveau profil
    setChatKey(prev => prev + 1)
    setCurrentTab('chat')
  }

  const handleProfileSaved = () => {
    setEditingProfileId(null)
    setProfilesKey(prev => prev + 1)
  }

  const handleCancelCreateProfile = () => {
    setShowCreateProfile(false)
  }

  const handleCancelEditProfile = () => {
    setEditingProfileId(null)
  }

  // Gérer le changement d'onglet sans reset le chat
  const handleTabChange = (tab: AppTab) => {
    setCurrentTab(tab)
  }

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        backgroundColor: theme.palette.background.default,
      }}
    >
      {/* Sidebar Navigation */}
      <Sidebar currentTab={currentTab} onTabChange={handleTabChange} />

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflow: 'hidden',
          position: 'relative',
          // Subtle gradient background
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: theme.palette.mode === 'dark'
              ? `radial-gradient(ellipse at top right, ${alpha(theme.palette.primary.dark, 0.15)} 0%, transparent 50%),
                 radial-gradient(ellipse at bottom left, ${alpha(theme.palette.secondary.dark, 0.1)} 0%, transparent 50%)`
              : `radial-gradient(ellipse at top right, ${alpha(theme.palette.primary.light, 0.08)} 0%, transparent 50%),
                 radial-gradient(ellipse at bottom left, ${alpha(theme.palette.secondary.light, 0.05)} 0%, transparent 50%)`,
            pointerEvents: 'none',
            zIndex: 0,
          },
        }}
      >
        <Box
          sx={{
            flex: 1,
            position: 'relative',
            zIndex: 1,
            overflow: 'hidden',
          }}
        >
          {/* Page de création de profil */}
          {showCreateProfile ? (
            <CreateProfilePage
              onProfileCreated={handleProfileCreated}
              onCancel={handleCancelCreateProfile}
            />
          ) : editingProfileId ? (
            /* Page d'édition de profil */
            <EditProfilePage
              profileId={editingProfileId}
              onSaved={handleProfileSaved}
              onCancel={handleCancelEditProfile}
            />
          ) : (
            <>
              {/* Chat - toujours monté pour préserver l'état */}
              <Box sx={{
                display: currentTab === 'chat' ? 'flex' : 'none',
                flexDirection: 'column',
                height: '100%',
              }}>
                <ChatPage
                  key={chatKey}
                  loadedSession={loadedSession}
                  loadedProfile={loadedProfile}
                  onSessionCleared={handleSessionCleared}
                  onCreateProfile={handleCreateProfile}
                />
              </Box>

              {/* History */}
              <Box sx={{
                display: currentTab === 'history' ? 'block' : 'none',
                height: '100%',
              }}>
                <HistoryPage onLoadConversation={handleLoadConversation} />
              </Box>

              {/* Profiles */}
              <Box sx={{
                display: currentTab === 'profiles' ? 'block' : 'none',
                height: '100%',
              }}>
                <ProfilesPage
                  key={profilesKey}
                  onCreateProfile={handleCreateProfile}
                  onEditProfile={handleEditProfile}
                />
              </Box>
            </>
          )}
        </Box>
      </Box>
    </Box>
  )
}

export default App
