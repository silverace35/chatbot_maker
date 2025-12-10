import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme from './theme'
import { BrowserRouter } from 'react-router-dom'
import './i18n'

const container = document.getElementById('root')

if (!container) {
  throw new Error('Root element #root not found')
}

createRoot(container).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
