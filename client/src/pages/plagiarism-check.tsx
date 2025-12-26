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
  Search, 
  Download, 
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { HighlightedDocument } from "@/components/highlighted-document";
import type { Document, PlagiarismCheckResult, PlagiarismMatch } from "@shared/schema";

interface PlagiarismCheckResponse {
  document: Document;
  plagiarismResult: PlagiarismCheckResult;
  matches: PlagiarismMatch[];
}

function getVerdictColor(verdict: string): string {
  switch (verdict) {
    case "original": return "bg-green-500/10 text-green-600 border-green-200 dark:border-green-800";
    case "low": return "bg-green-500/10 text-green-600 border-green-200 dark:border-green-800";
    case "moderate": return "bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:border-yellow-800";
    case "high": return "bg-red-500/10 text-red-600 border-red-200 dark:border-red-800";
    default: return "bg-muted text-muted-foreground";
  }
}

function getVerdictLabel(verdict: string): string {
  switch (verdict) {
    case "original": return "Original Content";
    case "low": return "Low Similarity";
    case "moderate": return "Moderate Similarity";
    case "high": return "High Similarity";
    default: return verdict;
  }
}

export default function PlagiarismCheck() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedDocId, setUploadedDocId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const { data, isLoading, refetch } = useQuery<PlagiarismCheckResponse>({
    queryKey: ["/api/plagiarism-check", uploadedDocId],
    enabled: !!uploadedDocId,
    refetchInterval: isPolling ? 2000 : false,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/plagiarism-check/upload", {
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
      toast({ title: "Document uploaded", description: "Plagiarism analysis has started." });
    },
    onError: (error: Error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await fetch(`/api/plagiarism-check/${documentId}/download-report`, {
        headers: { "x-session-id": localStorage.getItem("sessionId") || "" },
      });
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      const fileName = disposition?.match(/filename="(.+)"/)?.[1] || "plagiarism_report.pdf";
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
    if (data?.plagiarismResult?.status === "completed" && isPolling) {
      setIsPolling(false);
    }
  }, [data?.plagiarismResult?.status, isPolling]);

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

  const showResults = data?.plagiarismResult && data.plagiarismResult.status === "completed";
  const isPending = data?.plagiarismResult && data.plagiarismResult.status === "pending";

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2" data-testid="page-title">
          <Search className="w-6 h-6 text-primary" />
          Plagiarism Detection
        </h1>
        <p className="text-muted-foreground mt-1">
          Upload a document to check for copied content from web sources
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
              data-testid="dropzone-plagiarism-check"
            >
              {uploadMutation.isPending || isPending ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-12 h-12 text-primary animate-spin" />
                  <div>
                    <p className="font-medium">Analyzing document...</p>
                    <p className="text-sm text-muted-foreground">
                      Checking against web sources
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
                    data-testid="input-file-plagiarism-check"
                  />
                  <Button asChild>
                    <label htmlFor="file-input" className="cursor-pointer" data-testid="button-browse-plagiarism-check">
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
                  data-testid="button-download-plagiarism-report"
                >
                  {downloadMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Download Report
                </Button>
                <Button size="sm" onClick={handleNewCheck} data-testid="button-new-plagiarism-check">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  New Check
                </Button>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Plagiarism Score</CardTitle>
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
                      strokeDasharray={`${(data.plagiarismResult.plagiarismScore / 100) * 352} 352`}
                      className={data.plagiarismResult.plagiarismScore > 50 ? "text-red-500" : data.plagiarismResult.plagiarismScore > 30 ? "text-yellow-500" : "text-green-500"}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold" data-testid="text-plagiarism-score">
                      {Math.round(data.plagiarismResult.plagiarismScore)}%
                    </span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg font-medium">Verdict:</span>
                    <Badge className={getVerdictColor(data.plagiarismResult.verdict)} data-testid="badge-plagiarism-verdict">
                      {getVerdictLabel(data.plagiarismResult.verdict)}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground" data-testid="text-plagiarism-summary">
                    {data.plagiarismResult.summary}
                  </p>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-green-600" data-testid="text-original-score">
                    {Math.round(100 - data.plagiarismResult.plagiarismScore)}%
                  </p>
                  <p className="text-sm text-muted-foreground">Original Content</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-red-600" data-testid="text-copied-score">
                    {Math.round(data.plagiarismResult.plagiarismScore)}%
                  </p>
                  <p className="text-sm text-muted-foreground">Matched Content</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold" data-testid="text-sources-found">
                    {data.matches?.length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Sources Found</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold" data-testid="text-plagiarism-scan-duration">
                    {data.plagiarismResult.scanDuration || 0}s
                  </p>
                  <p className="text-sm text-muted-foreground">Scan Duration</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {data.document.extractedText && data.matches && data.matches.length > 0 && (
            <HighlightedDocument
              text={data.document.extractedText}
              sections={data.matches.map(m => ({
                text: m.matchedText,
                startIndex: m.startIndex || -1,
                endIndex: m.endIndex || -1,
                similarityScore: m.similarityScore,
                reason: m.sourceTitle || "Potential match detected",
              }))}
              type="plagiarism"
              title="Document with Copied Content Highlighted"
            />
          )}

          {data.matches && data.matches.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  Detected Matches ({data.matches.length})
                </CardTitle>
                <CardDescription>
                  The following sections may contain content from external sources
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.matches.map((match, index) => (
                  <div 
                    key={match.id} 
                    className="p-4 rounded-lg border bg-yellow-50/50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800"
                    data-testid={`plagiarism-match-${index}`}
                  >
                    <div className="flex items-center justify-between gap-4 mb-2 flex-wrap">
                      <Badge variant="outline" className="text-yellow-600">
                        {Math.round(match.similarityScore)}% similarity
                      </Badge>
                      {match.sourceTitle && (
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          Source: {match.sourceTitle}
                          {match.sourceUrl && (
                            <a 
                              href={match.sourceUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </span>
                      )}
                    </div>
                    <p className="text-sm line-clamp-3">
                      "{match.matchedText}"
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
