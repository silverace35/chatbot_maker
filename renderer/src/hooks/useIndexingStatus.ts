import { useState, useEffect, useCallback, useRef } from 'react';
import { ragService } from '@/services/rag/rag.service';
import { profileService } from '@/services/profile/profile.service';
import type { IndexingJob, Profile } from '@/types/electron-api';

interface UseIndexingStatusOptions {
  profileId: string | null;
  enabled?: boolean;
  pollingInterval?: number;
  onJobComplete?: (job: IndexingJob) => void;
  onJobFailed?: (job: IndexingJob) => void;
  onProfileUpdated?: (profile: Profile) => void;
}

interface UseIndexingStatusReturn {
  indexingJob: IndexingJob | null;
  isIndexing: boolean;
  progress: number;
  statusMessage: string;
  error: string | null;
  startIndexing: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  clearError: () => void;
}

export function useIndexingStatus({
  profileId,
  enabled = true,
  pollingInterval = 1500,
  onJobComplete,
  onJobFailed,
  onProfileUpdated,
}: UseIndexingStatusOptions): UseIndexingStatusReturn {
  const [indexingJob, setIndexingJob] = useState<IndexingJob | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for stable references
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const currentJobIdRef = useRef<string | null>(null);

  // Store callbacks in refs to avoid dependency issues
  const onJobCompleteRef = useRef(onJobComplete);
  const onJobFailedRef = useRef(onJobFailed);
  const onProfileUpdatedRef = useRef(onProfileUpdated);
  const profileIdRef = useRef(profileId);

  // Update refs when props change
  useEffect(() => {
    onJobCompleteRef.current = onJobComplete;
    onJobFailedRef.current = onJobFailed;
    onProfileUpdatedRef.current = onProfileUpdated;
    profileIdRef.current = profileId;
  });

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []);

  // Load latest indexing job for the profile
  const loadLatestJob = useCallback(async () => {
    if (!profileId || !enabled) return;

    try {
      const jobs = await ragService.listIndexingJobs(profileId);
      if (jobs.length > 0 && isMountedRef.current) {
        const latestJob = jobs[0];
        setIndexingJob(latestJob);
        
        const isActive = latestJob.status === 'pending' || latestJob.status === 'processing';
        setIsIndexing(isActive);
      }
    } catch (err) {
      console.error('Error loading indexing jobs:', err);
    }
  }, [profileId, enabled]);


  // Start polling when we have an active job
  useEffect(() => {
    // Determine if we should be polling
    const shouldPoll = enabled && indexingJob &&
      (indexingJob.status === 'pending' || indexingJob.status === 'processing');

    const jobId = indexingJob?.id;

    console.log('[useIndexingStatus] Polling effect:', {
      shouldPoll,
      jobId,
      status: indexingJob?.status,
      progress: indexingJob?.progress,
      currentJobIdRef: currentJobIdRef.current,
      hasInterval: !!pollingRef.current,
    });

    // If job changed, clear existing interval
    if (currentJobIdRef.current !== jobId) {
      if (pollingRef.current) {
        console.log('[useIndexingStatus] Job changed, clearing old interval');
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      currentJobIdRef.current = jobId || null;
    }

    if (shouldPoll && jobId && !pollingRef.current) {
      console.log('[useIndexingStatus] Starting new polling interval for job:', jobId);

      const poll = async () => {
        if (!isMountedRef.current || currentJobIdRef.current !== jobId) {
          console.log('[useIndexingStatus] Poll cancelled - unmounted or job changed');
          return;
        }

        try {
          const updatedJob = await ragService.getIndexingJob(jobId);

          if (!isMountedRef.current || currentJobIdRef.current !== jobId) {
            console.log('[useIndexingStatus] Poll result ignored - unmounted or job changed');
            return;
          }

          console.log('[useIndexingStatus] Poll result:', {
            jobId,
            status: updatedJob.status,
            progress: updatedJob.progress,
            processedSteps: updatedJob.processedSteps,
            totalSteps: updatedJob.totalSteps,
          });

          // Always update the job state
          setIndexingJob({ ...updatedJob });

          if (updatedJob.status === 'completed') {
            console.log('[useIndexingStatus] Job completed!');
            setIsIndexing(false);

            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }

            // Use refs for callbacks to avoid closure issues
            const currentProfileId = profileIdRef.current;
            if (currentProfileId) {
              try {
                const updatedProfile = await profileService.getProfile(currentProfileId);
                if (isMountedRef.current) {
                  onProfileUpdatedRef.current?.(updatedProfile);
                }
              } catch (err) {
                console.error('Error reloading profile:', err);
              }
            }

            onJobCompleteRef.current?.(updatedJob);
          } else if (updatedJob.status === 'failed') {
            console.log('[useIndexingStatus] Job failed:', updatedJob.error);
            setIsIndexing(false);
            setError(updatedJob.error || 'L\'indexation a échoué');

            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }

            const currentProfileId = profileIdRef.current;
            if (currentProfileId) {
              try {
                const updatedProfile = await profileService.getProfile(currentProfileId);
                if (isMountedRef.current) {
                  onProfileUpdatedRef.current?.(updatedProfile);
                }
              } catch (err) {
                console.error('Error reloading profile:', err);
              }
            }

            onJobFailedRef.current?.(updatedJob);
          }
        } catch (err) {
          console.error('[useIndexingStatus] Error polling job status:', err);
        }
      };

      // Poll immediately
      poll();

      // Then poll at interval
      pollingRef.current = setInterval(poll, pollingInterval);
    } else if (!shouldPoll && pollingRef.current) {
      console.log('[useIndexingStatus] Stopping polling - shouldPoll is false');
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    return () => {
      // Don't clear interval here - let it be managed by the logic above
      // This prevents the interval from being cleared and recreated on every render
    };
  }, [indexingJob?.id, indexingJob?.status, enabled, pollingInterval]); // Removed callback dependencies!

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        console.log('[useIndexingStatus] Cleanup - clearing polling interval');
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []);

  // Load initial job status when profileId changes
  useEffect(() => {
    loadLatestJob();
  }, [loadLatestJob]);

  // Start indexing
  const startIndexing = useCallback(async () => {
    const currentProfileId = profileIdRef.current;
    if (!currentProfileId) {
      setError('Aucun profil sélectionné');
      return;
    }

    console.log('[useIndexingStatus] Starting indexing for profile:', currentProfileId);
    setError(null);
    setIsIndexing(true);

    try {
      const job = await ragService.startIndexing(currentProfileId);

      console.log('[useIndexingStatus] Indexing started, job:', {
        id: job.id,
        status: job.status,
        progress: job.progress,
      });

      if (isMountedRef.current) {
        setIndexingJob(job);
        
        // Update profile status
        try {
          const updatedProfile = await profileService.getProfile(currentProfileId);
          onProfileUpdatedRef.current?.(updatedProfile);
        } catch (err) {
          console.error('Error reloading profile after starting indexing:', err);
        }
      }
    } catch (err) {
      console.error('[useIndexingStatus] Error starting indexing:', err);
      if (isMountedRef.current) {
        setIsIndexing(false);
        setError(err instanceof Error ? err.message : 'Erreur lors du démarrage de l\'indexation');
      }
    }
  }, []); // No dependencies - uses refs

  // Manual refresh
  const refreshStatus = useCallback(async () => {
    await loadLatestJob();
  }, [loadLatestJob]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Calculate progress and status message
  const progress = indexingJob?.progress ?? 0;
  
  const statusMessage = (() => {
    if (!indexingJob) return '';
    
    switch (indexingJob.status) {
      case 'pending':
        return 'En attente de démarrage...';
      case 'processing':
        if (indexingJob.totalSteps && indexingJob.processedSteps !== undefined) {
          return `Traitement: ${indexingJob.processedSteps}/${indexingJob.totalSteps} fichiers`;
        }
        return `Indexation en cours... ${progress}%`;
      case 'completed':
        return 'Indexation terminée';
      case 'failed':
        return indexingJob.error || 'L\'indexation a échoué';
      default:
        return '';
    }
  })();

  return {
    indexingJob,
    isIndexing,
    progress,
    statusMessage,
    error,
    startIndexing,
    refreshStatus,
    clearError,
  };
}

