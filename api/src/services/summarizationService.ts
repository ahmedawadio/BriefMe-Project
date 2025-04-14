import { openai } from '@ai-sdk/openai';
import { generateText, embedMany, embed } from 'ai';
import { supabase } from '../utils/supabase';
import dotenv from 'dotenv';
import pLimit from 'p-limit';

dotenv.config();

/**
 * Summarization Service
 * 
 * This service provides AI-powered document summarization capabilities:
 * - Automatically processes documents that need summaries
 * - Handles large documents with semantic chunking and embedding-based retrieval
 * - Uses OpenAI models for generating high-quality summaries
 * - Includes retry mechanisms and concurrent processing
 * - Runs as a background service with configurable polling intervals
 */

// OpenAI API key is required for summarization
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is required');
}


// Configuration Constants
const MAX_RETRIES = 3;              // Maximum number of retry attempts for API calls
const RETRY_DELAY_MS = 1000;        // Base delay between retries (grows exponentially)
const DEFAULT_FALLBACK_SUMMARY = "No summary was generated. Try again later.";
const MAX_CONCURRENT_REQUESTS = 10; // Limit parallel API requests to avoid rate limits
const CHUNK_SIZE = 4000;            // Maximum characters per text chunk
const OVERLAP = 100;                // Character overlap between chunks to maintain context
const MAX_CHUNKS_FOR_SUMMARY = 20;  // Limit chunks to summarize for very large documents

/**
 * Interface for brief documents from the database
 * Maps to the 'briefs' table schema
 */
interface Brief {
  id: string;
  title: string;
  notes: string | null;
  file_path: string;
  summary: string | null;
  created_at: string;
  user_id: string;
}

// Track which briefs are currently being processed to avoid duplicate processing
const processingBriefs = new Set<string>();

/**
 * In-memory vector store for document chunks and their embeddings
 * Used for semantic search when processing large documents
 */
type EmbeddingData = {
  embedding: number[];        // Vector embedding of the text chunk
  metadata: { text: string }; // Original text content
};
const embeddingStore: EmbeddingData[] = [];

/**
 * Stream file content from Supabase storage
 * 
 * Downloads a document from the 'brief-documents' bucket and returns it as text
 * 
 * @param filePath - Path to the file in Supabase storage
 * @returns Promise with the file content as a string
 */
async function streamFileContent(filePath: string): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from('brief-documents')
      .download(filePath);

    if (error) {
      throw new Error(`Failed to download file: ${error.message}`);
    }

    // Convert blob to text
    return await data.text();
  } catch (error) {
    console.error('Error streaming file:', error);
    throw error;
  }
}

/**
 * Split text into chunks with overlap
 * 
 * Uses a line-based approach to avoid cutting in the middle of sentences,
 * and adds overlap between chunks to preserve context across chunks.
 * 
 * @param text - The document text to chunk
 * @returns Array of text chunks
 */
function chunkText(text: string): string[] {
  const chunks: string[] = [];
  const lines = text.split('\n');
  let currentChunk = '';
  
  for (const line of lines) {
    if (currentChunk.length + line.length > CHUNK_SIZE && currentChunk.length > 0) {
      chunks.push(currentChunk);
      // Start new chunk with overlap from the end of the previous chunk
      const overlapText = currentChunk.length > OVERLAP 
        ? currentChunk.slice(-OVERLAP) 
        : currentChunk;
      currentChunk = overlapText + '\n' + line;
    } else {
      currentChunk += (currentChunk ? '\n' : '') + line;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  console.log(`Text chunked into ${chunks.length} parts`);
  return chunks;
}

/**
 * Calculate cosine similarity between two vectors
 * 
 * Measures how similar two embedding vectors are, with values between -1 and 1
 * Higher values indicate greater similarity
 * 
 * @param a - First vector
 * @param b - Second vector
 * @returns Similarity score between -1 and 1
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Find most similar chunks to a query embedding
 * 
 * Retrieves the most relevant document chunks for a given query
 * using vector similarity search on embeddings
 * 
 * @param queryEmbedding - The embedding vector of the query
 * @param topK - Number of most similar chunks to return
 * @returns Array of the most similar text chunks
 */
function findSimilarChunks(queryEmbedding: number[], topK: number): string[] {
  // Calculate similarities and sort
  const similarities = embeddingStore.map(item => ({
    text: item.metadata.text,
    similarity: cosineSimilarity(queryEmbedding, item.embedding)
  }));
  
  // Sort by similarity (descending)
  const sorted = similarities.sort((a, b) => b.similarity - a.similarity);
  
  // Return top K chunks
  return sorted.slice(0, topK).map(item => item.text);
}

/**
 * Process document with embeddings for semantic search
 * 
 * Core document processing algorithm:
 * 1. For very large documents, uses semantic search to find most relevant chunks
 * 2. For smaller documents, summarizes the entire content
 * 
 * @param text - Full document text
 * @param title - Document title (used for context in query creation)
 * @returns Promise with the generated summary
 */
async function processLargeDocument(text: string, title: string): Promise<string> {
  console.log(`Processing large document with embeddings: ${title}`);
  
  // Clear previous embeddings
  embeddingStore.length = 0;
  
  // Chunk the document
  const chunks = chunkText(text);
  
  console.log(`Document chunked into ${chunks.length} parts`);
  
  // Use semantic search for large documents
  if (chunks.length > MAX_CHUNKS_FOR_SUMMARY) {
    console.log(`Document has ${chunks.length} chunks, using semantic search`);
    
    // Create embeddings for all chunks
    const { embeddings } = await embedMany({
      model: openai.embedding('text-embedding-3-small'),
      values: chunks,
    });
    
    // Store embeddings
    for (let i = 0; i < chunks.length; i++) {
      embeddingStore.push({
        embedding: embeddings[i],
        metadata: { text: chunks[i] }
      });
    }
    
    // Create embedding for the query (using title as context)
    const query = `Summary of document titled "${title}"`;
    const { embedding: queryEmbedding } = await embed({
      value: query,
      model: openai.embedding('text-embedding-3-small'),
    });
    
    // Find most similar chunks
    const relevantChunks = findSimilarChunks(queryEmbedding, MAX_CHUNKS_FOR_SUMMARY);
    console.log(`Selected ${relevantChunks.length} most relevant chunks for summarization`);
    
    // Create summary from relevant chunks
    const combinedText = relevantChunks.join('\n\n');
    return await generateSummary(combinedText);
  } else {
    // For smaller documents, summarize all chunks
    console.log(`Document has ${chunks.length} chunks, using direct summarization`);
    return await generateSummary(text);
  }
}

/**
 * Generate summary using OpenAI
 * 
 * Creates a concise, informative summary of the provided text
 * using OpenAI's language models with specific instructions
 * 
 * @param text - Text to summarize
 * @returns Promise with the generated summary
 */
async function generateSummary(text: string): Promise<string> {
  const prompt = `
  You are an expert document summarizer. Your task is to create a concise, informative summary of the following document.
  
  Document type: Technical/business brief
  Your goal: Extract key information, facts, and important points while preserving the original meaning.
  Format: Write one well-structured paragraph.
  Length: 150-200 words maximum.
  Style: Clear, factual, and objective. Preserve specific technical terms, metrics, and proper nouns.
  
  Text to summarize:
  """
  ${text}
  """
  
  Summary:`;
  
  const result = await withRetry(async () => {
    const { text: summary } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt,
      maxTokens: 300,
    });
    return summary.trim();
  });
  
  return result || DEFAULT_FALLBACK_SUMMARY;
}

/**
 * Helper function to retry a function with exponential backoff
 * 
 * Attempts to execute a function multiple times with increasing delay
 * between retries to handle transient errors gracefully
 * 
 * @param fn - Async function to retry
 * @param maxRetries - Maximum number of retry attempts
 * @param delayMs - Base delay in milliseconds between retries
 * @returns Promise with the function result or null if all attempts fail
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = MAX_RETRIES, delayMs = RETRY_DELAY_MS): Promise<T | null> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.warn(`Attempt ${attempt}/${maxRetries} failed: ${lastError.message}`);
      
      if (attempt < maxRetries) {
        // Wait before retrying with exponential backoff
        const waitTime = delayMs * Math.pow(2, attempt - 1);
        console.log(`Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  console.error(`All ${maxRetries} attempts failed. Last error: ${lastError?.message}`);
  return null;
}

/**
 * Updates a brief's summary in the database
 * 
 * @param briefId - ID of the brief to update
 * @param summary - Generated summary text to store
 * @returns Promise that resolves when update is complete
 */
async function updateBriefSummary(briefId: string, summary: string): Promise<void> {
  const { error } = await supabase
    .from('briefs')
    .update({ summary })
    .eq('id', briefId);
  
  if (error) {
    throw new Error(`Failed to update summary: ${error.message}`);
  }
  
  console.log(`Updated summary for brief ${briefId}`);
}

/**
 * Gets briefs that don't have summaries yet
 * 
 * Queries the database for briefs with null summaries
 * and filters out any that are already being processed
 * 
 * @param limit - Maximum number of briefs to return
 * @returns Promise with array of briefs needing summarization
 */
async function getBriefsWithoutSummaries(limit: number = 5): Promise<Brief[]> {
  const { data, error } = await supabase
    .from('briefs')
    .select('*')
    .is('summary', null)
    .limit(limit);
  
  if (error) {
    throw new Error(`Failed to fetch briefs: ${error.message}`);
  }
  
  // Filter out briefs that are already being processed
  const availableBriefs = data?.filter(brief => !processingBriefs.has(brief.id)) || [];
  
  return availableBriefs;
}

/**
 * Process a batch of briefs to generate summaries
 * 
 * Core processing function that:
 * 1. Finds briefs without summaries
 * 2. Marks them as being processed
 * 3. Streams their content from storage
 * 4. Generates summaries with controlled concurrency
 * 5. Updates the database with results
 */
async function processBriefs(): Promise<void> {
  try {
    const briefs = await getBriefsWithoutSummaries(3);
    
    if (briefs.length === 0) {
      return;
    }
    
    console.log(`Found ${briefs.length} briefs that need summarization`);
    
    briefs.forEach(brief => processingBriefs.add(brief.id));
    
    // Limit concurrent processing to avoid resource exhaustion
    const limit = pLimit(MAX_CONCURRENT_REQUESTS);

    await Promise.all(
      briefs.map(brief =>
        limit(async () => {
          try {
            console.log(`Processing brief: ${brief.id} - ${brief.title}`);
            
            // Get file content
            const content = await streamFileContent(brief.file_path);
            
            // Process with embeddings
            const summary = await processLargeDocument(content, brief.title);
            
            // Update brief with summary
            await updateBriefSummary(brief.id, summary);
            
            console.log(`Successfully summarized brief: ${brief.id}`);
          } catch (error) {
            console.error(`Error processing brief ${brief.id}:`, error);
            try {
              // Fall back to a default summary on error
              await updateBriefSummary(brief.id, DEFAULT_FALLBACK_SUMMARY);
            } catch (updateError) {
              console.error(`Failed to update brief ${brief.id} with fallback summary:`, updateError);
            }
          } finally {
            // Always clear the processing flag, even on errors
            processingBriefs.delete(brief.id);
          }
        })
      )
    );
  } catch (error) {
    console.error('Error in processBriefs:', error);
  }
}

/**
 * Start the background polling service
 * 
 * Initializes a recurring interval that regularly checks for
 * and processes briefs that need summarization
 * 
 * @param intervalMs - Polling interval in milliseconds
 */
export function startSummarizationService(intervalMs: number = 3000): void {
  console.log(`Starting summarization service with interval of ${intervalMs}ms`);
  
  // Initial run
  processBriefs();
  
  // Set up interval
  const intervalId = setInterval(processBriefs, intervalMs);
  
  // Handle graceful shutdown
  const cleanup = () => {
    console.log('Stopping summarization service');
    clearInterval(intervalId);
    process.exit(0);
  };
  
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

// Export functions for testing or manual triggering
export {
  processBriefs,
  processLargeDocument,
  getBriefsWithoutSummaries
}; 