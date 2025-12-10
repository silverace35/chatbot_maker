import type {
  Profile,
  CreateProfilePayload,
  UpdateProfilePayload,
  ListProfilesResponse,
} from './profile.service.types'

/**
 * Service pour gérer les profils de chat
 * Wrapper autour de window.api.profile
 */
export const profileService = {
  /**
   * Liste tous les profils disponibles
   * @returns Liste des profils
   */
  async listProfiles(): Promise<Profile[]> {
    if (!window.api?.profile?.list) {
      throw new Error('Profile API not available')
    }
    const response: ListProfilesResponse = await window.api.profile.list()
    return response.profiles
  },

  /**
   * Crée un nouveau profil
   * @param data - Données du profil (name, description, system_context)
   * @returns Profil créé avec son ID
   */
  async createProfile(data: CreateProfilePayload): Promise<Profile> {
    if (!window.api?.profile?.create) {
      throw new Error('Profile API not available')
    }
    return window.api.profile.create(data)
  },

  /**
   * Récupère un profil par son ID
   * @param id - ID du profil
   * @returns Profil demandé
   */
  async getProfile(id: string): Promise<Profile> {
    if (!window.api?.profile?.get) {
      throw new Error('Profile API not available')
    }
    return window.api.profile.get(id)
  },

  /**
   * Met à jour un profil
   * @param id - ID du profil
   * @param data - Données à mettre à jour
   * @returns Profil mis à jour
   */
  async updateProfile(id: string, data: UpdateProfilePayload): Promise<Profile> {
    if (!window.api?.profile?.update) {
      throw new Error('Profile API not available')
    }
    return window.api.profile.update(id, data)
  },
}
