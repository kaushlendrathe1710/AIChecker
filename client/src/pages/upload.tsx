import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getSessionId } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  FileText,
  X,
  CheckCircle2,
  Loader2,
  FileUp,
  AlertCircle,
} from "lucide-react";

interface UploadedFile {
  file: File;
  id?: string;
  progress: number;
  status: "uploading" | "uploaded" | "scanning" | "error";
  error?: string;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

const FILE_TYPE_LABELS: Record<string, string> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "text/plain": "TXT",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const sessionId = getSessionId();
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        headers: { "x-session-id": sessionId || "" },
        body: formData,
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      
      return res.json();
    },
  });

  const scanMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const sessionId = getSessionId();
      const res = await fetch(`/api/documents/${documentId}/scan`, {
        method: "POST",
        headers: { "x-session-id": sessionId || "" },
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Scan failed");
      }
      
      return res.json();
    },
  });

  const handleFiles = useCallback(async (fileList: FileList | File[]) => {
    const newFiles = Array.from(fileList).filter((file) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a supported file type. Please upload PDF, DOCX, or TXT files.`,
          variant: "destructive",
        });
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds the 10MB size limit.`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    for (const file of newFiles) {
      const uploadFile: UploadedFile = {
        file,
        progress: 0,
        status: "uploading",
      };
      
      setFiles((prev) => [...prev, uploadFile]);

      try {
        const result = await uploadMutation.mutateAsync(file);
        
        setFiles((prev) =>
          prev.map((f) =>
            f.file === file
              ? { ...f, id: result.document.id, progress: 100, status: "uploaded" }
              : f
          )
        );
        
        queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
        queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      } catch (error) {
        setFiles((prev) =>
          prev.map((f) =>
            f.file === file
              ? { ...f, status: "error", error: (error as Error).message }
              : f
          )
        );
      }
    }
  }, [uploadMutation, toast, queryClient]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files);
      }
    },
    [handleFiles]
  );

  const removeFile = useCallback((file: File) => {
    setFiles((prev) => prev.filter((f) => f.file !== file));
  }, []);

  const startScan = useCallback(async (uploadedFile: UploadedFile) => {
    if (!uploadedFile.id) return;
    
    setFiles((prev) =>
      prev.map((f) =>
        f.id === uploadedFile.id ? { ...f, status: "scanning" } : f
      )
    );

    try {
      await scanMutation.mutateAsync(uploadedFile.id);
      toast({
        title: "Scan started",
        description: "Your document is being analyzed. This may take a few minutes.",
      });
      navigate(`/documents`);
    } catch (error) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadedFile.id
            ? { ...f, status: "error", error: (error as Error).message }
            : f
        )
      );
    }
  }, [scanMutation, toast, navigate]);

  const uploadedFiles = files.filter((f) => f.status === "uploaded");
  const canStartScan = uploadedFiles.length > 0;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Upload Document</h1>
        <p className="text-muted-foreground mt-1">
          Upload your document to check for plagiarism and AI-generated content
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Files</CardTitle>
          <CardDescription>
            Drag and drop your files or click to browse. Supports PDF, DOCX, and TXT files up to 10MB.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`relative border-2 border-dashed rounded-lg transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              multiple
              onChange={handleInputChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              data-testid="input-file"
            />
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <p className="text-lg font-medium text-foreground mb-1">
                Drop your files here
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                or click to browse from your computer
              </p>
              <div className="flex gap-2">
                <Badge variant="secondary">PDF</Badge>
                <Badge variant="secondary">DOCX</Badge>
                <Badge variant="secondary">TXT</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Files</CardTitle>
            <CardDescription>
              {uploadedFiles.length} of {files.length} files ready for scanning
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {files.map((uploadedFile, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-4 rounded-lg border"
                data-testid={`file-row-${index}`}
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted flex-shrink-0">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{uploadedFile.file.name}</p>
                    <Badge variant="outline" className="flex-shrink-0">
                      {FILE_TYPE_LABELS[uploadedFile.file.type] || "File"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{formatFileSize(uploadedFile.file.size)}</span>
                    {uploadedFile.status === "uploading" && (
                      <>
                        <span className="text-muted-foreground/50">|</span>
                        <span>Uploading...</span>
                      </>
                    )}
                    {uploadedFile.status === "scanning" && (
                      <>
                        <span className="text-muted-foreground/50">|</span>
                        <span className="text-blue-600">Scanning...</span>
                      </>
                    )}
                    {uploadedFile.status === "error" && (
                      <>
                        <span className="text-muted-foreground/50">|</span>
                        <span className="text-destructive">{uploadedFile.error}</span>
                      </>
                    )}
                  </div>
                  {uploadedFile.status === "uploading" && (
                    <Progress value={uploadedFile.progress} className="h-1 mt-2" />
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {uploadedFile.status === "uploading" && (
                    <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                  )}
                  {uploadedFile.status === "uploaded" && (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  )}
                  {uploadedFile.status === "scanning" && (
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                  )}
                  {uploadedFile.status === "error" && (
                    <AlertCircle className="w-5 h-5 text-destructive" />
                  )}
                  {(uploadedFile.status === "uploaded" || uploadedFile.status === "error") && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(uploadedFile.file)}
                      data-testid={`button-remove-${index}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {canStartScan && (
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setFiles([])}>
            Clear All
          </Button>
          <Button
            onClick={() => uploadedFiles.forEach(startScan)}
            disabled={scanMutation.isPending}
            data-testid="button-start-scan"
          >
            {scanMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Starting Scan...
              </>
            ) : (
              <>
                <FileUp className="w-4 h-4 mr-2" />
                Start Scanning ({uploadedFiles.length} file{uploadedFiles.length > 1 ? "s" : ""})
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
