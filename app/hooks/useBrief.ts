'use client';

import { useState, useEffect, useRef } from 'react';
import { Brief } from '@/services/briefs.service';
import { trpc } from '@/utils/trpc';

// Get the API server port from environment variables, default to 3001 if not set
const API_PORT = process.env.NEXT_PUBLIC_API_PORT || '3001';
const API_URL = process.env.NEXT_PUBLIC_API_URL || `http://localhost:${API_PORT}`;

/**
 * Hook to fetch and manage a brief by ID
 */
export function useBrief(briefId: string) {
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollCountRef = useRef(0);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const lastPollTimeRef = useRef<number>(0);
  const isStartingPollingRef = useRef(false);

  // Use tRPC's query hook directly for initial data and UI updates
  const { 
    data, 
    isLoading, 
    error,
    refetch
  } = trpc.briefs.getById.useQuery(
    { id: briefId },
    { 
      enabled: !!briefId,
      refetchOnWindowFocus: false,
      suspense: false,
      retry: false
    }
  );

  // Use the resetSummary mutation
  const resetMutation = trpc.briefs.resetSummary.useMutation({
    onSuccess: () => {
      // Refetch the brief data after successful reset
      refetch();
      
      // Wait a brief moment before starting polling to avoid race conditions
      setTimeout(() => {
        startPolling();
      }, 200);
    }
  });

  // Function to reset the summary
  const resetSummary = async () => {
    try {
      setIsResetting(true);
      setResetError(null);
      await resetMutation.mutateAsync({ id: briefId });
    } catch (err) {
      console.error('Error resetting summary:', err);
      setResetError(err instanceof Error ? err.message : 'Failed to reset summary');
    } finally {
      setIsResetting(false);
    }
  };

  // Stop polling function
  const stopPolling = () => {
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    setIsPolling(false);
    isStartingPollingRef.current = false;
    pollCountRef.current = 0;
    console.log('Polling stopped');
  };

  // Fetch brief directly using the tRPC endpoint
  const fetchBriefDirectly = async () => {
    try {
      // Create proper tRPC endpoint URL with randomized timestamp to prevent caching
      const timestamp = Date.now();
      const input = encodeURIComponent(JSON.stringify({ "0": { id: briefId } }));
      const url = `${API_URL}/trpc/briefs.getById?batch=1&input=${input}&t=${timestamp}`;
      
      console.log(`Polling URL: ${url}`);
      
      // Get the current auth cookie to maintain the user's session
      const authHeaders = {};
      
      // When polling directly to the API server, we need to include cookies
      // for authentication, but can't do this directly with fetch across domains
      // Instead, we'll use the safer approach of using the tRPC refetch method
      console.log('Using refetch() instead of direct API call to maintain authentication');
      await refetch();
      
      // Check if the data has been updated with a summary
      if (data?.summary) {
        console.log('Summary found through refetch!');
        return data;
      }
      
      // If we still don't have a summary, return the current data
      return data;
    } catch (err) {
      console.error('Fetch error:', err);
      return null;
    }
  };

  // Start polling function - using direct API calls to bypass React Query caching
  const startPolling = () => {
    // Don't start if already polling or in the process of starting
    if (isPolling || intervalIdRef.current || isStartingPollingRef.current) {
      console.log('Polling already in progress or starting, not starting a new one');
      return;
    }
    
    // Mark that we're in the process of starting polling to prevent race conditions
    isStartingPollingRef.current = true;
    
    // Stop any existing polling just to be safe
    stopPolling();
    
    // Start fresh polling cycle
    setIsPolling(true);
    pollCountRef.current = 0;
    lastPollTimeRef.current = Date.now();
    
    // console.log('Starting polling every 10 seconds');
    
    // Set up the interval first
    intervalIdRef.current = setInterval(() => {
      doPoll();
    }, 6000); // Exactly 10 seconds
    
    // Delay initial poll slightly to avoid race conditions with React renders
    setTimeout(() => {
      if (intervalIdRef.current) { // Only if we haven't unmounted
        console.log('Running initial delayed poll');
        doPoll();
      }
    }, 500);
  };
  
  // Separate polling function to keep the logic clean
  const doPoll = async () => {
    try {
      const now = Date.now();
      const timeSinceLastPoll = now - lastPollTimeRef.current;
      
      // Log the current attempt with time since last poll
      pollCountRef.current += 1;
      console.log(`Polling attempt ${pollCountRef.current}/6 (${timeSinceLastPoll}ms since last poll)`);
      
      // Update the last poll time
      lastPollTimeRef.current = now;
      
      // Direct API call bypassing tRPC and React Query
      const refreshedBrief = await fetchBriefDirectly();
      
      // If summary is found, stop polling and then update UI with a slight delay
      if (refreshedBrief?.summary) {
        console.log('Summary found! Stopping polling.');
        stopPolling();
        
        // Slight delay before refetch to avoid race conditions
        setTimeout(() => {
          refetch(); // Refresh UI data
        }, 200);
        return;
      }
      
      // Stop polling after 6 attempts (1 minute with 10-second intervals)
      if (pollCountRef.current >= 6) {
        console.log('Reached maximum of 6 polling attempts (1 minute), stopping');
        stopPolling();
      }
    } catch (err) {
      console.error('Polling error:', err);
    }
  };

  // Initial polling setup and summary detection - with stabilized deps
  useEffect(() => {
    // Skip if currently starting polling to avoid race conditions
    if (isStartingPollingRef.current) {
      return;
    }
    
    // Begin polling if:
    // 1. We have data but no summary
    // 2. We're not already polling or starting to poll
    if (
      data && 
      !data.notFound && 
      (!data.summary || data.summary === '') && 
      !isPolling &&
      !intervalIdRef.current
    ) {
      console.log('No summary found, starting polling');
      startPolling();
    }
    
    // Stop polling if we found a summary
    if (data?.summary && isPolling) {
      console.log('Summary found in useEffect, stopping polling');
      stopPolling();
    }
    
  }, [data?.summary, isPolling]); // Only depend on summary and isPolling, not the entire data object
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('Component unmounting, cleaning up polling');
      stopPolling();
    };
  }, []);

  // Check if the response indicates "not found"
  const notFound = data?.notFound === true;
  const notFoundMessage = notFound ? data.message : null;

  return {
    brief: (!notFound && data) ? data as Brief : null,
    isLoading,
    error: error ? error.message : notFoundMessage,
    notFound,
    refetch,
    resetSummary,
    isResetting,
    isPolling,
    resetError
  };
}

export default useBrief; 