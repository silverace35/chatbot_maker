import type { CreateProfilePayload, Profile } from '@/types/electron-api'

export interface ProfileDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: CreateProfilePayload) => void
  loading?: boolean
  profile?: Profile | null
}
