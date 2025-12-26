import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { getSessionId } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Upload,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Play,
  Eye,
  RefreshCw,
  SpellCheck,
  Download,
} from "lucide-react";
import type { Document } from "@shared/schema";
import { format, formatDistanceToNow } from "date-fns";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getStatusInfo(status: string) {
  switch (status) {
    case "completed":
      return {
        badge: (
          <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Complete
          </Badge>
        ),
        action: "view",
      };
    case "scanning":
      return {
        badge: (
          <Badge variant="default" className="bg-blue-500/10 text-blue-600 border-blue-200">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Scanning
          </Badge>
        ),
        action: "wait",
      };
    case "failed":
      return {
        badge: (
          <Badge variant="default" className="bg-red-500/10 text-red-600 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        ),
        action: "retry",
      };
    default:
      return {
        badge: (
          <Badge variant="default" className="bg-yellow-500/10 text-yellow-600 border-yellow-200">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        ),
        action: "scan",
      };
  }
}

export default function DocumentsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery<{ documents: Document[] }>({
    queryKey: ["/api/documents"],
    queryFn: async () => {
      const sessionId = getSessionId();
      const res = await fetch("/api/documents", {
        headers: { "x-session-id": sessionId || "" },
      });
      if (!res.ok) throw new Error("Failed to fetch documents");
      return res.json();
    },
    refetchInterval: 5000,
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
    onSuccess: () => {
      toast({
        title: "Scan started",
        description: "Your document is being analyzed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Scan failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDownloadCorrected = async (documentId: string, fileName: string) => {
    try {
      const sessionId = getSessionId();
      const res = await fetch(`/api/documents/${documentId}/grammar-report`, {
        headers: { "x-session-id": sessionId || "" },
      });
      
      if (!res.ok) {
        toast({
          title: "No corrections available",
          description: "Run a grammar check first to get corrected text",
          variant: "destructive",
        });
        return;
      }
      
      const data = await res.json();
      
      if (!data.grammarResult?.correctedText) {
        toast({
          title: "No corrections available",
          description: "Run a grammar check first to get corrected text",
          variant: "destructive",
        });
        return;
      }
      
      const correctedText = data.grammarResult.correctedText;
      const baseName = fileName.replace(/\.[^/.]+$/, "");
      const newFileName = `${baseName}_corrected.txt`;
      
      const blob = new Blob([correctedText], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = newFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download complete",
        description: "Corrected document downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Could not download the corrected document",
        variant: "destructive",
      });
    }
  };

  const documents = data?.documents || [];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">History</h1>
          <p className="text-muted-foreground">
            View all your past scans and checks
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()} data-testid="button-refresh">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button asChild data-testid="button-new-upload">
            <Link href="/upload">
              <Upload className="w-4 h-4 mr-2" />
              Upload New
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scan History</CardTitle>
          <CardDescription>
            {documents.length} scan{documents.length !== 1 ? "s" : ""} in your history
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">No documents yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Upload your first document to start checking for plagiarism and AI-generated content
              </p>
              <Button asChild data-testid="button-upload-first">
                <Link href="/upload">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Document
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => {
                const { badge, action } = getStatusInfo(doc.status);
                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                    data-testid={`doc-row-${doc.id}`}
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-muted flex-shrink-0">
                        <FileText className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate" data-testid={`doc-name-${doc.id}`}>
                          {doc.fileName}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                          <span>{format(new Date(doc.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
                          <span className="text-muted-foreground/40">|</span>
                          <span>{formatFileSize(doc.fileSize)}</span>
                          {doc.wordCount && (
                            <>
                              <span className="text-muted-foreground/40">|</span>
                              <span>{doc.wordCount.toLocaleString()} words</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {badge}
                      {action === "view" && (
                        <>
                          <Button size="sm" asChild data-testid={`button-view-${doc.id}`}>
                            <Link href={`/report/${doc.id}`}>
                              <Eye className="w-4 h-4 mr-1" />
                              Report
                            </Link>
                          </Button>
                          <Button size="sm" variant="outline" asChild data-testid={`button-grammar-${doc.id}`}>
                            <Link href={`/grammar/${doc.id}`}>
                              <SpellCheck className="w-4 h-4 mr-1" />
                              Grammar
                            </Link>
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleDownloadCorrected(doc.id, doc.fileName)}
                            data-testid={`button-download-${doc.id}`}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {action === "scan" && (
                        <Button
                          size="sm"
                          onClick={() => scanMutation.mutate(doc.id)}
                          disabled={scanMutation.isPending}
                          data-testid={`button-scan-${doc.id}`}
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Scan
                        </Button>
                      )}
                      {action === "retry" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => scanMutation.mutate(doc.id)}
                          disabled={scanMutation.isPending}
                          data-testid={`button-retry-${doc.id}`}
                        >
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Retry
                        </Button>
                      )}
                      {action === "wait" && (
                        <Button size="sm" disabled>
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          Processing
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
