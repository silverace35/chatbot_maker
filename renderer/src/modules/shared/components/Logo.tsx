// filepath: c:\JetbrainWorkplaces\Intellij\chatbot_maker\renderer\src\modules\shared\components\Logo.tsx
import { Box, Typography, useTheme, alpha } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';

interface LogoProps {
  collapsed?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export default function Logo({ collapsed = false, size = 'medium' }: LogoProps) {
  const theme = useTheme();

  const sizes = {
    small: { icon: 24, text: 'h6' as const },
    medium: { icon: 32, text: 'h5' as const },
    large: { icon: 48, text: 'h4' as const },
  };

  const { icon: iconSize, text: textVariant } = sizes[size];

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: collapsed ? 0 : 1.5,
        py: 1,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: iconSize + 16,
          height: iconSize + 16,
          borderRadius: 2,
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
        }}
      >
        <SmartToyIcon
          sx={{
            fontSize: iconSize,
            color: '#FFFFFF',
          }}
        />
      </Box>
      {!collapsed && (
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography
            variant={textVariant}
            sx={{
              fontWeight: 700,
              background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.secondary.light} 100%)`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}
          >
            ChatBot
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: theme.palette.text.secondary,
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontSize: '0.65rem',
            }}
          >
            Maker
          </Typography>
        </Box>
      )}
    </Box>
  );
}

