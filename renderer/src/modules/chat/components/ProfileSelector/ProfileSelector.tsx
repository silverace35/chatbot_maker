import {
  Box,
  FormControl,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  Avatar,
  Typography,
  useTheme,
  alpha,
  Chip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import StorageIcon from '@mui/icons-material/Storage'
import type { ProfileSelectorProps } from './ProfileSelector.types'

export default function ProfileSelector({
  profiles,
  selectedProfileId,
  onSelectProfile,
  onCreateProfile,
  loading = false,
}: ProfileSelectorProps) {
  const theme = useTheme()
  const selectedProfile = profiles.find(p => p.id === selectedProfileId)

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        alignItems: 'center',
        p: 2,
        px: { xs: 2, md: 4 },
        borderBottom: `1px solid ${theme.palette.divider}`,
        backgroundColor: alpha(theme.palette.background.paper, 0.5),
        backdropFilter: 'blur(10px)',
      }}
    >
      <FormControl
        sx={{
          minWidth: 280,
          maxWidth: 400,
        }}
        size="small"
        disabled={loading}
      >
        <Select
          id="profile-select"
          value={selectedProfileId || ''}
          displayEmpty
          onChange={(e) => onSelectProfile(e.target.value)}
          renderValue={(selected) => {
            if (!selected) {
              return (
                <Typography color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SmartToyIcon sx={{ fontSize: 20, opacity: 0.5 }} />
                  Sélectionner un profil
                </Typography>
              )
            }
            const profile = profiles.find(p => p.id === selected)
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar
                  sx={{
                    width: 28,
                    height: 28,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                    fontSize: '0.75rem',
                  }}
                >
                  {profile?.name.charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" fontWeight={500}>
                    {profile?.name}
                  </Typography>
                  {profile?.ragEnabled && (
                    <Chip
                      icon={<StorageIcon sx={{ fontSize: '14px !important' }} />}
                      label="RAG"
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.65rem',
                        backgroundColor: alpha(theme.palette.secondary.main, 0.15),
                        color: theme.palette.secondary.main,
                        '& .MuiChip-icon': {
                          color: theme.palette.secondary.main,
                        },
                      }}
                    />
                  )}
                </Box>
              </Box>
            )
          }}
          sx={{
            borderRadius: 2,
            backgroundColor: theme.palette.mode === 'dark'
              ? alpha(theme.palette.grey[800], 0.5)
              : alpha(theme.palette.grey[100], 0.8),
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.palette.divider,
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.palette.primary.main,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.palette.primary.main,
              borderWidth: 2,
            },
          }}
          MenuProps={{
            PaperProps: {
              sx: {
                mt: 1,
                borderRadius: 2,
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: theme.shadows[8],
              },
            },
          }}
        >
          {profiles.length === 0 && (
            <MenuItem value="" disabled>
              <Typography color="text.secondary" variant="body2">
                Aucun profil disponible
              </Typography>
            </MenuItem>
          )}
          {profiles.map((profile) => (
            <MenuItem
              key={profile.id}
              value={profile.id}
              sx={{
                py: 1.5,
                px: 2,
                borderRadius: 1,
                mx: 0.5,
                my: 0.25,
                '&.Mui-selected': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                },
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                    fontSize: '0.8rem',
                  }}
                >
                  {profile.name.charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" fontWeight={500}>
                      {profile.name}
                    </Typography>
                    {profile.ragEnabled && (
                      <Chip
                        label="RAG"
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.6rem',
                          backgroundColor: alpha(theme.palette.secondary.main, 0.15),
                          color: theme.palette.secondary.main,
                        }}
                      />
                    )}
                  </Box>
                  {profile.description && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {profile.description}
                    </Typography>
                  )}
                </Box>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Button
        variant="outlined"
        startIcon={loading ? <CircularProgress size={16} /> : <AddIcon />}
        onClick={onCreateProfile}
        disabled={loading}
        sx={{
          whiteSpace: 'nowrap',
          borderRadius: 2,
          borderWidth: 2,
          px: 2.5,
          '&:hover': {
            borderWidth: 2,
          },
        }}
      >
        Nouveau
      </Button>
    </Box>
  )
}
