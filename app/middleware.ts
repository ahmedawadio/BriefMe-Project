import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get auth token from cookies
  const authToken = request.cookies.get('auth-token');
  
  // Check if route should be protected
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/briefs') || 
                          request.nextUrl.pathname.startsWith('/profile');
                          
  // Check if auth route
  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') || 
                     request.nextUrl.pathname.startsWith('/signup');

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && authToken) {
    return NextResponse.redirect(new URL('/briefs', request.url));
  }

  // Redirect unauthenticated users to login
  if (isProtectedRoute && !authToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/briefs/:path*', '/profile/:path*', '/login', '/signup'],
}; 