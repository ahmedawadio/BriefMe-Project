'use client';

import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Brief, ListBriefsOptions } from '@/services/briefs.service';

/**
 * Hook to fetch and manage a list of briefs with search and loading states
 */
export function useBriefsList(options: ListBriefsOptions = {}) {
  const [sort, setSort] = useState<ListBriefsOptions>({
    orderBy: options.orderBy || 'created_at',
    orderDirection: options.orderDirection || 'desc',
    limit: options.limit || 50
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefetching, setIsRefetching] = useState(false);
  
  // Use tRPC's query hook directly
  const { 
    data, 
    isLoading: isInitialLoading, 
    error,
    refetch: originalRefetch
  } = trpc.briefs.list.useQuery(sort, {
    refetchOnWindowFocus: false
  });
  
  // Enhanced refetch with loading state
  const refetch = useCallback(async () => {
    setIsRefetching(true);
    try {
      await originalRefetch();
    } finally {
      // Small delay to prevent flickering
      setTimeout(() => {
        setIsRefetching(false);
      }, 300);
    }
  }, [originalRefetch]);

  // Auto-refetch on mount
  useEffect(() => {
    refetch();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Function to change sort options
  const updateSort = useCallback((newSort: Partial<ListBriefsOptions>) => {
    setSort(prev => ({
      ...prev,
      ...newSort
    }));
  }, []);

  // Toggle sort direction utility
  const toggleSortDirection = useCallback(() => {
    updateSort({
      orderDirection: sort.orderDirection === 'asc' ? 'desc' : 'asc',
    });
  }, [sort.orderDirection, updateSort]);

  // Change sort field utility
  const changeSortField = useCallback((field: 'created_at' | 'title') => {
    updateSort({ orderBy: field });
  }, [updateSort]);
  
  // Filter briefs by search term
  const filteredBriefs = (data?.briefs || []).filter((brief) => {
    if (!searchTerm.trim()) return true;

    const search = searchTerm.toLowerCase();

    // Extract filename from file_path
    const fileName = brief.file_path?.split('/')?.pop()?.split('_')?.slice(1)?.join('_') || '';

    // Search in multiple fields
    return (
      brief.title?.toLowerCase().includes(search) ||
      (brief.notes?.toLowerCase() || '').includes(search) ||
      fileName.toLowerCase().includes(search) ||
      (brief.summary?.toLowerCase() || '').includes(search)
    );
  }) as Brief[]; // Explicitly cast to Brief[] to ensure proper typing
  
  // Combined loading state
  const isLoading = isInitialLoading || isRefetching;
  
  return {
    briefs: data?.briefs as Brief[] || [],
    filteredBriefs,
    count: data?.count || 0,
    isLoading,
    isInitialLoading,
    isRefetching,
    error: error ? error.message : null,
    sort,
    searchTerm,
    setSearchTerm,
    updateSort,
    refetch,
    toggleSortDirection,
    changeSortField
  };
}

export default useBriefsList; 