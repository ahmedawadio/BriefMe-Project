import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function BriefDetailLoading() {
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

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-4">
            <Skeleton className="h-8 w-2/3 mb-2" />
            <Skeleton className="h-4 w-1/3" />
          </div>

          <div className="border-t border-gray-200 pt-4 mt-6">
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </div>

          <div className="border-t border-gray-200 pt-4 mt-6">
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
 