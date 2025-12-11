// filepath: c:\JetbrainWorkplaces\Intellij\chatbot_maker\renderer\src\modules\shared\components\StatusBadge.tsx
import { Chip, ChipProps, alpha, useTheme } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import SyncIcon from '@mui/icons-material/Sync';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

type StatusType = 'success' | 'error' | 'warning' | 'info' | 'pending' | 'default';

interface StatusBadgeProps extends Omit<ChipProps, 'color'> {
  status: StatusType;
  pulse?: boolean;
}

const statusConfig: Record<StatusType, { icon: React.ReactElement; label: string }> = {
  success: { icon: <CheckCircleIcon />, label: 'Ready' },
  error: { icon: <ErrorIcon />, label: 'Error' },
  warning: { icon: <SyncIcon />, label: 'Updating' },
  info: { icon: <SyncIcon />, label: 'Processing' },
  pending: { icon: <HourglassEmptyIcon />, label: 'Pending' },
  default: { icon: <RadioButtonUncheckedIcon />, label: 'Inactive' },
};

export default function StatusBadge({ status, pulse = false, label, ...props }: StatusBadgeProps) {
  const theme = useTheme();
  const config = statusConfig[status];

  const getStatusColor = () => {
    switch (status) {
      case 'success': return theme.palette.success.main;
      case 'error': return theme.palette.error.main;
      case 'warning': return theme.palette.warning.main;
      case 'info': return theme.palette.info.main;
      case 'pending': return theme.palette.grey[500];
      default: return theme.palette.grey[500];
    }
  };

  const color = getStatusColor();

  return (
    <Chip
      icon={config.icon}
      label={label || config.label}
      size="small"
      sx={{
        backgroundColor: alpha(color, 0.15),
        color: color,
        borderColor: alpha(color, 0.3),
        border: `1px solid`,
        fontWeight: 500,
        '& .MuiChip-icon': {
          color: color,
          fontSize: 16,
          ...(pulse && {
            animation: 'pulse 2s infinite',
          }),
        },
        '@keyframes pulse': {
          '0%, 100%': {
            opacity: 1,
          },
          '50%': {
            opacity: 0.5,
          },
        },
        ...props.sx,
      }}
      {...props}
    />
  );
}

