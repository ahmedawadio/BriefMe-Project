import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter } from './trpc/router';
import { createContext } from './trpc/context';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import csrf from 'csrf';
import { supabase } from './utils/supabase';
import { startSummarizationService } from './services/summarizationService';

/**
 * BriefMe API Server
 * 
 * Main server entry point that initializes:
 * - Express server with middleware and security controls
 * - tRPC API router for type-safe client-server communication
 * - CSRF protection for enhanced security
 * - Rate limiting to prevent abuse
 * - Background document summarization service
 */

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// CSRF protection setup
const tokens = new csrf();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many attempts, please try again in a minute'
});

/**
 * Middleware Configuration
 * - Cookie parsing for authentication
 * - CORS with credentials for secure cross-origin requests
 * - JSON body parsing with 50MB limit for document uploads
 */
app.use(cookieParser());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true  // Important for cookies
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

/**
 * CSRF Protection Route
 * Generates a CSRF token for the client to use in subsequent requests
 * Stores the secret in an HTTP-only cookie for server verification
 */
app.get('/api/csrf-token', (req, res) => {
  const secret = tokens.secretSync();
  const token = tokens.create(secret);
  res.cookie('csrf-secret', secret, { httpOnly: true });
  res.json({ csrfToken: token });
});

// Apply rate limiting to auth endpoints to prevent brute force attacks
app.use('/trpc/auth.login', authLimiter);
app.use('/trpc/auth.signup', authLimiter);

/**
 * tRPC API Router Setup
 * Provides a type-safe API interface between client and server
 * Each endpoint is handled by a specific router (auth, briefs, etc.)
 * Request context includes authentication state and user data
 */
app.use(
  '/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext
  })
);


// Health check endpoint
app.get('/', (req, res) => {
  res.send('API is running');
});

/**
 * Server Initialization
 * Starts the Express server and background services
 */
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  
  // Start the background summarization service if API key is available
  if (process.env.OPENAI_API_KEY) {
    console.log('OpenAI API key found, starting summarization service');
    startSummarizationService(3000); // Check for documents to summarize every 3 seconds
  } else {
    console.warn('OpenAI API key not found, summarization service will not start');
  }
});