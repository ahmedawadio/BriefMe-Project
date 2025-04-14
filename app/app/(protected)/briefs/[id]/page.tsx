"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  AlertCircle,
  FileText,
  Download,
  Calendar,
  Clock,
  Eye,
  RefreshCcw,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import useBrief from "@/hooks/useBrief";
import { formatDistanceToNow } from "date-fns";

/**
 * Brief Detail Page Component
 *
 * Displays detailed information about a specific document/brief:
 * - Shows document metadata, notes, and AI-generated summary
 * - Provides option to view the original file
 * - Allows regeneration of the summary if needed
 * - Handles various states: loading, error, not found
 * - Includes back navigation to the briefs list
 */
export default function BriefDetailPage() {
  const params = useParams();
  const briefId = params.id as string;

  // Custom hook for fetching and managing single brief data
  const {
    brief,
    isLoading,
    error,
    notFound,
    resetSummary,
    isResetting,
    isPolling,
    resetError,
  } = useBrief(briefId);

  // Show loading skeleton while fetching data
  if (isLoading) {
    return <BriefDetailSkeleton />;
  }

  // Show error or not found state
  if (error || notFound) {
    return (
      <div className="min-h-screen flex flex-col py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-4xl mx-auto">
          <div className="mb-6">
            <Link
              href="/briefs"
              className="flex items-center text-gray-600 hover:text-orange-500 transition-colors text-sm font-medium"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Briefs
            </Link>
          </div>
          <Card className="shadow-md overflow-hidden">
            <CardHeader className="pb-4 border-b">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-gray-500" />
                <CardTitle className="text-xl">Brief Not Found</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-gray-700 mb-4">
                {error ||
                  "The brief you're looking for doesn't exist or you don't have permission to view it."}
              </p>
              <Button
                className="bg-orange-500 hover:bg-orange-600 text-white"
                size="sm"
                asChild
              >
                <Link href="/briefs">View All Briefs</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Extract and format metadata
  const fileName =
    brief?.file_path?.split("/").pop()?.split("_").slice(1).join("_") ||
    "document.txt";
  const createdAt = brief?.created_at ? new Date(brief.created_at) : new Date();
  const timeAgo = formatDistanceToNow(createdAt, { addSuffix: true });

  return (
    <div className="min-h-screen flex flex-col py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl mx-auto">
        {/* Back navigation link */}
        <div className="mb-6">
          <Link
            href="/briefs"
            className="flex items-center text-gray-600 hover:text-orange-500 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Briefs
          </Link>
        </div>

        {/* Document details card */}
        <Card className="shadow-lg mb-8">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                {/* Document title and icon */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-full bg-orange-100">
                    <FileText className="h-5 w-5 text-orange-500" />
                  </div>
                  <CardTitle className="text-2xl font-bold">
                    {brief?.title}
                  </CardTitle>
                </div>
                {/* Document metadata - creation time */}
                <div className="flex flex-wrap gap-2 mt-2">
                  <div className="flex items-center text-gray-500 text-sm">
                    <Calendar className="h-3.5 w-3.5 mr-1" />
                    <span>Created {timeAgo}</span>
                  </div>
                  <div className="flex items-center text-gray-500 text-sm">
                    <Clock className="h-3.5 w-3.5 mr-1" />
                    <span>
                      {new Date(brief?.created_at || "").toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              {/* View original file button */}
              <Button
                variant="outline"
                size="sm"
                asChild
                className="hover:bg-gray-100"
              >
                <a
                  href={brief?.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Eye className="h-4 w-4 mr-1 text-gray-600" />
                  View File
                </a>
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {/* Notes section */}
            <div className="mb-6">
              <CardTitle className="text-xl mb-3">Notes</CardTitle>

              {brief?.notes ? (
                <p className="text-gray-700 whitespace-pre-line">
                  {brief.notes}
                </p>
              ) : (
                <p className="text-gray-500 italic">
                  No notes were added for this document.
                </p>
              )}
            </div>

            {/* Document file information */}
            <div className="border rounded-md p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-md font-medium">Document</h3>
                <Badge variant="outline" className="text-xs">
                  {fileName}
                </Badge>
              </div>
              <p className="text-sm text-gray-500">
                Use the View File button to access the document content.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* AI summary card */}
        <Card className="shadow-md mb-8">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-xl">Summary</CardTitle>
                <CardDescription>
                  AI-generated summary of your document
                </CardDescription>
              </div>
              {/* Regenerate summary button */}
              <Button
                className="bg-orange-500 hover:bg-orange-600 text-white"
                size="sm"
                onClick={resetSummary}
                disabled={isResetting || isPolling}
              >
                {isResetting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <RefreshCcw className="h-3.5 w-3.5 mr-1" />
                    Regenerate
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Conditional rendering of summary content */}
            {brief?.summary ? (
              <p className="text-gray-700 whitespace-pre-line">
                {brief.summary}
              </p>
            ) : (
              <>
                {/* Loading animation while polling for summary */}
                {isPolling ? (
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-full max-w-[95%]"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-full max-w-[90%]"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-full max-w-[97%]"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-full max-w-[85%]"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-full max-w-[70%]"></div>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">
                    No summary is available for this document yet.
                    {isResetting &&
                      " Summary reset has been triggered and will be regenerated soon."}
                  </p>
                )}
                {/* Error message for summary reset failures */}
                {resetError && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{resetError}</AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Brief Detail Skeleton Component
 *
 * Loading state UI for the brief detail page:
 * - Mimics the structure of the actual detail page
 * - Shows placeholder elements with loading animations
 * - Maintains navigation link to allow going back during loading
 */
function BriefDetailSkeleton() {
  return (
    <div className="min-h-screen flex flex-col py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            href="/briefs"
            className="flex items-center text-gray-600 hover:text-orange-500 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Briefs
          </Link>
        </div>

        <Card className="shadow-lg mb-8">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <Skeleton className="h-8 w-64" />
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <Skeleton className="h-9 w-28 rounded-md border" />
            </div>
          </CardHeader>

          <CardContent>
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-20 w-full mb-6" />

            <div className="border rounded-md p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-32" />
              </div>
              <Skeleton className="h-4 w-full" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md mb-8">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <div>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-64 mt-1" />
              </div>
              <Skeleton className="h-9 w-28 rounded-md border" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
