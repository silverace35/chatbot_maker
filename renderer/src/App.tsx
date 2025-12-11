import './App.css'
import { useState } from 'react'
import { AppBar, Toolbar, Typography, Box, Tabs, Tab } from '@mui/material'
import { useTranslation } from 'react-i18next'
import ChatPage from '@/modules/chat/pages/ChatPage'
import ProfilesPage from '@/modules/profile/pages/ProfilesPage'
import HistoryPage from '@/modules/history/pages/HistoryPage'
import appConfig from '@/config/appConfig'
import type { ChatSession } from '@/services/chat/chat.service.types'
import type { Profile } from '@/services/profile/profile.service.types'

type AppTab = 'chat' | 'profiles' | 'history'

function App() {
  const { t } = useTranslation()
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
        flexDirection: 'column',
        height: '100vh',
        width: '100%',
      }}
    >
      <AppBar position="static" enableColorOnDark>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {appConfig.name}
          </Typography>
          <Tabs
            value={currentTab}
            onChange={(_, newValue) => setCurrentTab(newValue as AppTab)}
            sx={{
              '& .MuiTab-root': {
                color: 'rgba(255, 255, 255, 0.7)',
                '&.Mui-selected': {
                  color: 'white',
                },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: 'white',
              },
            }}
          >
            <Tab label={t('app.nav.chat')} value="chat" />
            <Tab label={t('app.nav.history')} value="history" />
            <Tab label="Profils" value="profiles" />
          </Tabs>
        </Toolbar>
      </AppBar>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: '100%',
          overflow: 'auto',
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
  )
}

export default App
