# BriefMe API

A TypeScript Express API server using tRPC for type-safe API calls between the frontend and backend, with integrated authentication and document summarization.

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

The API server runs on port 3001 by default: http://localhost:3001

## Architecture

The API is built using a clean architecture pattern with clear separation of concerns:

### Folder Structure

```
api/
├── src/
│   ├── index.ts         # Main entry point and server setup
│   ├── trpc/            # tRPC router and procedure definitions
│   │   ├── router.ts    # Main router configuration
│   │   ├── context.ts   # Request context setup
│   │   ├── auth.ts      # Authentication procedures
│   │   └── briefs.ts    # Document management procedures
│   ├── services/        # Business logic services
│   │   └── summarizer/  # Document summarization service
│   └── utils/           # Utility functions and shared code
│       └── supabase.ts  # Supabase client configuration
└── .env                 # Environment variables (not in source control)
```

## Core Features

### 1. Type-Safe API with tRPC

- Provides end-to-end type safety between frontend and backend
- Organized into domain-specific routers (auth, briefs)
- Leverages middleware for authentication and request validation

### 2. Authentication System

- JWT-based authentication using HTTP-only cookies
- Secure token handling with proper expiration and refresh mechanisms
- User signup, login, logout, and token verification endpoints
- Row-level security in database to ensure users can only access their own data

### 3. Document Management

- Upload documents with metadata (title, notes)
- Store documents securely in Supabase Storage
- Retrieve documents with signed URLs for secure access
- List and filter documents by various criteria

### 4. Document Summarization Service

This service automatically generates summaries for documents in the briefs table that don't have summaries yet. It uses a hybrid approach with embeddings and OpenAI models.

#### How It Works

1. **Background Polling**: The service checks for documents without summaries every 3 seconds.
2. **Smart Document Processing**:
   - Documents are broken into chunks
   - For large documents (>20 chunks), semantic search with embeddings identifies the most relevant sections
   - GPT-4o Mini generates a comprehensive 150-200 word summary of the content
   - The service handles documents of any size efficiently by adapting the summarization strategy

#### Manual Trigger

You can manually trigger the summarization process via the API endpoint:

```
POST /api/summarize
```

#### Debug Logs

The service logs its activity to the console, making it easy to monitor:

- Which documents are being processed
- When new summaries are generated
- Any errors that occur during processing
- Retry attempts and their outcomes

#### Implementation Details

##### Chunking Strategy

The service uses a semantic chunking approach with:

- Chunk size: 1000 characters
- Overlap: 100 characters
- Natural separator: newline character

This ensures semantic coherence of chunks by respecting paragraph breaks.

##### Embedding-Based Retrieval

For documents with more than 20 chunks:

- Embeddings are generated for all chunks using OpenAI's text-embedding-3-small model
- A query embedding is created based on the document title
- Cosine similarity is used to identify the most relevant chunks
- Only the top 20 most relevant chunks are used for summarization
- This reduces token usage while maintaining summary quality

##### Parallel Processing

- Uses `pLimit` for concurrency management
- Rate limited to 10 concurrent API calls (configurable)
- Optimized for both small and large documents

##### Retry Mechanism

- Implements exponential backoff retry for API failures
- Each API call can retry up to 3 times with increasing delay
- Failed chunks are skipped if they fail after all retry attempts
- A fallback message is used if all summarization attempts fail

##### Processing Management

- The service maintains a tracking system to prevent duplicate processing
- Documents already being processed are excluded from the next batch
- Even if the process crashes or errors occur, tracking is cleaned up properly

##### LLM Models

- **Embeddings**: Uses text-embedding-3-small for semantic search
- **Summarization**: Uses GPT-4o Mini to generate the final summary
- Prompts are optimized for information extraction with clear expectations

##### Error Handling

- The service continues processing remaining documents even if one fails
- Each document is processed in a try/catch block to prevent cascading failures
- Rate limiting is handled by only processing 3 documents at a time
- Documents that fail summarization receive a default placeholder message: `"No summary was generated. Try again later."`
- This fallback message is stored in the database, marking the document as "processed" to prevent continuous refetching attempts
- Users can manually trigger re-summarization if needed via the UI "Regenerate" button

##### Customization

You can adjust the following parameters in the service:

- Poll interval (default: 3000ms)
- Batch size (default: 3 documents per batch)
- Chunk size (default: 1000 characters)
- Concurrency limit (default: 10 parallel API calls)
- Maximum chunks for direct summarization (default: 20)
- Retry attempts (default: 3 retries with exponential backoff)
- Fallback message (default: "No summary was generated. Try again later.")

## API Endpoints

All endpoints are available under the `/trpc` path:

### Authentication

- `auth.signup` - Create a new user account
- `auth.login` - Authenticate a user and create a session
- `auth.logout` - End a user session
- `auth.verifyAuth` - Check authentication status
- `auth.refreshToken` - Refresh an authentication token

### Document Management

- `briefs.upload` - Upload a new document
- `briefs.getById` - Get a single document by ID
- `briefs.list` - List documents with filtering and sorting
- `briefs.resetSummary` - Reset a document's summary for regeneration

## Environment Variables

Copy `.env.example` to `.env` and configure:

```
# Server
PORT=3001
NODE_ENV=development

# Database (Supabase)
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
SUPABASE_JWT_SECRET=your_jwt_secret

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# CORS settings
CORS_ORIGIN=http://localhost:3000
```

## Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **API Framework**: tRPC + Express
- **Database**: PostgreSQL (via Supabase)
- **Storage**: Supabase Storage
- **AI Integration**: OpenAI API
- **Authentication**: JWT with HTTP-only cookies

## Development

### Debugging

Enable debug logs with the `DEBUG` environment variable:

```
DEBUG=api:* pnpm dev
```

### Adding New Endpoints

1. Define procedure input validation with Zod
2. Add a new procedure to the appropriate router
3. Implement business logic in separate service files
4. Update the main router export in `trpc/router.ts`
