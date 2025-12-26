import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { getSessionId } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Upload,
  RefreshCw,
  Download,
} from "lucide-react";
import type { Document } from "@shared/schema";
import { format } from "date-fns";

interface DocumentChecks {
  ai: { done: boolean; score: number; status: string } | null;
  plagiarism: { done: boolean; score: number; status: string } | null;
  grammar: { done: boolean; score: number; totalMistakes: number } | null;
}

interface DocumentWithChecks extends Document {
  checks: DocumentChecks;
}

export default function DocumentsPage() {
  const { toast } = useToast();

  const { data, isLoading, refetch } = useQuery<{ documents: DocumentWithChecks[] }>({
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

  const handleDownloadReport = async (documentId: string, fileName: string, reportType: "ai" | "plagiarism" | "grammar") => {
    try {
      const sessionId = getSessionId();
      let endpoint = "";
      let reportName = "";
      
      switch (reportType) {
        case "ai":
          endpoint = `/api/ai-check/${documentId}/download-report`;
          reportName = `${fileName.replace(/\.[^/.]+$/, "")}_ai_report.pdf`;
          break;
        case "plagiarism":
          endpoint = `/api/plagiarism-check/${documentId}/download-report`;
          reportName = `${fileName.replace(/\.[^/.]+$/, "")}_plagiarism_report.pdf`;
          break;
        case "grammar":
          endpoint = `/api/grammar-check/${documentId}/download-report`;
          reportName = `${fileName.replace(/\.[^/.]+$/, "")}_grammar_report.pdf`;
          break;
      }
      
      const res = await fetch(endpoint, {
        headers: { "x-session-id": sessionId || "" },
      });
      
      if (!res.ok) {
        toast({
          title: "Download failed",
          description: "Report not available",
          variant: "destructive",
        });
        return;
      }
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = reportName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download complete",
        description: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report downloaded`,
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Could not download the report",
        variant: "destructive",
      });
    }
  };

  const documents = data?.documents || [];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
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
            <Link href="/dashboard">
              <Upload className="w-4 h-4 mr-2" />
              New Check
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
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">No scans yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Start by running an AI check, plagiarism check, or grammar check on your documents
              </p>
              <Button asChild data-testid="button-upload-first">
                <Link href="/dashboard">
                  <Upload className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">File Name</TableHead>
                    <TableHead className="min-w-[150px]">Date</TableHead>
                    <TableHead className="text-center min-w-[120px]">AI Check</TableHead>
                    <TableHead className="text-center min-w-[120px]">Plagiarism</TableHead>
                    <TableHead className="text-center min-w-[120px]">Grammar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id} data-testid={`doc-row-${doc.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded bg-muted flex-shrink-0">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-[180px]" data-testid={`doc-name-${doc.id}`}>
                              {doc.fileName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {doc.wordCount ? `${doc.wordCount.toLocaleString()} words` : ""}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{format(new Date(doc.createdAt), "MMM d, yyyy")}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(doc.createdAt), "h:mm a")}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {doc.checks?.ai ? (
                          <div className="flex items-center justify-center gap-1">
                            <span className={`font-medium ${
                              doc.checks.ai.score >= 50 ? "text-red-600" : 
                              doc.checks.ai.score >= 20 ? "text-orange-600" : "text-green-600"
                            }`}>
                              {doc.checks.ai.score?.toFixed(0) || 0}%
                            </span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => handleDownloadReport(doc.id, doc.fileName, "ai")}
                              data-testid={`download-ai-${doc.id}`}
                            >
                              <Download className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {doc.checks?.plagiarism ? (
                          <div className="flex items-center justify-center gap-1">
                            <span className={`font-medium ${
                              doc.checks.plagiarism.score >= 30 ? "text-red-600" : 
                              doc.checks.plagiarism.score >= 10 ? "text-orange-600" : "text-green-600"
                            }`}>
                              {doc.checks.plagiarism.score?.toFixed(0) || 0}%
                            </span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => handleDownloadReport(doc.id, doc.fileName, "plagiarism")}
                              data-testid={`download-plagiarism-${doc.id}`}
                            >
                              <Download className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {doc.checks?.grammar ? (
                          <div className="flex items-center justify-center gap-1">
                            <span className={`font-medium ${
                              doc.checks.grammar.totalMistakes >= 20 ? "text-red-600" : 
                              doc.checks.grammar.totalMistakes >= 5 ? "text-orange-600" : "text-green-600"
                            }`}>
                              {doc.checks.grammar.totalMistakes} errors
                            </span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => handleDownloadReport(doc.id, doc.fileName, "grammar")}
                              data-testid={`download-grammar-${doc.id}`}
                            >
                              <Download className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
