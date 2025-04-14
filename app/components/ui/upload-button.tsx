import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UploadButtonProps {
  className?: string;
}

export function UploadButton({ className }: UploadButtonProps) {
  return (
    <Button
      asChild
      className={cn("bg-orange-500 hover:bg-orange-600 text-white", className)}
    >
      <Link href="/briefs/upload" aria-label="Upload new brief">
        <Plus className="h-4 w-4 sm:mr-2" />
        <span className="hidden sm:inline">Upload document</span>
      </Link>
    </Button>
  );
}
