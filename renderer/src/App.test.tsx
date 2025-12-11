import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from './App'
import './i18n'

describe('App tabs', () => {
  it('affiche les onglets de navigation', () => {
    render(<App />)
    expect(screen.getByText(/Chat/i)).toBeInTheDocument()
    expect(screen.getByText(/Historique/i)).toBeInTheDocument()
    expect(screen.getByText(/Profils/i)).toBeInTheDocument()
  })

  it('permet de changer d’onglet', () => {
    render(<App />)
    const historyTab = screen.getByText(/Historique/i)
    fireEvent.click(historyTab)
    // On pourrait ajouter ici une vérification plus précise sur le contenu de la page Historique
  })
})

