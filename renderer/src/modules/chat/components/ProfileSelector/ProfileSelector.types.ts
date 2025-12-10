import type { Profile } from '@/services/profile/profile.service.types'

export interface ProfileSelectorProps {
  profiles: Profile[]
  selectedProfileId: string | null
  onSelectProfile: (profileId: string) => void
  onCreateProfile: () => void
  loading?: boolean
}
