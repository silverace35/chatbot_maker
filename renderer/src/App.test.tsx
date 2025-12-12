import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ThemeProvider } from './theme/ThemeContext'
import { NotificationProvider } from '@/contexts'
import { ConfirmationProvider } from '@/contexts'
import './i18n'

// Wrapper avec tous les providers nécessaires
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider>
      <NotificationProvider>
        <ConfirmationProvider>
          <BrowserRouter>
            {ui}
          </BrowserRouter>
        </ConfirmationProvider>
      </NotificationProvider>
    </ThemeProvider>
  )
}

describe('App tabs', () => {
  it('affiche les onglets de navigation', () => {
    renderWithProviders(<App />)
    // Utiliser getByRole pour cibler les éléments de navigation dans la sidebar
    const navigation = screen.getByRole('navigation')
    expect(navigation).toBeInTheDocument()
    // Vérifier que les onglets existent dans la liste de navigation
    expect(screen.getByRole('button', { name: /chat/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /historique/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /profils/i })).toBeInTheDocument()
  })

  it('permet de changer d\'onglet', () => {
    renderWithProviders(<App />)
    const historyTab = screen.getByRole('button', { name: /historique/i })
    fireEvent.click(historyTab)
    // On pourrait ajouter ici une vérification plus précise sur le contenu de la page Historique
  })
})
