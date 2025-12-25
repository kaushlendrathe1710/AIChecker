import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { getSessionId } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  Eye,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  History,
} from "lucide-react";
import type { Document } from "@shared/schema";
import { format } from "date-fns";

function getStatusBadge(status: string) {
  switch (status) {
    case "completed":
      return (
        <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-200">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Complete
        </Badge>
      );
    case "scanning":
      return (
        <Badge variant="default" className="bg-blue-500/10 text-blue-600 border-blue-200">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Scanning
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="default" className="bg-red-500/10 text-red-600 border-red-200">
          <XCircle className="w-3 h-3 mr-1" />
          Failed
        </Badge>
      );
    default:
      return (
        <Badge variant="default" className="bg-yellow-500/10 text-yellow-600 border-yellow-200">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
  }
}

export default function HistoryPage() {
  const { data, isLoading } = useQuery<{ documents: Document[] }>({
    queryKey: ["/api/documents"],
    queryFn: async () => {
      const sessionId = getSessionId();
      const res = await fetch("/api/documents", {
        headers: { "x-session-id": sessionId || "" },
      });
      if (!res.ok) throw new Error("Failed to fetch documents");
      return res.json();
    },
  });

  const completedDocs = data?.documents?.filter((d) => d.status === "completed") || [];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Scan History</h1>
          <p className="text-muted-foreground">
            View all your completed plagiarism scans
          </p>
        </div>
        <Button asChild data-testid="button-new-scan">
          <Link href="/upload">
            <Upload className="w-4 h-4 mr-2" />
            New Scan
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Completed Scans</CardTitle>
          <CardDescription>
            {completedDocs.length} completed scan{completedDocs.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : completedDocs.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <History className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">No scan history</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Your completed scans will appear here. Start by uploading a document.
              </p>
              <Button asChild data-testid="button-upload-first">
                <Link href="/upload">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Document
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Words</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedDocs.map((doc) => (
                    <TableRow key={doc.id} data-testid={`history-row-${doc.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted flex-shrink-0">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <span className="font-medium truncate max-w-[200px]">
                            {doc.fileName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(doc.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {doc.wordCount?.toLocaleString() || "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(doc.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" asChild data-testid={`button-view-${doc.id}`}>
                          <Link href={`/report/${doc.id}`}>
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Link>
                        </Button>
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
