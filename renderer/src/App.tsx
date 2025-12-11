import './App.css'
import { useState } from 'react'
import { Box, useTheme, alpha } from '@mui/material'
import ChatPage from '@/modules/chat/pages/ChatPage'
import ProfilesPage from '@/modules/profile/pages/ProfilesPage'
import HistoryPage from '@/modules/history/pages/HistoryPage'
import Sidebar, { AppTab } from '@/modules/shared/components/Sidebar'
import type { ChatSession } from '@/services/chat/chat.service.types'
import type { Profile } from '@/services/profile/profile.service.types'

function App() {
  const theme = useTheme()
  const [currentTab, setCurrentTab] = useState<AppTab>('chat')
  const [loadedSession, setLoadedSession] = useState<ChatSession | null>(null)
  const [loadedProfile, setLoadedProfile] = useState<Profile | null>(null)

  const handleLoadConversation = (session: ChatSession, profile: Profile) => {
    setLoadedSession(session)
    setLoadedProfile(profile)
    setCurrentTab('chat')
  }

  const handleSessionCleared = () => {
    setLoadedSession(null)
    setLoadedProfile(null)
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
      <Sidebar currentTab={currentTab} onTabChange={setCurrentTab} />

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
          {currentTab === 'chat' && (
            <ChatPage
              loadedSession={loadedSession}
              loadedProfile={loadedProfile}
              onSessionCleared={handleSessionCleared}
            />
          )}
          {currentTab === 'history' && <HistoryPage onLoadConversation={handleLoadConversation} />}
          {currentTab === 'profiles' && <ProfilesPage />}
        </Box>
      </Box>
    </Box>
  )
}

export default App
