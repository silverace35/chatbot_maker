// filepath: c:\JetbrainWorkplaces\Intellij\chatbot_maker\renderer\src\theme\index.ts
import { createTheme, alpha, PaletteMode } from '@mui/material/styles';

// Design tokens
export const tokens = {
  colors: {
    // Primary - Indigo/Violet gradient feel
    primary: {
      main: '#6366F1',
      light: '#818CF8',
      dark: '#4F46E5',
      contrast: '#FFFFFF',
    },
    // Secondary - Teal/Cyan accent
    secondary: {
      main: '#14B8A6',
      light: '#2DD4BF',
      dark: '#0D9488',
      contrast: '#FFFFFF',
    },
    // Neutral grays
    grey: {
      50: '#F8FAFC',
      100: '#F1F5F9',
      200: '#E2E8F0',
      300: '#CBD5E1',
      400: '#94A3B8',
      500: '#64748B',
      600: '#475569',
      700: '#334155',
      800: '#1E293B',
      900: '#0F172A',
      950: '#020617',
    },
    // Semantic colors
    success: {
      main: '#10B981',
      light: '#34D399',
      dark: '#059669',
    },
    warning: {
      main: '#F59E0B',
      light: '#FBBF24',
      dark: '#D97706',
    },
    error: {
      main: '#EF4444',
      light: '#F87171',
      dark: '#DC2626',
    },
    info: {
      main: '#3B82F6',
      light: '#60A5FA',
      dark: '#2563EB',
    },
  },
  borderRadius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    glow: '0 0 20px rgba(99, 102, 241, 0.3)',
    glowSecondary: '0 0 20px rgba(20, 184, 166, 0.3)',
  },
};

// Create theme based on mode
export const createAppTheme = (mode: PaletteMode = 'dark') => {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: tokens.colors.primary.main,
        light: tokens.colors.primary.light,
        dark: tokens.colors.primary.dark,
        contrastText: tokens.colors.primary.contrast,
      },
      secondary: {
        main: tokens.colors.secondary.main,
        light: tokens.colors.secondary.light,
        dark: tokens.colors.secondary.dark,
        contrastText: tokens.colors.secondary.contrast,
      },
      success: tokens.colors.success,
      warning: tokens.colors.warning,
      error: tokens.colors.error,
      info: tokens.colors.info,
      grey: tokens.colors.grey,
      background: {
        default: isDark ? tokens.colors.grey[950] : tokens.colors.grey[50],
        paper: isDark ? tokens.colors.grey[900] : '#FFFFFF',
      },
      text: {
        primary: isDark ? tokens.colors.grey[100] : tokens.colors.grey[900],
        secondary: isDark ? tokens.colors.grey[400] : tokens.colors.grey[600],
      },
      divider: isDark ? alpha(tokens.colors.grey[700], 0.5) : tokens.colors.grey[200],
    },
    typography: {
      fontFamily: '"Inter", "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontWeight: 700,
        fontSize: '2.5rem',
        lineHeight: 1.2,
        letterSpacing: '-0.02em',
      },
      h2: {
        fontWeight: 700,
        fontSize: '2rem',
        lineHeight: 1.3,
        letterSpacing: '-0.01em',
      },
      h3: {
        fontWeight: 600,
        fontSize: '1.5rem',
        lineHeight: 1.4,
      },
      h4: {
        fontWeight: 600,
        fontSize: '1.25rem',
        lineHeight: 1.4,
      },
      h5: {
        fontWeight: 600,
        fontSize: '1.125rem',
        lineHeight: 1.5,
      },
      h6: {
        fontWeight: 600,
        fontSize: '1rem',
        lineHeight: 1.5,
      },
      body1: {
        fontSize: '1rem',
        lineHeight: 1.6,
      },
      body2: {
        fontSize: '0.875rem',
        lineHeight: 1.6,
      },
      caption: {
        fontSize: '0.75rem',
        lineHeight: 1.5,
        color: tokens.colors.grey[500],
      },
      button: {
        fontWeight: 600,
        textTransform: 'none',
        letterSpacing: '0.01em',
      },
    },
    shape: {
      borderRadius: tokens.borderRadius.md,
    },
    shadows: [
      'none',
      tokens.shadows.sm,
      tokens.shadows.sm,
      tokens.shadows.md,
      tokens.shadows.md,
      tokens.shadows.md,
      tokens.shadows.lg,
      tokens.shadows.lg,
      tokens.shadows.lg,
      tokens.shadows.lg,
      tokens.shadows.xl,
      tokens.shadows.xl,
      tokens.shadows.xl,
      tokens.shadows.xl,
      tokens.shadows.xl,
      tokens.shadows.xl,
      tokens.shadows.xl,
      tokens.shadows.xl,
      tokens.shadows.xl,
      tokens.shadows.xl,
      tokens.shadows.xl,
      tokens.shadows.xl,
      tokens.shadows.xl,
      tokens.shadows.xl,
      tokens.shadows.xl,
    ],
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarWidth: 'thin',
            scrollbarColor: isDark
              ? `${tokens.colors.grey[700]} ${tokens.colors.grey[900]}`
              : `${tokens.colors.grey[300]} ${tokens.colors.grey[100]}`,
            '&::-webkit-scrollbar': {
              width: 8,
              height: 8,
            },
            '&::-webkit-scrollbar-track': {
              background: isDark ? tokens.colors.grey[900] : tokens.colors.grey[100],
            },
            '&::-webkit-scrollbar-thumb': {
              background: isDark ? tokens.colors.grey[700] : tokens.colors.grey[300],
              borderRadius: 4,
              '&:hover': {
                background: isDark ? tokens.colors.grey[600] : tokens.colors.grey[400],
              },
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: tokens.borderRadius.md,
            padding: '10px 20px',
            fontWeight: 600,
            transition: 'all 0.2s ease-in-out',
          },
          contained: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: tokens.shadows.md,
              transform: 'translateY(-1px)',
            },
          },
          containedPrimary: {
            background: `linear-gradient(135deg, ${tokens.colors.primary.main} 0%, ${tokens.colors.primary.dark} 100%)`,
            '&:hover': {
              background: `linear-gradient(135deg, ${tokens.colors.primary.light} 0%, ${tokens.colors.primary.main} 100%)`,
            },
          },
          outlined: {
            borderWidth: 2,
            '&:hover': {
              borderWidth: 2,
              backgroundColor: alpha(tokens.colors.primary.main, 0.08),
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderRadius: tokens.borderRadius.lg,
          },
          elevation1: {
            boxShadow: tokens.shadows.sm,
          },
          elevation2: {
            boxShadow: tokens.shadows.md,
          },
          elevation3: {
            boxShadow: tokens.shadows.lg,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: tokens.borderRadius.lg,
            border: `1px solid ${isDark ? tokens.colors.grey[800] : tokens.colors.grey[200]}`,
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              borderColor: tokens.colors.primary.main,
              boxShadow: tokens.shadows.lg,
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: tokens.borderRadius.md,
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: tokens.colors.primary.light,
                },
              },
              '&.Mui-focused': {
                '& .MuiOutlinedInput-notchedOutline': {
                  borderWidth: 2,
                  borderColor: tokens.colors.primary.main,
                },
              },
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: tokens.borderRadius.sm,
            fontWeight: 500,
          },
          filled: {
            '&.MuiChip-colorPrimary': {
              background: `linear-gradient(135deg, ${tokens.colors.primary.main} 0%, ${tokens.colors.primary.dark} 100%)`,
            },
            '&.MuiChip-colorSecondary': {
              background: `linear-gradient(135deg, ${tokens.colors.secondary.main} 0%, ${tokens.colors.secondary.dark} 100%)`,
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: tokens.borderRadius.xl,
            border: `1px solid ${isDark ? tokens.colors.grey[800] : tokens.colors.grey[200]}`,
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: tokens.borderRadius.md,
            margin: '2px 8px',
            transition: 'all 0.15s ease-in-out',
            '&.Mui-selected': {
              backgroundColor: alpha(tokens.colors.primary.main, isDark ? 0.2 : 0.12),
              '&:hover': {
                backgroundColor: alpha(tokens.colors.primary.main, isDark ? 0.25 : 0.16),
              },
            },
            '&:hover': {
              backgroundColor: alpha(tokens.colors.primary.main, isDark ? 0.1 : 0.08),
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: tokens.borderRadius.md,
            transition: 'all 0.15s ease-in-out',
            '&:hover': {
              backgroundColor: alpha(tokens.colors.primary.main, 0.1),
            },
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: isDark ? tokens.colors.grey[800] : tokens.colors.grey[900],
            borderRadius: tokens.borderRadius.sm,
            fontSize: '0.75rem',
            padding: '8px 12px',
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: tokens.borderRadius.md,
          },
          standardError: {
            backgroundColor: alpha(tokens.colors.error.main, 0.1),
            color: isDark ? tokens.colors.error.light : tokens.colors.error.dark,
          },
          standardSuccess: {
            backgroundColor: alpha(tokens.colors.success.main, 0.1),
            color: isDark ? tokens.colors.success.light : tokens.colors.success.dark,
          },
          standardWarning: {
            backgroundColor: alpha(tokens.colors.warning.main, 0.1),
            color: isDark ? tokens.colors.warning.dark : tokens.colors.warning.dark,
          },
          standardInfo: {
            backgroundColor: alpha(tokens.colors.info.main, 0.1),
            color: isDark ? tokens.colors.info.light : tokens.colors.info.dark,
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            height: 3,
            borderRadius: '3px 3px 0 0',
            background: `linear-gradient(90deg, ${tokens.colors.primary.main} 0%, ${tokens.colors.secondary.main} 100%)`,
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            fontWeight: 600,
            textTransform: 'none',
            minHeight: 48,
          },
        },
      },
      MuiFab: {
        styleOverrides: {
          root: {
            boxShadow: tokens.shadows.lg,
          },
          primary: {
            background: `linear-gradient(135deg, ${tokens.colors.primary.main} 0%, ${tokens.colors.primary.dark} 100%)`,
            '&:hover': {
              background: `linear-gradient(135deg, ${tokens.colors.primary.light} 0%, ${tokens.colors.primary.main} 100%)`,
            },
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: tokens.borderRadius.full,
            height: 6,
          },
          bar: {
            borderRadius: tokens.borderRadius.full,
            background: `linear-gradient(90deg, ${tokens.colors.primary.main} 0%, ${tokens.colors.secondary.main} 100%)`,
          },
        },
      },
      MuiCircularProgress: {
        styleOverrides: {
          root: {
            color: tokens.colors.primary.main,
          },
        },
      },
    },
  });
};

// Default dark theme
const theme = createAppTheme('dark');

export default theme;

