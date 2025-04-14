"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Worm, Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";

/**
 * Login Page Component
 *
 * Provides user authentication functionality:
 * - Email and password input fields with validation
 * - Form submission handling with error messages
 * - Password visibility toggle
 * - Loading state indicators during authentication
 * - Link to signup page for new users
 */
export default function LoginPage() {
  // State management for form inputs and UI
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Get authentication methods and loading state from auth hook
  const { login, isLoading } = useAuth();

  /**
   * Form submission handler
   * Validates inputs and attempts login
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Basic form validation
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    try {
      await login(email, password);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
      // Clear password on error
      setPassword("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <Card className="shadow-lg">
          {/* App branding and header */}
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-orange-100">
                <Worm className="h-6 w-6 text-orange-500" />
              </div>
              <CardTitle className="text-2xl font-bold">BriefMe</CardTitle>
            </div>
            <CardDescription>
              Login to your personal briefing app
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              {/* Error alert shown when login fails */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Email input field */}
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-gray-700"
                >
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-10"
                  disabled={isLoading.login}
                />
              </div>

              {/* Password input with visibility toggle */}
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-10 pr-10"
                    disabled={isLoading.login}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                    disabled={isLoading.login}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </CardContent>

            {/* Login button and signup link */}
            <CardFooter className="flex flex-col space-y-6 pt-6">
              <Button
                type="submit"
                className="w-full h-10 bg-orange-500"
                disabled={isLoading.login}
              >
                {isLoading.login ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Login"
                )}
              </Button>
              <Link
                href="/signup"
                className="text-sm text-center text-muted-foreground underline"
              >
                Don't have an account? Sign Up
              </Link>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
