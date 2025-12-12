import React, { useState, useEffect } from 'react';
import { Box, Typography, IconButton, useTheme, alpha } from '@mui/material';
import RemoveIcon from '@mui/icons-material/Remove';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import FilterNoneIcon from '@mui/icons-material/FilterNone';
import CloseIcon from '@mui/icons-material/Close';

declare global {
  interface Window {
    windowApi?: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      isMaximized: () => Promise<boolean>;
      onStateChange: (callback: (state: { isMaximized: boolean }) => void) => void;
    };
  }
}

export default function TitleBar() {
  const theme = useTheme();
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Récupérer l'état initial
    if (window.windowApi?.isMaximized) {
      window.windowApi.isMaximized().then(setIsMaximized);
    }

    // Écouter les changements d'état
    if (window.windowApi?.onStateChange) {
      window.windowApi.onStateChange((state) => {
        setIsMaximized(state.isMaximized);
      });
    }
  }, []);

  const handleMinimize = () => {
    window.windowApi?.minimize();
  };

  const handleMaximize = () => {
    window.windowApi?.maximize();
  };

  const handleClose = () => {
    window.windowApi?.close();
  };

  const buttonSx = {
    borderRadius: 0,
    width: 46,
    height: '100%',
    color: theme.palette.text.secondary,
    transition: 'all 0.15s ease',
    '&:hover': {
      backgroundColor: alpha(theme.palette.text.primary, 0.08),
      color: theme.palette.text.primary,
    },
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 36,
        backgroundColor: theme.palette.mode === 'dark'
          ? alpha(theme.palette.background.paper, 0.6)
          : alpha(theme.palette.background.paper, 0.9),
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
        // Zone draggable pour déplacer la fenêtre
        WebkitAppRegion: 'drag',
        userSelect: 'none',
        position: 'relative',
        zIndex: 9999,
      }}
      component="header"
    >
      {/* App Name - Left side */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          pl: 2,
          height: '100%',
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            fontSize: '0.8rem',
            letterSpacing: '0.02em',
            color: theme.palette.text.secondary,
          }}
        >
          ChatBot Maker
        </Typography>
      </Box>

      {/* Window Controls - Right side */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          height: '100%',
          // Désactiver le drag sur les boutons
          WebkitAppRegion: 'no-drag',
        }}
      >
        {/* Minimize */}
        <IconButton
          onClick={handleMinimize}
          sx={buttonSx}
          disableRipple
          aria-label="Réduire"
        >
          <RemoveIcon sx={{ fontSize: 18 }} />
        </IconButton>

        {/* Maximize/Restore */}
        <IconButton
          onClick={handleMaximize}
          sx={buttonSx}
          disableRipple
          aria-label={isMaximized ? "Restaurer" : "Agrandir"}
        >
          {isMaximized ? (
            <FilterNoneIcon sx={{ fontSize: 14, transform: 'rotate(180deg)' }} />
          ) : (
            <CropSquareIcon sx={{ fontSize: 15 }} />
          )}
        </IconButton>

        {/* Close */}
        <IconButton
          onClick={handleClose}
          sx={{
            ...buttonSx,
            '&:hover': {
              backgroundColor: theme.palette.error.main,
              color: '#fff',
            },
          }}
          disableRipple
          aria-label="Fermer"
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>
    </Box>
  );
}

