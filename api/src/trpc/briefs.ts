import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { initTRPC } from '@trpc/server';
import { Context } from './context';
import { supabase as adminSupabase } from '../utils/supabase';

// Create standalone instance instead of importing from router
const t = initTRPC.context<Context>().create();
const router = t.router;
const protectedProcedure = t.procedure.use(({ next, ctx }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Not authenticated'
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});

// Input validation schema with size limits
const uploadBriefSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  notes: z.string().optional(),
  fileContent: z.string().max(50 * 1024 * 1024, 'File is too large (max 50MB)'), // Approx 50MB limit
  fileName: z.string().max(255, 'Filename is too long')
});

// Input validation schema for getting a single brief
const getBriefByIdSchema = z.object({
  id: z.string().uuid('Invalid brief ID format')
});

// Optional sorting and filtering schema for list
const listBriefsSchema = z.object({
  limit: z.number().min(1).max(100).optional().default(50),
  orderBy: z.enum(['created_at', 'title']).optional().default('created_at'),
  orderDirection: z.enum(['asc', 'desc']).optional().default('desc')
}).optional();

// Input validation schema for resetting a summary
const resetSummarySchema = z.object({
  id: z.string().uuid('Invalid brief ID format')
});

export const briefsRouter = router({
  upload: protectedProcedure
    .input(uploadBriefSchema)
    .mutation(async ({ input, ctx }) => {
      const { title, notes, fileContent, fileName } = input;
      const userId = ctx.user.id;
      
      try {
        console.log(`Starting upload process for user: ${userId}, file: ${fileName}`);
        console.log(`File content length: ${fileContent.length} chars`);
        
        // Skip bucket creation - it already exists
        // Prepare file content
        const fileBuffer = Buffer.from(fileContent, 'base64');
        
        // Ensure we match the RLS policy by using the userId as the first folder segment
        const filePath = `${userId}/${Date.now()}_${fileName}`;
        
        console.log(`Uploading to path: ${filePath}`);
        
        // Just use admin client directly for storage uploads
        console.log('Uploading with admin privileges');
        
        const { data: fileData, error: fileError } = await adminSupabase.storage
          .from('brief-documents')
          .upload(filePath, fileBuffer, {
            contentType: 'text/plain',
            upsert: false
          });
          
        if (fileError) {
          console.error('Admin upload failed:', fileError);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to upload file: ${fileError.message}`
          });
        }
        
        console.log('File upload successful, creating database entry');
        
        // Store brief metadata in the database (using admin supabase to bypass RLS)
        const { data: briefData, error: briefError } = await adminSupabase
          .from('briefs')
          .insert({
            title,
            notes,
            file_path: filePath,
            user_id: userId, // Matches auth.uid() in RLS policy
            created_at: new Date().toISOString()
          })
          .select('id')
          .single();
        
        if (briefError) {
          console.error('Database insert error:', briefError);
          
          // Attempt to clean up the file if the database insert fails
          await adminSupabase.storage
            .from('brief-documents')
            .remove([filePath]);
            
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to create brief: ${briefError.message}`
          });
        }
        
        console.log(`Brief created successfully with ID: ${briefData.id}`);
        return {
          success: true,
          briefId: briefData.id,
          message: 'Brief uploaded successfully'
        };
      } catch (error) {
        console.error('Upload process error:', error);
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        });
      }
    }),
    
  getById: protectedProcedure
    .input(getBriefByIdSchema)
    .query(async ({ input, ctx }) => {
      const { id } = input;
      const userId = ctx.user.id;
      
      try {
        // console.log(`Fetching brief with ID: ${id} for user: ${userId}`);
        
        // Fetch the brief metadata from the database
        const { data: brief, error: briefError } = await adminSupabase
          .from('briefs')
          .select('*')
          .eq('id', id)
          .eq('user_id', userId) // Ensure the brief belongs to the current user
          .single();
        
        if (briefError) {
          // Handle "no rows" case gracefully
          if (briefError.code === 'PGRST116') {
            console.log(`No brief found with ID: ${id} for user: ${userId}`);
            return { notFound: true, message: 'Brief not found' };
          }
          
          console.error('Database query error:', briefError);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to fetch brief: ${briefError.message}`
          });
        }
        
        if (!brief) {
          return { notFound: true, message: 'Brief not found' };
        }
        
        // Get a signed URL for accessing the document from storage
        const { data: signedUrl, error: urlError } = await adminSupabase.storage
          .from('brief-documents')
          .createSignedUrl(brief.file_path, 60 * 60); // 1 hour expiry
        
        if (urlError) {
          console.error('Failed to create signed URL:', urlError);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to generate access URL: ${urlError.message}`
          });
        }
        
        // Add the signed URL to the brief data
        return {
          ...brief,
          fileUrl: signedUrl.signedUrl
        };
      } catch (error) {
        console.error('Error fetching brief:', error);
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        });
      }
    }),
    
  list: protectedProcedure
    .input(listBriefsSchema)
    .query(async ({ input = {}, ctx }) => {
      const { limit = 50, orderBy = 'created_at', orderDirection = 'desc' } = input;
      const userId = ctx.user.id;
      
      try {
        console.log(`Fetching briefs for user: ${userId}`);
        
        // Query the database for all briefs belonging to the user
        let query = adminSupabase
          .from('briefs')
          .select('id, title, notes, created_at, summary, file_path')
          .eq('user_id', userId)
          .order(orderBy, { ascending: orderDirection === 'asc' })
          .limit(limit);
        
        const { data: briefs, error: queryError } = await query;
        
        if (queryError) {
          console.error('Error fetching briefs:', queryError);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to fetch briefs: ${queryError.message}`
          });
        }
        
        return {
          briefs: briefs || [],
          count: briefs?.length || 0
        };
      } catch (error) {
        console.error('Error listing briefs:', error);
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        });
      }
    }),
    
  resetSummary: protectedProcedure
    .input(resetSummarySchema)
    .mutation(async ({ input, ctx }) => {
      const { id } = input;
      const userId = ctx.user.id;
      
      try {
        console.log(`Resetting summary for brief ID: ${id} by user: ${userId}`);
        
        // First check if the brief exists and belongs to the user
        const { data: brief, error: checkError } = await adminSupabase
          .from('briefs')
          .select('id')
          .eq('id', id)
          .eq('user_id', userId)
          .single();
        
        if (checkError) {
          if (checkError.code === 'PGRST116') {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Brief not found or you do not have permission to modify it'
            });
          }
          
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to check brief ownership: ${checkError.message}`
          });
        }
        
        // Reset the summary to null
        const { data, error } = await adminSupabase
          .from('briefs')
          .update({ summary: null })
          .eq('id', id)
          .eq('user_id', userId);
        
        if (error) {
          console.error('Error resetting summary:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to reset summary: ${error.message}`
          });
        }
        
        console.log(`Summary reset successful for brief: ${id}`);
        
        return {
          success: true,
          message: 'Summary has been reset and will be regenerated'
        };
      } catch (error) {
        console.error('Error resetting summary:', error);
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        });
      }
    })
}); 