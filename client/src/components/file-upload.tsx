import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CloudUpload, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  uploadedFile: File | null;
}

export function FileUpload({ onFileSelect, uploadedFile }: FileUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const clearFile = () => {
    onFileSelect(null as any);
  };

  if (uploadedFile) {
    return (
      <Card className="p-3 border border-slate-200 bg-slate-50" data-testid="file-selected">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-emerald-600" />
            <span className="text-sm text-slate-700" data-testid="text-filename">
              {uploadedFile.name}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFile}
            className="text-slate-400 hover:text-slate-600"
            data-testid="button-clear-file"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colors cursor-pointer",
        isDragActive && "border-primary-400 bg-primary-50"
      )}
      data-testid="file-upload-area"
    >
      <input {...getInputProps()} data-testid="input-file" />
      <div className="space-y-2">
        <CloudUpload className="h-12 w-12 text-slate-400 mx-auto" />
        <div>
          <p className="text-sm font-medium text-slate-600" data-testid="upload-text-primary">
            {isDragActive ? "Dosyayı bırakın" : "Excel dosyası yükleyin"}
          </p>
          <p className="text-xs text-slate-500" data-testid="upload-text-secondary">
            ya da sürükleyip bırakın
          </p>
        </div>
        <p className="text-xs text-slate-400" data-testid="upload-text-format">.xlsx formatı desteklenir</p>
      </div>
    </div>
  );
}
