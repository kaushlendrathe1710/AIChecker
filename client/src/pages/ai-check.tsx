import { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  FileText, 
  Bot, 
  Download, 
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { HighlightedDocument } from "@/components/highlighted-document";
import type { Document, AiCheckResult } from "@shared/schema";

interface AiCheckResponse {
  document: Document;
  aiResult: AiCheckResult;
}

function getVerdictColor(verdict: string): string {
  switch (verdict) {
    case "human": return "bg-green-500/10 text-green-600 border-green-200 dark:border-green-800";
    case "likely_human": return "bg-green-500/10 text-green-600 border-green-200 dark:border-green-800";
    case "mixed": return "bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:border-yellow-800";
    case "likely_ai": return "bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-800";
    case "ai": return "bg-red-500/10 text-red-600 border-red-200 dark:border-red-800";
    default: return "bg-muted text-muted-foreground";
  }
}

function getVerdictLabel(verdict: string): string {
  return verdict.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export default function AiCheck() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedDocId, setUploadedDocId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const { data, isLoading, refetch } = useQuery<AiCheckResponse>({
    queryKey: ["/api/ai-check", uploadedDocId],
    enabled: !!uploadedDocId,
    refetchInterval: isPolling ? 2000 : false,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/ai-check/upload", {
        method: "POST",
        headers: {
          "x-session-id": localStorage.getItem("sessionId") || "",
        },
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }
      
      return response.json();
    },
    onSuccess: (result) => {
      setUploadedDocId(result.document.id);
      setIsPolling(true);
      toast({ title: "Document uploaded", description: "AI analysis has started." });
    },
    onError: (error: Error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await fetch(`/api/ai-check/${documentId}/download-report`, {
        headers: { "x-session-id": localStorage.getItem("sessionId") || "" },
      });
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      const fileName = disposition?.match(/filename="(.+)"/)?.[1] || "ai_report.pdf";
      return { blob, fileName };
    },
    onSuccess: ({ blob, fileName }) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Report downloaded" });
    },
    onError: () => {
      toast({ title: "Download failed", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (data?.aiResult?.status === "completed" && isPolling) {
      setIsPolling(false);
    }
  }, [data?.aiResult?.status, isPolling]);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const allowedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
    
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload PDF, DOCX, or TXT files.", variant: "destructive" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 10MB.", variant: "destructive" });
      return;
    }

    setUploadedDocId(null);
    uploadMutation.mutate(file);
  }, [uploadMutation, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleNewCheck = () => {
    setUploadedDocId(null);
    setIsPolling(false);
  };

  const showResults = data?.aiResult && data.aiResult.status === "completed";
  const isPending = data?.aiResult && data.aiResult.status === "pending";

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2" data-testid="page-title">
          <Bot className="w-6 h-6 text-primary" />
          AI Content Detection
        </h1>
        <p className="text-muted-foreground mt-1">
          Upload a document to detect AI-generated content
        </p>
      </div>

      {!showResults && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Document</CardTitle>
            <CardDescription>
              Supported formats: PDF, DOCX, TXT (max 10MB)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
              } ${uploadMutation.isPending ? "opacity-50 pointer-events-none" : ""}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              data-testid="dropzone-ai-check"
            >
              {uploadMutation.isPending || isPending ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-12 h-12 text-primary animate-spin" />
                  <div>
                    <p className="font-medium">Analyzing document...</p>
                    <p className="text-sm text-muted-foreground">
                      This may take a minute
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="font-medium mb-2">
                    Drop your file here or click to browse
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    PDF, DOCX, or TXT files up to 10MB
                  </p>
                  <input
                    type="file"
                    id="file-input"
                    className="hidden"
                    accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    onChange={(e) => handleFileSelect(e.target.files)}
                    data-testid="input-file-ai-check"
                  />
                  <Button asChild>
                    <label htmlFor="file-input" className="cursor-pointer" data-testid="button-browse-ai-check">
                      <FileText className="w-4 h-4 mr-2" />
                      Browse Files
                    </label>
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {showResults && data && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {data.document.fileName}
                </CardTitle>
                <CardDescription>
                  {data.document.wordCount?.toLocaleString() || 0} words analyzed
                </CardDescription>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadMutation.mutate(data.document.id)}
                  disabled={downloadMutation.isPending}
                  data-testid="button-download-ai-report"
                >
                  {downloadMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Download Report
                </Button>
                <Button size="sm" onClick={handleNewCheck} data-testid="button-new-ai-check">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  New Check
                </Button>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Detection Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6 mb-6">
                <div className="relative w-32 h-32">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      className="text-muted"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${(data.aiResult.aiScore / 100) * 352} 352`}
                      className={data.aiResult.aiScore > 60 ? "text-red-500" : data.aiResult.aiScore > 40 ? "text-yellow-500" : "text-green-500"}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold" data-testid="text-ai-score">
                      {Math.round(data.aiResult.aiScore)}%
                    </span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg font-medium">Verdict:</span>
                    <Badge className={getVerdictColor(data.aiResult.verdict)} data-testid="badge-ai-verdict">
                      {getVerdictLabel(data.aiResult.verdict)}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground" data-testid="text-ai-analysis">
                    {data.aiResult.analysis}
                  </p>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-green-600" data-testid="text-human-score">
                    {Math.round(100 - data.aiResult.aiScore)}%
                  </p>
                  <p className="text-sm text-muted-foreground">Human Content</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-red-600" data-testid="text-ai-content-score">
                    {Math.round(data.aiResult.aiScore)}%
                  </p>
                  <p className="text-sm text-muted-foreground">AI Content</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold" data-testid="text-sections-flagged">
                    {(data.aiResult.highlightedSections as any[])?.length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Sections Flagged</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold" data-testid="text-scan-duration">
                    {data.aiResult.scanDuration || 0}s
                  </p>
                  <p className="text-sm text-muted-foreground">Scan Duration</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {data.document.extractedText && (data.aiResult.highlightedSections as any[])?.length > 0 && (
            <HighlightedDocument
              text={data.document.extractedText}
              sections={(data.aiResult.highlightedSections as any[]).map(s => ({
                text: s.text,
                startIndex: s.startIndex || -1,
                endIndex: s.endIndex || -1,
                aiProbability: s.aiProbability,
                reason: s.reason,
              }))}
              type="ai"
              title="Document with AI-Generated Content Highlighted"
            />
          )}

          {(data.aiResult.highlightedSections as any[])?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                  Detected AI-Generated Sections
                </CardTitle>
                <CardDescription>
                  The following sections show patterns consistent with AI-generated content
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(data.aiResult.highlightedSections as any[]).map((section, index) => (
                  <div 
                    key={index} 
                    className="p-4 rounded-lg border bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800"
                    data-testid={`ai-section-${index}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="text-orange-600">
                        {Math.round(section.aiProbability)}% AI probability
                      </Badge>
                    </div>
                    <p className="text-sm mb-2 line-clamp-4">
                      "{section.text}"
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Reason:</strong> {section.reason}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
