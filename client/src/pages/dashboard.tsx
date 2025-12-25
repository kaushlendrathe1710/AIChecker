import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { getSessionId } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Upload,
  BarChart3,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
} from "lucide-react";
import type { Document } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  loading,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: typeof FileText;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-2xl font-bold" data-testid={`stat-${title.toLowerCase().replace(/\s/g, "-")}`}>
            {value}
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

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

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalScans: number;
    avgScore: number;
    lastScan: string | null;
  }>({
    queryKey: ["/api/stats"],
    queryFn: async () => {
      const sessionId = getSessionId();
      const res = await fetch("/api/stats", {
        headers: { "x-session-id": sessionId || "" },
      });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  const { data: documentsData, isLoading: docsLoading } = useQuery<{ documents: Document[] }>({
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

  const recentDocs = documentsData?.documents?.slice(0, 5) || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Dashboard</h1>
          <p className="text-muted-foreground">
            Track your document scans and plagiarism analysis
          </p>
        </div>
        <Button asChild data-testid="button-new-scan">
          <Link href="/upload">
            <Upload className="w-4 h-4 mr-2" />
            New Scan
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Scans"
          value={stats?.totalScans ?? 0}
          icon={FileText}
          loading={statsLoading}
        />
        <StatCard
          title="Average Score"
          value={stats?.avgScore ? `${stats.avgScore.toFixed(1)}%` : "N/A"}
          description="Lower is better"
          icon={BarChart3}
          loading={statsLoading}
        />
        <StatCard
          title="Last Scan"
          value={
            stats?.lastScan
              ? formatDistanceToNow(new Date(stats.lastScan), { addSuffix: true })
              : "Never"
          }
          icon={Clock}
          loading={statsLoading}
        />
        <StatCard
          title="Documents"
          value={documentsData?.documents?.length ?? 0}
          icon={FileText}
          loading={docsLoading}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Recent Documents</CardTitle>
            <CardDescription>Your recently uploaded documents and scan results</CardDescription>
          </div>
          {recentDocs.length > 0 && (
            <Button variant="ghost" size="sm" asChild data-testid="link-view-all">
              <Link href="/documents">
                View All
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {docsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : recentDocs.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
                <FileText className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-foreground mb-1">No documents yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload your first document to start checking for plagiarism
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
              {recentDocs.map((doc) => (
                <Link key={doc.id} href={doc.status === "completed" ? `/report/${doc.id}` : `/documents`}>
                  <div
                    className="flex items-center justify-between p-4 rounded-lg border hover-elevate active-elevate-2 cursor-pointer"
                    data-testid={`doc-row-${doc.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted flex-shrink-0">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate" data-testid={`doc-name-${doc.id}`}>
                          {doc.fileName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {getStatusBadge(doc.status)}
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
