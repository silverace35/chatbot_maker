import { Box, LinearProgress, Typography, useTheme, alpha, CircularProgress, IconButton, Tooltip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import RefreshIcon from '@mui/icons-material/Refresh';
import type { IndexingJob } from '@/types/electron-api';

interface IndexingProgressProps {
  job: IndexingJob | null;
  isIndexing: boolean;
  progress: number;
  statusMessage: string;
  error?: string | null;
  onRefresh?: () => void;
  compact?: boolean;
}

export default function IndexingProgress({
  job,
  isIndexing,
  progress,
  statusMessage,
  error,
  onRefresh,
  compact = false,
}: IndexingProgressProps) {
  const theme = useTheme();

  // Don't render if no job and not indexing
  if (!job && !isIndexing && !error) {
    return null;
  }

  const isCompleted = job?.status === 'completed';
  const isFailed = job?.status === 'failed' || !!error;
  const isActive = isIndexing || job?.status === 'pending' || job?.status === 'processing';

  // Compact version for inline display
  if (compact) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {isActive && (
          <>
            <CircularProgress size={16} thickness={5} />
            <Typography variant="caption" color="text.secondary">
              {progress}%
            </Typography>
          </>
        )}
        {isCompleted && (
          <CheckCircleIcon sx={{ fontSize: 18, color: theme.palette.success.main }} />
        )}
        {isFailed && (
          <ErrorIcon sx={{ fontSize: 18, color: theme.palette.error.main }} />
        )}
      </Box>
    );
  }

  // Full progress display
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        backgroundColor: isActive
          ? alpha(theme.palette.info.main, 0.1)
          : isFailed
            ? alpha(theme.palette.error.main, 0.1)
            : alpha(theme.palette.success.main, 0.1),
        border: `1px solid ${
          isActive
            ? alpha(theme.palette.info.main, 0.3)
            : isFailed
              ? alpha(theme.palette.error.main, 0.3)
              : alpha(theme.palette.success.main, 0.3)
        }`,
        transition: 'all 0.3s ease',
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: isActive ? 1.5 : 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isActive && (
            <CircularProgress
              size={20}
              thickness={5}
              sx={{ color: theme.palette.info.main }}
            />
          )}
          {isCompleted && (
            <CheckCircleIcon sx={{ fontSize: 22, color: theme.palette.success.main }} />
          )}
          {isFailed && (
            <ErrorIcon sx={{ fontSize: 22, color: theme.palette.error.main }} />
          )}
          <Typography
            variant="body2"
            fontWeight={500}
            sx={{
              color: isActive
                ? theme.palette.info.main
                : isFailed
                  ? theme.palette.error.main
                  : theme.palette.success.main,
            }}
          >
            {isActive ? 'Indexation en cours' : isFailed ? 'Erreur d\'indexation' : 'Indexation terminée'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isActive && (
            <Typography variant="body2" fontWeight={600} color="text.secondary">
              {progress}%
            </Typography>
          )}
          {onRefresh && (
            <Tooltip title="Actualiser le statut">
              <IconButton size="small" onClick={onRefresh}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Progress bar for active jobs */}
      {isActive && (
        <Box sx={{ mb: 1 }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: alpha(theme.palette.info.main, 0.2),
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                background: `linear-gradient(90deg, ${theme.palette.info.main} 0%, ${theme.palette.primary.main} 100%)`,
              },
            }}
          />
        </Box>
      )}

      {/* Status message */}
      <Typography variant="caption" color="text.secondary">
        {error || statusMessage}
      </Typography>

      {/* Detailed progress for active jobs */}
      {isActive && job?.totalSteps && job.processedSteps !== undefined && (
        <Box sx={{ mt: 1, display: 'flex', gap: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Fichiers traités: {job.processedSteps}/{job.totalSteps}
          </Typography>
          {job.totalSteps > 0 && (
            <Typography variant="caption" color="text.secondary">
              • Restant: {job.totalSteps - job.processedSteps}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}

