"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/ui/file-upload";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  FileText,
  ArrowLeft,
  FileIcon,
  Loader2,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  exampleContents,
  fetchExampleContent,
  PrefillContent,
} from "@/utils/prefillUtils";
import useBriefUpload from "@/hooks/useBriefUpload";

/**
 * Upload Brief Page Component
 *
 * Provides functionality for users to upload new documents:
 * - Form with title, notes, and file upload fields
 * - Validation for required fields
 * - Example document templates for quick testing
 * - Loading states during upload process
 * - Error handling and user feedback
 * - Navigation back to the briefs list
 */
export default function UploadBriefPage() {
  // Form state management
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [document, setDocument] = useState<File | null>(null);

  // Example content loading state
  const [isLoadingExample, setIsLoadingExample] = useState(false);
  const [loadingExampleId, setLoadingExampleId] = useState<string | null>(null);

  // Custom hook for handling document upload
  const { uploadBrief, isUploading, error, setError } = useBriefUpload();

  /**
   * Form submission handler
   * Validates inputs and submits the upload
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!title) {
      setError("Please enter a title");
      return;
    }

    if (!document) {
      setError("Please upload a document");
      return;
    }

    // Use the upload brief hook to handle the upload
    uploadBrief({
      title,
      notes,
      file: document,
    });
  };

  /**
   * Example document selection handler
   * Loads pre-defined example content into the form
   */
  const handleExampleSelect = async (exampleId: string) => {
    if (exampleId === "placeholder") return;
    if (isLoadingExample) return; // Prevent multiple selections while loading

    setIsLoadingExample(true);
    setLoadingExampleId(exampleId);
    setError(null);

    // Pre-load the example content without changing the UI
    let newTitle = "";
    let newNotes = "";
    let newFile: File | null = null;

    try {
      const selectedExample = exampleContents.find(
        (_, index) => index.toString() === exampleId
      );

      if (selectedExample) {
        newTitle = selectedExample.title;
        newNotes = selectedExample.notes;

        const exampleFile = await fetchExampleContent(selectedExample.filePath);
        if (exampleFile) {
          newFile = exampleFile;
        } else {
          setError("Could not load example file");
        }
      }

      // Apply all the changes at once
      if (!error) {
        setTitle(newTitle);
        setNotes(newNotes);
        setDocument(newFile);
      }
    } catch (err) {
      setError("Failed to load example content");
      console.error(err);
    } finally {
      // Slight delay to prevent flickering
      setTimeout(() => {
        setIsLoadingExample(false);
        setLoadingExampleId(null);
      }, 300);
    }
  };

  return (
    <div className="min-h-screen flex flex-col py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md mx-auto">
        {/* Back navigation link */}
        <div className="mb-4">
          <Link
            href="/briefs"
            className="flex items-center text-gray-600 hover:text-orange-500 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </div>
        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <div className="flex justify-between items-center">
              {/* Page title and icon */}
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-orange-100">
                  <FileText className="h-6 w-6 text-orange-500" />
                </div>
                <CardTitle className="text-2xl font-bold">
                  Upload Document
                </CardTitle>
              </div>

              {/* Example document selection dropdown */}
              <Select
                onValueChange={handleExampleSelect}
                disabled={isLoadingExample || isUploading}
                value={loadingExampleId || undefined}
              >
                <SelectTrigger
                  className="w-8 h-8 p-0 border-none bg-transparent focus:ring-0"
                  hideIcon={true}
                >
                  {isLoadingExample ? (
                    <Loader2 className="h-5 w-5 text-orange-500 animate-spin" />
                  ) : (
                    <Settings2 className="h-5 w-5 text-gray-400 hover:text-orange-500" />
                  )}
                </SelectTrigger>
                <SelectContent align="end" className="w-[240px]">
                  <SelectItem value="placeholder" className="font-medium">
                    Select example document
                  </SelectItem>
                  {exampleContents.map((example, index) => (
                    <SelectItem
                      key={index}
                      value={index.toString()}
                      className="py-3"
                      disabled={isLoadingExample || isUploading}
                    >
                      <div className="flex items-start gap-2">
                        {loadingExampleId === index.toString() &&
                        isLoadingExample ? (
                          <Loader2 className="h-4 w-4 mt-0.5 text-orange-500 animate-spin flex-shrink-0" />
                        ) : (
                          <FileIcon className="h-4 w-4 mt-0.5 text-orange-500 flex-shrink-0" />
                        )}
                        <div className="flex flex-col">
                          <span className="font-medium">{example.title}</span>
                          <span className="text-xs text-gray-500">
                            {example.filePath.split("/").pop()}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <CardDescription>
              Upload a document to create a new brief
            </CardDescription>
          </CardHeader>

          {/* Upload form */}
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              {/* Error display */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Title input field */}
              <div className="space-y-2">
                <label
                  htmlFor="title"
                  className="text-sm font-medium text-gray-700"
                >
                  Title <span className="text-red-500">*</span>
                </label>
                <Input
                  id="title"
                  type="text"
                  placeholder="Enter brief title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="h-10 transition-all duration-200"
                  disabled={isLoadingExample || isUploading}
                />
              </div>

              {/* Notes textarea */}
              <div className="space-y-2">
                <label
                  htmlFor="notes"
                  className="text-sm font-medium text-gray-700"
                >
                  Notes <span className="text-gray-400">(optional)</span>
                </label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes or context about this document"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-24 transition-all duration-200"
                  disabled={isLoadingExample || isUploading}
                />
              </div>

              {/* File upload component */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Document <span className="text-red-500">*</span>
                </label>
                <div
                  className={`transition-opacity duration-300 ${
                    isLoadingExample || isUploading
                      ? "opacity-60"
                      : "opacity-100"
                  }`}
                >
                  <FileUpload
                    onChange={setDocument}
                    value={document}
                    maxSizeMB={50}
                    acceptedFileTypes={[".txt"]}
                    disabled={isLoadingExample || isUploading}
                  />
                </div>
              </div>
            </CardContent>

            {/* Upload button */}
            <CardFooter className="flex flex-col space-y-6 pt-6">
              <Button
                type="submit"
                className="w-full h-10 bg-orange-500 hover:bg-orange-600 transition-all duration-200"
                disabled={isLoadingExample || isUploading}
              >
                {isUploading ? (
                  <div className="flex items-center">
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Uploading...
                  </div>
                ) : (
                  "Upload"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
