import './App.css'
import { useState } from 'react'
import { AppBar, Toolbar, Typography, Box, Tabs, Tab } from '@mui/material'
import { useTranslation } from 'react-i18next'
import ChatPage from '@/modules/chat/pages/ChatPage'
import ProfilesPage from '@/modules/profile/pages/ProfilesPage'
import appConfig from '@/config/appConfig'

type AppTab = 'chat' | 'profiles'

function App() {
  const { t } = useTranslation()
  const [currentTab, setCurrentTab] = useState<AppTab>('chat')

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
        {currentTab === 'chat' ? <ChatPage /> : <ProfilesPage />}
      </Box>
    </Box>
  )
}

export default App
