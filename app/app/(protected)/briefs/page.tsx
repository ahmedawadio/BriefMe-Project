"use client";

import {
  FileText,
  SortAsc,
  SortDesc,
  CalendarDays,
  SearchIcon,
  InfoIcon,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UploadButton } from "@/components/ui/upload-button";
import useBriefsList from "@/hooks/useBriefsList";
import { Brief } from "@/services/briefs.service";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Briefs Page Component
 *
 * Main dashboard for viewing all user documents/briefs:
 * - Displays grid of document cards with their details
 * - Provides search functionality across document metadata
 * - Supports sorting by date or title with direction toggle
 * - Shows appropriate loading, error, and empty states
 * - Contains a direct link to upload new documents
 */
export default function BriefsPage() {
  // Custom hook for fetching and managing briefs list data
  const {
    filteredBriefs,
    isLoading,
    error,
    sort,
    searchTerm,
    setSearchTerm,
    toggleSortDirection,
    changeSortField,
    refetch,
  } = useBriefsList();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col space-y-6">
        {/* Page header with title and upload button */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <UploadButton />
        </div>

        {/* Search and sort controls */}
        <div className="flex items-center justify-between">
          {/* Search input with tooltip */}
          <div className="relative w-full max-w-sm">
            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="search"
              placeholder="Search "
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="h-4 w-4 absolute right-2.5 top-2.5 text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    Search across title, notes, filename, and summary
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Sort dropdown menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-2">
                {sort.orderBy === "created_at" ? "Date" : "Title"}
                {sort.orderDirection === "asc" ? (
                  <SortAsc className="ml-2 h-4 w-4" />
                ) : (
                  <SortDesc className="ml-2 h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => changeSortField("created_at")}>
                <CalendarDays className="mr-2 h-4 w-4" />
                <span>Sort by date</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeSortField("title")}>
                <FileText className="mr-2 h-4 w-4" />
                <span>Sort by title</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleSortDirection}>
                {sort.orderDirection === "asc" ? (
                  <>
                    <SortDesc className="mr-2 h-4 w-4" />
                    <span>Descending</span>
                  </>
                ) : (
                  <>
                    <SortAsc className="mr-2 h-4 w-4" />
                    <span>Ascending</span>
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Conditional rendering based on data state */}
        {isLoading ? (
          // Loading skeleton grid
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <BriefCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          // Error state with retry button
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={refetch}>Try Again</Button>
          </div>
        ) : filteredBriefs.length === 0 ? (
          // Empty state with helpful message
          <div className="flex flex-col items-center justify-center py-12">
            {searchTerm ? (
              // No search results state
              <>
                <p className="text-gray-500 mb-4">
                  No documents found matching "{searchTerm}"
                </p>
                <Button onClick={() => setSearchTerm("")}>Clear Search</Button>
              </>
            ) : (
              // No documents state with upload button
              <>
                <p className="text-gray-500 mb-4">
                  You don't have any documents yet
                </p>
                <UploadButton />
              </>
            )}
          </div>
        ) : (
          // Documents grid with brief cards
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBriefs.map((brief) => (
              <BriefCard key={brief.id} brief={brief} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Brief Card Component
 *
 * Displays a single document/brief as a card:
 * - Shows title, notes preview, and file metadata
 * - Displays time since creation in human-readable format
 * - Includes status badge showing if document is summarized
 * - Wraps entire card as a link to the detail page
 */
interface BriefCardProps {
  brief: Brief;
}

function BriefCard({ brief }: BriefCardProps) {
  // Format dates and extract filename
  const createdAt = new Date(brief.created_at);
  const timeAgo = formatDistanceToNow(createdAt, { addSuffix: true });
  const fileName =
    brief.file_path.split("/").pop()?.split("_").slice(1).join("_") ||
    "document.txt";

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <Link href={`/briefs/${brief.id}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-orange-100 flex-shrink-0">
              <FileText className="h-4 w-4 text-orange-500" />
            </div>
            <CardTitle className="text-lg leading-tight line-clamp-2">
              {brief.title}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pb-3 space-y-3">
          {/* Notes preview with fallback for empty notes */}
          {brief.notes ? (
            <p className="text-gray-600 text-sm line-clamp-2">{brief.notes}</p>
          ) : (
            <p className="text-gray-400 text-sm italic">No notes</p>
          )}
          <p className="text-xs text-gray-500">{timeAgo}</p>
        </CardContent>
        <CardFooter className="pt-0 pb-4">
          <div className="flex w-full justify-between items-center">
            {/* Filename display with truncation for long names */}
            <Badge variant="outline" className="text-xs truncate max-w-[70%]">
              {fileName}
            </Badge>
            {/* Status badge - green for summarized, gray for raw documents */}
            {brief.summary ? (
              <Badge className="bg-green-100 text-green-800 hover:bg-green-200 text-xs">
                Summarized
              </Badge>
            ) : (
              <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200 text-xs">
                Raw
              </Badge>
            )}
          </div>
        </CardFooter>
      </Link>
    </Card>
  );
}

/**
 * Brief Card Skeleton Component
 *
 * Placeholder UI shown while loading brief cards:
 * - Mimics the structure of the actual BriefCard
 * - Uses Skeleton components for loading animation
 * - Maintains the same layout for smooth transition when data loads
 */
function BriefCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div>
            <Skeleton className="h-5 w-40" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-24" />
      </CardContent>
      <CardFooter className="pt-0 pb-4">
        <div className="flex w-full justify-between items-center">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-20" />
        </div>
      </CardFooter>
    </Card>
  );
}
