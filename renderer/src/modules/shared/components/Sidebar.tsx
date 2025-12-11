// filepath: c:\JetbrainWorkplaces\Intellij\chatbot_maker\renderer\src\modules\shared\components\Sidebar.tsx
import { useState } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Tooltip,
  Divider,
  useTheme,
  alpha,
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import HistoryIcon from '@mui/icons-material/History';
import PersonIcon from '@mui/icons-material/Person';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useTranslation } from 'react-i18next';
import Logo from './Logo';
import { useThemeMode } from '@/theme/ThemeContext';

export type AppTab = 'chat' | 'profiles' | 'history' | 'settings';

interface SidebarProps {
  currentTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

const SIDEBAR_WIDTH_EXPANDED = 240;
const SIDEBAR_WIDTH_COLLAPSED = 72;

export default function Sidebar({ currentTab, onTabChange }: SidebarProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { mode, toggleTheme } = useThemeMode();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems: Array<{ id: AppTab; label: string; icon: React.ReactNode }> = [
    { id: 'chat', label: t('app.nav.chat'), icon: <ChatIcon /> },
    { id: 'history', label: t('app.nav.history'), icon: <HistoryIcon /> },
    { id: 'profiles', label: 'Profils', icon: <PersonIcon /> },
  ];

  const sidebarWidth = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  return (
    <Box
      component="nav"
      sx={{
        width: sidebarWidth,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        borderRight: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.mode === 'dark'
          ? alpha(theme.palette.grey[900], 0.7)
          : alpha(theme.palette.background.paper, 0.9),
        backdropFilter: 'blur(10px)',
        transition: 'width 0.3s ease-in-out',
        overflow: 'hidden',
      }}
    >
      {/* Logo Section */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          minHeight: 72,
        }}
      >
        <Logo collapsed={collapsed} size="medium" />
        {!collapsed && (
          <IconButton
            size="small"
            onClick={() => setCollapsed(true)}
            sx={{ ml: 1 }}
          >
            <ChevronLeftIcon />
          </IconButton>
        )}
      </Box>

      <Divider sx={{ mx: 2 }} />

      {/* Navigation Items */}
      <List sx={{ flex: 1, py: 2, px: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
            <Tooltip title={collapsed ? item.label : ''} placement="right" arrow>
              <ListItemButton
                selected={currentTab === item.id}
                onClick={() => onTabChange(item.id)}
                sx={{
                  minHeight: 48,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  px: collapsed ? 2 : 2.5,
                  borderRadius: 2,
                  mx: 0.5,
                  ...(currentTab === item.id && {
                    backgroundColor: alpha(theme.palette.primary.main, 0.15),
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 4,
                      height: 24,
                      borderRadius: '0 4px 4px 0',
                      background: `linear-gradient(180deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                    },
                  }),
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: collapsed ? 0 : 40,
                    mr: collapsed ? 0 : 2,
                    color: currentTab === item.id
                      ? theme.palette.primary.main
                      : theme.palette.text.secondary,
                    transition: 'color 0.2s ease',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText
                    primary={item.label}
                    slotProps={{
                      primary: {
                        fontWeight: currentTab === item.id ? 600 : 400,
                        fontSize: '0.9rem',
                      },
                    }}
                  />
                )}
              </ListItemButton>
            </Tooltip>
          </ListItem>
        ))}
      </List>

      {/* Bottom Actions */}
      <Divider sx={{ mx: 2 }} />
      <Box sx={{ p: 1.5 }}>
        {/* Theme Toggle */}
        <Tooltip title={mode === 'dark' ? 'Mode clair' : 'Mode sombre'} placement="right" arrow>
          <ListItemButton
            onClick={toggleTheme}
            sx={{
              minHeight: 44,
              justifyContent: collapsed ? 'center' : 'flex-start',
              px: collapsed ? 2 : 2.5,
              borderRadius: 2,
              mb: 0.5,
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: collapsed ? 0 : 40,
                mr: collapsed ? 0 : 2,
                color: theme.palette.text.secondary,
              }}
            >
              {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </ListItemIcon>
            {!collapsed && (
              <ListItemText
                primary={mode === 'dark' ? 'Mode clair' : 'Mode sombre'}
                slotProps={{
                  primary: { fontSize: '0.85rem' },
                }}
              />
            )}
          </ListItemButton>
        </Tooltip>

        {/* Collapse/Expand Button */}
        {collapsed && (
          <Tooltip title="Agrandir le menu" placement="right" arrow>
            <ListItemButton
              onClick={() => setCollapsed(false)}
              sx={{
                minHeight: 44,
                justifyContent: 'center',
                borderRadius: 2,
              }}
            >
              <ChevronRightIcon />
            </ListItemButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
}

