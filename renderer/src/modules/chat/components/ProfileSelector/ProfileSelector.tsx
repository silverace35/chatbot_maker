import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import type { ProfileSelectorProps } from './ProfileSelector.types'

export default function ProfileSelector({
  profiles,
  selectedProfileId,
  onSelectProfile,
  onCreateProfile,
  loading = false,
}: ProfileSelectorProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        alignItems: 'center',
        p: 2,
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <FormControl fullWidth size="small" disabled={loading}>
        <InputLabel id="profile-select-label">Profil</InputLabel>
        <Select
          labelId="profile-select-label"
          id="profile-select"
          value={selectedProfileId || ''}
          label="Profil"
          onChange={(e) => onSelectProfile(e.target.value)}
        >
          {profiles.length === 0 && (
            <MenuItem value="" disabled>
              Aucun profil disponible
            </MenuItem>
          )}
          {profiles.map((profile) => (
            <MenuItem key={profile.id} value={profile.id}>
              {profile.name}
              {profile.description && ` - ${profile.description}`}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Button
        variant="outlined"
        startIcon={loading ? <CircularProgress size={16} /> : <AddIcon />}
        onClick={onCreateProfile}
        disabled={loading}
        sx={{ whiteSpace: 'nowrap' }}
      >
        Nouveau profil
      </Button>
    </Box>
  )
}
