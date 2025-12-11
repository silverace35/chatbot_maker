// filepath: c:\JetbrainWorkplaces\Intellij\chatbot_maker\renderer\src\modules\shared\components\GlassCard.tsx
import { Paper, PaperProps, alpha, useTheme } from '@mui/material';
import { forwardRef, ReactNode } from 'react';

interface GlassCardProps extends Omit<PaperProps, 'ref'> {
  children: ReactNode;
  blur?: number;
  opacity?: number;
  gradient?: boolean;
  glow?: boolean;
}

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ children, blur = 10, opacity = 0.7, gradient = false, glow = false, sx, ...props }, ref) => {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    return (
      <Paper
        ref={ref}
        elevation={0}
        sx={{
          backdropFilter: `blur(${blur}px)`,
          backgroundColor: isDark
            ? alpha(theme.palette.grey[900], opacity)
            : alpha(theme.palette.background.paper, opacity),
          border: `1px solid ${isDark 
            ? alpha(theme.palette.grey[700], 0.3)
            : alpha(theme.palette.grey[300], 0.5)}`,
          ...(gradient && {
            background: isDark
              ? `linear-gradient(135deg, ${alpha(theme.palette.grey[900], opacity)} 0%, ${alpha(theme.palette.grey[800], opacity)} 100%)`
              : `linear-gradient(135deg, ${alpha('#FFFFFF', opacity)} 0%, ${alpha(theme.palette.grey[50], opacity)} 100%)`,
          }),
          ...(glow && {
            boxShadow: `0 0 40px ${alpha(theme.palette.primary.main, 0.15)}`,
          }),
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            ...(glow && {
              boxShadow: `0 0 60px ${alpha(theme.palette.primary.main, 0.25)}`,
            }),
          },
          ...sx,
        }}
        {...props}
      >
        {children}
      </Paper>
    );
  }
);

GlassCard.displayName = 'GlassCard';

export default GlassCard;

