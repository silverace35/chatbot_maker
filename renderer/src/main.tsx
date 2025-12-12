import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ThemeProvider } from './theme/ThemeContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { ConfirmationProvider } from './contexts/ConfirmationContext'
import { BrowserRouter } from 'react-router-dom'
import './i18n'

const container = document.getElementById('root')

if (!container) {
  throw new Error('Root element #root not found')
}

createRoot(container).render(
  <StrictMode>
    <ThemeProvider>
      <NotificationProvider>
        <ConfirmationProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ConfirmationProvider>
      </NotificationProvider>
    </ThemeProvider>
  </StrictMode>,
)
