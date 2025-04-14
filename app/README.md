# BriefMe Frontend

BriefMe is a Next.js application for summarizing and managing document briefs, built with a modern React architecture.

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Architecture

BriefMe follows a clean architecture pattern with clear separation of concerns:

### Folder Structure

```
app/
├── app/              # Next.js App Router pages and layouts
│   ├── (auth)/       # Authentication-related pages (login/signup)
│   ├── (protected)/  # Routes that require authentication
│   └── layout.tsx    # Root layout with providers
├── components/       # React components
│   ├── ui/           # UI components (buttons, cards, etc.)
│   └── system/       # Headless utility components
├── hooks/            # React hooks for state and API integration
├── providers/        # Context providers for global state
├── services/         # API service layer
├── stores/           # Client-side state management (Zustand)
└── utils/            # Utility functions and API clients
```

### Key Patterns

#### 1. Authentication

Authentication uses HTTP-only cookies for secure token storage with:

- `SessionRefresher` component to maintain token freshness
- Middleware for route protection
- `useAuth` hook + Zustand store for client-side state

**Protected Routes:**

- All brief-related routes (`/briefs/*`) require authentication
- Server-side middleware redirects unauthenticated users to login
- Client-side protection prevents route access during navigation
- Users can only access their own briefs (row-level security)

#### 2. State Management

- **Zustand stores**: For persistent client-state (`auth.store.ts`)
- **React Query**: For server-state via TRPC
- **React hooks**: Combine stores and services for components

#### 3. API Communication

- **TRPC**: Type-safe API communication
- **Services**: API methods organized by domain
- **Hooks**: Wrap TRPC with React state management

#### 4. Component Hierarchy

```
Layout (providers) → Protected Layout → Page → Components
```

Each component uses hooks for data and state management, while layouts handle authentication and structure.

## Core Functionality

### Document Management

- **Upload**: Users can upload text files (up to 50MB) with title and notes
- **View**: After upload, users are redirected to the brief detail page (`/briefs/[id]`)
- **Search**: Search functionality across document titles, notes, and summaries

### Summarization

- **Background Processing**: Summaries are generated asynchronously after upload
- **Polling**: The system polls every 6 seconds (for up to a minute) to check if summary is ready
- **Regeneration**: Users can manually trigger summary regeneration if needed

### User Experience

- **Responsive Design**: Adapts to different screen sizes
- **Loading States**: Clear loading indicators during API operations

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **UI**: Tailwind CSS with shadcn/ui components
- **State**: Zustand (client) + React Query (server)
- **API**: TRPC for type-safe API calls
- **Authentication**: HTTP-only cookies with JWT

## Development

### Code Style

- Use functional components with hooks
- Follow clean architecture principles
- Keep components small and focused
- Separate UI logic from business logic

## Future Considerations

- **Monitoring**: Implement Sentry for error tracking and Postman for API testing
- **Document Editing**: Allow users to edit uploaded documents and notes
- **Real-time Updates**: Replace polling with WebSockets or server-sent events for immediate summary notifications
- **Enhanced Search**: Implement full-text search with indexing
- **Collaboration**: Sharing documents with other users
