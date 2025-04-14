import { initTRPC, TRPCError } from '@trpc/server';
import { Context } from './context';
import { authRouter } from './auth';
import { briefsRouter } from './briefs';

/**
 * Main tRPC Router Configuration
 * 
 * Sets up the central API router with:
 * - Type-safe procedures (endpoints)
 * - Authentication middleware
 * - Sub-routers for different feature domains
 * 
 * This is the entry point for all API requests
 */

const t = initTRPC.context<Context>().create();

/**
 * Authentication Middleware
 * 
 * Validates user authentication before allowing access to protected endpoints
 * Attaches the authenticated user to the request context
 * Throws UNAUTHORIZED error if user is not authenticated
 */
const isAuthed = t.middleware(({ next, ctx }) => {
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

// Base router and procedure creators
export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthed);

/**
 * Application Router
 * 
 * Combines all domain-specific routers into a single API
 * - auth: Authentication endpoints (login, signup, etc.)
 * - briefs: Document management endpoints
 */
export const appRouter = router({
  auth: authRouter,
  briefs: briefsRouter,
});

// Export type definition of router for client-side type inference
export type AppRouter = typeof appRouter; 