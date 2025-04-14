'use client';

import { trpcClient } from '@/utils/trpc';

/**
 * Parameters for uploading a new brief/document
 */
export interface UploadBriefParams {
  title: string;
  notes?: string;
  file: File;
}

/**
 * Brief/document data structure
 * Contains all metadata and content references for a brief
 */
export interface Brief {
  id: string;
  title: string;
  notes: string | null;
  file_path: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  fileUrl?: string; // URL for accessing the file directly
}

/**
 * Options for listing/filtering briefs
 */
export interface ListBriefsOptions {
  limit?: number; // Maximum number of briefs to return
  orderBy?: 'created_at' | 'title'; // Field to sort by
  orderDirection?: 'asc' | 'desc'; // Sort direction
}

/**
 * Response structure for brief listing operation
 */
export interface BriefListResponse {
  briefs: Brief[]; // Array of brief objects
  count: number; // Total count of briefs (useful for pagination)
}

/**
 * Converts a File object to a base64 string for transmission
 * 
 * @param file The file object to convert
 * @returns Promise with the base64 string representation
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove the data URL prefix (e.g., "data:text/plain;base64,")
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = error => reject(error);
  });
};

/**
 * Briefs Service
 * 
 * Provides methods for managing document briefs:
 * - Upload new documents with metadata
 * - Fetch brief details by ID
 * - List and filter briefs
 * - Reset/regenerate AI summaries
 * 
 * All methods communicate with the backend via tRPC client
 */
export const briefsService = {
  /**
   * Uploads a document and creates a new brief
   * 
   * @param params Object containing title, optional notes, and file
   * @returns Promise with the upload response
   * @throws Error if upload fails
   */
  upload: async ({ title, notes = '', file }: UploadBriefParams) => {
    try {
      // Convert file to base64
      const fileContent = await fileToBase64(file);
      
      // Call the tRPC mutation
      const result = await trpcClient.briefs.upload.mutate({
        title,
        notes,
        fileContent,
        fileName: file.name
      });
      
      return result;
    } catch (error) {
      console.error('Error uploading brief:', error);
      throw error;
    }
  },
  
  /**
   * Fetches a specific brief by its ID
   * 
   * @param id The brief's unique identifier
   * @returns Promise with the brief data
   * @throws Error if brief cannot be found or fetched
   */
  getById: async (id: string): Promise<Brief> => {
    try {
      // Call the tRPC query
      const result = await trpcClient.briefs.getById.query({ id });
      return result as Brief;
    } catch (error) {
      console.error(`Error fetching brief ${id}:`, error);
      throw error;
    }
  },

  /**
   * Lists briefs based on provided filter options
   * 
   * @param options Filtering and sorting options
   * @returns Promise with the briefs list and total count
   * @throws Error if listing operation fails
   */
  listBriefs: async (options: ListBriefsOptions = {}): Promise<BriefListResponse> => {
    try {
      // Call the tRPC query
      const result = await trpcClient.briefs.list.query(options);
      return result as BriefListResponse;
    } catch (error) {
      console.error('Error listing briefs:', error);
      throw error;
    }
  },

  /**
   * Resets a brief's AI-generated summary so it can be regenerated
   * 
   * @param id The brief's unique identifier
   * @returns Promise with success status and message
   * @throws Error if reset operation fails
   */
  resetSummary: async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
      // Call the tRPC mutation
      const result = await trpcClient.briefs.resetSummary.mutate({ id });
      return result;
    } catch (error) {
      console.error(`Error resetting summary for brief ${id}:`, error);
      throw error;
    }
  }
}; 