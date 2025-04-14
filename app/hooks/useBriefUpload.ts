'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fileToBase64, UploadBriefParams } from '@/services/briefs.service';
import { trpc } from '@/utils/trpc';

export function useBriefUpload() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  // Use tRPC's mutation hook
  const mutation = trpc.briefs.upload.useMutation({
    onSuccess: (data) => {
      // Navigate to the brief detail page
      router.push(`/briefs/${data.briefId}`);
    },
    onError: (err: any) => {
      console.error('Upload error:', err);
      // Handle error
      let errorMessage = 'Failed to upload document';
      
      if (err?.message) {
        // Clean up error messages from the server
        if (err.message.includes('PayloadTooLargeError')) {
          errorMessage = 'The file is too large. Please upload a smaller file (max 50MB).';
        } else if (err.message.includes('row-level security policy')) {
          errorMessage = 'Permission error: You don\'t have access to upload to this location.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    }
  });

  const uploadBrief = async (params: UploadBriefParams) => {
    try {
      if (!params.title) {
        setError('Title is required');
        return;
      }

      if (!params.file) {
        setError('File is required');
        return;
      }

      // Check file size (max 50MB)
      if (params.file.size > 50 * 1024 * 1024) {
        setError('File is too large. Maximum size is 50MB.');
        return;
      }

      setError(null);
      
      // Convert file to base64
      const fileContent = await fileToBase64(params.file);
      
      // Call the tRPC mutation
      mutation.mutate({
        title: params.title,
        notes: params.notes || '',
        fileContent,
        fileName: params.file.name
      });
    } catch (err) {
      console.error('Error preparing upload:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    }
  };

  return {
    uploadBrief,
    isUploading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error,
    setError,
    data: mutation.data
  };
}

export default useBriefUpload; 