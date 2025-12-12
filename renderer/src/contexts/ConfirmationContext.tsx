import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  useTheme,
  alpha,
  Fade,
  IconButton,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CloseIcon from '@mui/icons-material/Close';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';

type ConfirmationType = 'warning' | 'danger' | 'info' | 'question';

interface ConfirmationOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmationType;
}

interface ConfirmationContextType {
  confirm: (options: ConfirmationOptions) => Promise<boolean>;
  confirmDelete: (itemName: string, details?: string) => Promise<boolean>;
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined);

export function ConfirmationProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmationOptions | null>(null);
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmationOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions(opts);
      setResolvePromise(() => resolve);
      setOpen(true);
    });
  }, []);

  const confirmDelete = useCallback((itemName: string, details?: string): Promise<boolean> => {
    const message = details
      ? `${details}`
      : 'Cette action est irréversible.';

    return confirm({
      title: `Supprimer "${itemName}" ?`,
      message,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      type: 'danger',
    });
  }, [confirm]);

  const handleClose = useCallback((confirmed: boolean) => {
    setOpen(false);
    if (resolvePromise) {
      resolvePromise(confirmed);
    }
    setTimeout(() => {
      setOptions(null);
      setResolvePromise(null);
    }, 300);
  }, [resolvePromise]);

  const getIconConfig = () => {
    const baseIconSx = { fontSize: 32, color: '#fff' };
    switch (options?.type) {
      case 'danger':
        return {
          icon: <DeleteForeverIcon sx={baseIconSx} />,
          bgColor: theme.palette.error.main,
          bgGradient: `linear-gradient(135deg, ${theme.palette.error.main}, ${theme.palette.error.dark})`,
        };
      case 'warning':
        return {
          icon: <WarningAmberIcon sx={baseIconSx} />,
          bgColor: theme.palette.warning.main,
          bgGradient: `linear-gradient(135deg, ${theme.palette.warning.main}, ${theme.palette.warning.dark})`,
        };
      case 'info':
        return {
          icon: <InfoOutlinedIcon sx={baseIconSx} />,
          bgColor: theme.palette.info.main,
          bgGradient: `linear-gradient(135deg, ${theme.palette.info.main}, ${theme.palette.info.dark})`,
        };
      case 'question':
      default:
        return {
          icon: <HelpOutlineIcon sx={baseIconSx} />,
          bgColor: theme.palette.primary.main,
          bgGradient: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
        };
    }
  };

  const getConfirmButtonColor = (): 'error' | 'warning' | 'primary' | 'info' => {
    switch (options?.type) {
      case 'danger':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'primary';
    }
  };

  const iconConfig = getIconConfig();

  return (
    <ConfirmationContext.Provider value={{ confirm, confirmDelete }}>
      {children}
      <Dialog
        open={open}
        onClose={() => handleClose(false)}
        maxWidth="xs"
        fullWidth
        slots={{ transition: Fade }}
        transitionDuration={200}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2,
              overflow: 'visible',
              background: theme.palette.mode === 'dark'
                ? alpha(theme.palette.background.paper, 0.95)
                : theme.palette.background.paper,
              backdropFilter: 'blur(20px)',
              border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
              boxShadow: theme.palette.mode === 'dark'
                ? `0 24px 48px ${alpha('#000', 0.5)}, 0 0 0 1px ${alpha('#fff', 0.05)}`
                : `0 24px 48px ${alpha('#000', 0.2)}`,
            },
          },
          backdrop: {
            sx: {
              backgroundColor: alpha('#000', 0.6),
              backdropFilter: 'blur(8px)',
            },
          },
        }}
      >
        {/* Close button */}
        <IconButton
          onClick={() => handleClose(false)}
          sx={{
            position: 'absolute',
            right: 12,
            top: 12,
            color: theme.palette.text.secondary,
            '&:hover': {
              backgroundColor: alpha(theme.palette.text.secondary, 0.1),
            },
          }}
          size="small"
        >
          <CloseIcon fontSize="small" />
        </IconButton>

        {/* Icon header */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            pt: 4,
            pb: 2,
          }}
        >
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: iconConfig.bgGradient,
              boxShadow: `0 8px 24px ${alpha(iconConfig.bgColor, 0.4)}`,
              animation: 'pulse 2s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': {
                  transform: 'scale(1)',
                  boxShadow: `0 8px 24px ${alpha(iconConfig.bgColor, 0.4)}`,
                },
                '50%': {
                  transform: 'scale(1.05)',
                  boxShadow: `0 12px 32px ${alpha(iconConfig.bgColor, 0.5)}`,
                },
              },
            }}
          >
            {iconConfig.icon}
          </Box>
        </Box>

        {/* Title */}
        <DialogTitle
          sx={{
            textAlign: 'center',
            pt: 1,
            pb: 0.5,
            px: 4,
            fontWeight: 700,
            fontSize: '1.25rem',
            color: theme.palette.text.primary,
          }}
        >
          {options?.title}
        </DialogTitle>

        {/* Content */}
        <DialogContent sx={{ px: 4, pb: 1, pt: 1 }}>
          <Typography
            variant="body2"
            sx={{
              textAlign: 'center',
              color: theme.palette.text.secondary,
              lineHeight: 1.7,
              whiteSpace: 'pre-line',
            }}
          >
            {options?.message}
          </Typography>
        </DialogContent>

        {/* Actions */}
        <DialogActions
          sx={{
            px: 3,
            pb: 3,
            pt: 2,
            gap: 1.5,
            justifyContent: 'center',
            flexDirection: 'column',
          }}
        >
          <Button
            onClick={() => handleClose(true)}
            variant="contained"
            color={getConfirmButtonColor()}
            fullWidth
            disableElevation
            sx={{
              borderRadius: 1.5,
              textTransform: 'none',
              fontWeight: 600,
              py: 1.25,
              fontSize: '0.95rem',
              boxShadow: `0 4px 12px ${alpha(iconConfig.bgColor, 0.3)}`,
              '&:hover': {
                boxShadow: `0 6px 20px ${alpha(iconConfig.bgColor, 0.4)}`,
              },
            }}
          >
            {options?.confirmText || 'Confirmer'}
          </Button>
          <Button
            onClick={() => handleClose(false)}
            variant="text"
            fullWidth
            sx={{
              borderRadius: 1.5,
              textTransform: 'none',
              fontWeight: 500,
              py: 1,
              color: theme.palette.text.secondary,
              '&:hover': {
                backgroundColor: alpha(theme.palette.text.secondary, 0.08),
              },
            }}
          >
            {options?.cancelText || 'Annuler'}
          </Button>
        </DialogActions>
      </Dialog>
    </ConfirmationContext.Provider>
  );
}

export function useConfirmation() {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error('useConfirmation must be used within a ConfirmationProvider');
  }
  return context;
}

