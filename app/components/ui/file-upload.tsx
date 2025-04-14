import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Upload, File, AlertCircle, Trash2 } from "lucide-react";

interface FileUploadProps {
  className?: string;
  onChange: (file: File | null) => void;
  maxSizeMB?: number;
  acceptedFileTypes?: string[];
  value?: File | null;
  disabled?: boolean;
}

export function FileUpload({
  className,
  onChange,
  maxSizeMB = 50,
  acceptedFileTypes = [".txt"],
  value = null,
  disabled = false,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(value);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update internal file state when external value changes
  useEffect(() => {
    setFile(value);
  }, [value]);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  const acceptedTypes = acceptedFileTypes.join(",");

  const validateFile = (file: File): boolean => {
    setError(null);

    // Check file size
    if (file.size > maxSizeBytes) {
      setError(`File size exceeds ${maxSizeMB}MB limit`);
      return false;
    }

    // Check file type
    const fileExtension = `.${file.name.split(".").pop()?.toLowerCase()}`;
    if (!acceptedFileTypes.includes(fileExtension)) {
      setError(`Only ${acceptedFileTypes.join(", ")} files are accepted`);
      return false;
    }

    return true;
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    if (disabled) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFile = e.dataTransfer.files[0];
      if (validateFile(newFile)) {
        setFile(newFile);
        onChange(newFile);
      } else {
        onChange(null);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.target.files && e.target.files.length > 0) {
      const newFile = e.target.files[0];
      if (validateFile(newFile)) {
        setFile(newFile);
        onChange(newFile);
      } else {
        onChange(null);
      }
    }
  };

  const handleClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const handleRemove = (e: React.MouseEvent) => {
    if (disabled) return;
    e.stopPropagation();
    setFile(null);
    setError(null);
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept={acceptedTypes}
        disabled={disabled}
      />

      {file ? (
        <div
          className={cn(
            "flex items-center justify-between p-3 rounded-lg border transition-colors",
            disabled
              ? "cursor-not-allowed opacity-70 bg-gray-50 border-gray-200"
              : "bg-gray-50 border-gray-200"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-gray-100">
              <File
                className={cn(
                  "h-5 w-5",
                  disabled ? "text-gray-400" : "text-gray-500"
                )}
              />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-700 truncate max-w-[220px]">
                {file.name}
              </span>
              <span className="text-xs text-gray-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
          </div>
          {!disabled && (
            <button
              onClick={handleRemove}
              className="p-1.5 rounded-full hover:bg-gray-200 transition-colors"
              disabled={disabled}
              aria-label="Remove file"
            >
              <Trash2 className="h-4 w-4 text-gray-500" />
            </button>
          )}
        </div>
      ) : (
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer text-center",
            disabled
              ? "cursor-not-allowed opacity-70 bg-gray-50 border-gray-200"
              : isDragging
              ? "border-orange-500 bg-orange-50"
              : error
              ? "border-red-300 bg-red-50"
              : "border-gray-300 hover:border-orange-500 hover:bg-orange-50"
          )}
        >
          <div className="flex flex-col items-center space-y-2">
            {error ? (
              <>
                <AlertCircle className="h-10 w-10 text-red-500" />
                <p className="text-sm font-medium text-red-600">{error}</p>
              </>
            ) : (
              <>
                <Upload
                  className={cn(
                    "h-10 w-10",
                    disabled ? "text-gray-300" : "text-gray-400"
                  )}
                />
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {disabled
                      ? "Upload disabled"
                      : "Drag and drop your file here"}
                  </p>
                  {!disabled && (
                    <p className="text-xs text-gray-500">or click to browse</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <p className="text-xs text-gray-500 mt-2 text-left">
        Only .txt files. Maximum size: {maxSizeMB}MB
      </p>
    </div>
  );
}
