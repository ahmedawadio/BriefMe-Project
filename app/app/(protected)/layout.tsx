"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Protected Layout Component
 *
 * Wraps authenticated routes with common layout elements:
 * - Authentication check with redirect to login if unauthenticated
 * - Top navigation bar with app branding
 * - User profile popover showing email
 * - Logout button functionality
 * - Loading state while checking authentication
 */
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  // Authentication check effect
  // Redirects to login page if user is not authenticated
  useEffect(() => {
    if (!isLoading.auth && !user) {
      router.replace("/login");
    }
  }, [user, isLoading.auth, router]);

  // Show loading spinner while checking authentication status
  if (isLoading.auth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't render any content if user is not authenticated
  // This prevents any protected content from flashing before redirect
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen">
      {/* Top navigation bar */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* App branding/logo */}
            <div className="flex items-center">
              <Link
                href="/briefs"
                className="text-xl font-semibold hover:text-orange-500 transition-colors"
              >
                BriefMe
              </Link>
            </div>
            {/* User actions area (profile and logout) */}
            <div className="flex items-center space-x-4">
              {/* User profile popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10">
                    <User size={24} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Your Email</span>
                    <span className="text-sm text-gray-500">{user.email}</span>
                  </div>
                </PopoverContent>
              </Popover>
              {/* Logout button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                disabled={isLoading.logout}
                className="h-10 w-10"
              >
                <LogOut size={24} />
              </Button>
            </div>
          </div>
        </div>
      </nav>
      {/* Main content area */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
