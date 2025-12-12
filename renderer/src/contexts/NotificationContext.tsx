import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  Snackbar,
  Alert,
  AlertColor,
  Slide,
  SlideProps,
  Box,
  Typography,
  IconButton,
  useTheme,
  alpha,
  LinearProgress,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';

interface Notification {
  id: number;
  message: string;
  severity: AlertColor;
  duration: number;
}

interface NotificationContextType {
  showNotification: (message: string, severity?: AlertColor, duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="left" />;
}

let notificationId = 0;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((message: string, severity: AlertColor = 'info', duration = 4000) => {
    const id = ++notificationId;
    setNotifications((prev) => [...prev, { id, message, severity, duration }]);
  }, []);

  const showSuccess = useCallback((message: string, duration?: number) => {
    showNotification(message, 'success', duration ?? 3000);
  }, [showNotification]);

  const showError = useCallback((message: string, duration?: number) => {
    showNotification(message, 'error', duration ?? 5000);
  }, [showNotification]);

  const showWarning = useCallback((message: string, duration?: number) => {
    showNotification(message, 'warning', duration ?? 4000);
  }, [showNotification]);

  const showInfo = useCallback((message: string, duration?: number) => {
    showNotification(message, 'info', duration ?? 3000);
  }, [showNotification]);

  const handleClose = useCallback((id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const getIconAndColor = (severity: AlertColor) => {
    const iconSx = { fontSize: 22 };
    switch (severity) {
      case 'success':
        return {
          icon: <CheckCircleIcon sx={iconSx} />,
          color: theme.palette.success.main,
          bgColor: theme.palette.mode === 'dark'
            ? alpha(theme.palette.success.main, 0.15)
            : alpha(theme.palette.success.light, 0.2),
        };
      case 'error':
        return {
          icon: <ErrorIcon sx={iconSx} />,
          color: theme.palette.error.main,
          bgColor: theme.palette.mode === 'dark'
            ? alpha(theme.palette.error.main, 0.15)
            : alpha(theme.palette.error.light, 0.2),
        };
      case 'warning':
        return {
          icon: <WarningIcon sx={iconSx} />,
          color: theme.palette.warning.main,
          bgColor: theme.palette.mode === 'dark'
            ? alpha(theme.palette.warning.main, 0.15)
            : alpha(theme.palette.warning.light, 0.2),
        };
      case 'info':
      default:
        return {
          icon: <InfoIcon sx={iconSx} />,
          color: theme.palette.info.main,
          bgColor: theme.palette.mode === 'dark'
            ? alpha(theme.palette.info.main, 0.15)
            : alpha(theme.palette.info.light, 0.2),
        };
    }
  };

  return (
    <NotificationContext.Provider value={{ showNotification, showSuccess, showError, showWarning, showInfo }}>
      {children}
      {notifications.map((notification, index) => {
        const config = getIconAndColor(notification.severity);
        return (
          <Snackbar
            key={notification.id}
            open={true}
            autoHideDuration={notification.duration}
            onClose={() => handleClose(notification.id)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            slots={{ transition: SlideTransition }}
            sx={{
              bottom: { xs: 16 + index * 80, sm: 24 + index * 80 },
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.5,
                minWidth: 320,
                maxWidth: 420,
                p: 1.5,
                pr: 1,
                borderRadius: 1.5,
                background: theme.palette.mode === 'dark'
                  ? alpha(theme.palette.background.paper, 0.95)
                  : theme.palette.background.paper,
                backdropFilter: 'blur(12px)',
                border: `1px solid ${alpha(config.color, 0.2)}`,
                boxShadow: theme.palette.mode === 'dark'
                  ? `0 8px 32px ${alpha('#000', 0.4)}, 0 0 0 1px ${alpha(config.color, 0.1)}`
                  : `0 8px 32px ${alpha('#000', 0.12)}, 0 0 0 1px ${alpha(config.color, 0.1)}`,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Left accent bar */}
              <Box
                sx={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 6,
                  background: `linear-gradient(180deg, ${config.color}, ${alpha(config.color, 0.6)})`,
                  borderRadius: '3px 0 0 3px',
                }}
              />

              {/* Icon */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 36,
                  height: 36,
                  borderRadius: 1,
                  backgroundColor: config.bgColor,
                  color: config.color,
                  flexShrink: 0,
                  ml: 0.5,
                }}
              >
                {config.icon}
              </Box>

              {/* Content */}
              <Box sx={{ flex: 1, minWidth: 0, py: 0.25 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                    color: theme.palette.text.primary,
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                  }}
                >
                  {notification.message}
                </Typography>
              </Box>

              {/* Close button */}
              <IconButton
                size="small"
                onClick={() => handleClose(notification.id)}
                sx={{
                  color: theme.palette.text.secondary,
                  opacity: 0.7,
                  '&:hover': {
                    opacity: 1,
                    backgroundColor: alpha(theme.palette.text.secondary, 0.1),
                  },
                }}
              >
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>

              {/* Progress bar */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    height: '100%',
                    backgroundColor: alpha(config.color, 0.3),
                    animation: `shrink ${notification.duration}ms linear forwards`,
                    '@keyframes shrink': {
                      '0%': { width: '100%' },
                      '100%': { width: '0%' },
                    },
                  }}
                />
              </Box>
            </Box>
          </Snackbar>
        );
      })}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}

