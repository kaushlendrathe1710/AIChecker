import { useQuery } from "@tanstack/react-query";
import { useParams, Link, Redirect } from "wouter";
import { getSessionId } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  FileText,
  Download,
  Share2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Globe,
  ExternalLink,
  Copy,
  Bot,
  FileSearch,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Document, ScanResult, SourceMatch, HighlightedSection } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface ReportData {
  document: Document;
  scanResult: ScanResult & { sourceMatches: SourceMatch[] };
}

function getVerdictInfo(verdict: string, score: number) {
  if (verdict === "original" || score < 15) {
    return {
      label: "Original Content",
      color: "text-green-600",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-200",
      icon: CheckCircle2,
      description: "This document appears to be mostly original content",
    };
  }
  if (verdict === "low" || score < 30) {
    return {
      label: "Low Similarity",
      color: "text-green-600",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-200",
      icon: CheckCircle2,
      description: "Minor similarities detected, likely acceptable",
    };
  }
  if (verdict === "moderate" || score < 50) {
    return {
      label: "Moderate Similarity",
      color: "text-yellow-600",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-200",
      icon: AlertTriangle,
      description: "Noticeable similarities found, review recommended",
    };
  }
  return {
    label: "High Similarity",
    color: "text-red-600",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-200",
    icon: AlertCircle,
    description: "Significant matches detected, careful review required",
  };
}

function ScoreRing({ score, size = 160 }: { score: number; size?: number }) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  
  let strokeColor = "stroke-green-500";
  if (score >= 50) strokeColor = "stroke-yellow-500";
  if (score >= 80) strokeColor = "stroke-red-500";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={strokeColor}
          style={{ transition: "stroke-dashoffset 0.5s ease-in-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold" data-testid="text-overall-score">
          {score.toFixed(0)}%
        </span>
        <span className="text-sm text-muted-foreground">Similarity</span>
      </div>
    </div>
  );
}

function HighlightedDocument({
  text,
  highlights,
}: {
  text: string;
  highlights: HighlightedSection[];
}) {
  if (!text || highlights.length === 0) {
    return (
      <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
        {text || "No text content available"}
      </div>
    );
  }

  const sortedHighlights = [...highlights].sort((a, b) => a.startIndex - b.startIndex);
  const elements: JSX.Element[] = [];
  let lastIndex = 0;

  sortedHighlights.forEach((highlight, i) => {
    if (highlight.startIndex > lastIndex) {
      elements.push(
        <span key={`text-${i}`}>{text.slice(lastIndex, highlight.startIndex)}</span>
      );
    }

    let bgClass = "bg-green-100 dark:bg-green-900/30 border-l-4 border-green-500";
    if (highlight.matchType === "medium") {
      bgClass = "bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500";
    } else if (highlight.matchType === "high") {
      bgClass = "bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500";
    }

    elements.push(
      <span
        key={`highlight-${i}`}
        className={`${bgClass} px-1 py-0.5 rounded-r-sm inline`}
        title={`${highlight.similarityScore.toFixed(0)}% similarity`}
      >
        {text.slice(highlight.startIndex, highlight.endIndex)}
      </span>
    );

    lastIndex = highlight.endIndex;
  });

  if (lastIndex < text.length) {
    elements.push(<span key="text-end">{text.slice(lastIndex)}</span>);
  }

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap leading-relaxed">
      {elements}
    </div>
  );
}

function SourceMatchCard({ match }: { match: SourceMatch }) {
  let bgClass = "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
  let textColor = "text-green-600";
  if (match.similarityScore >= 50) {
    bgClass = "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
    textColor = "text-yellow-600";
  }
  if (match.similarityScore >= 80) {
    bgClass = "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
    textColor = "text-red-600";
  }

  return (
    <Card className={`${bgClass} border`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {match.matchType === "ai" ? (
              <Sparkles className="w-4 h-4 text-purple-500" />
            ) : (
              <Globe className="w-4 h-4 text-blue-500" />
            )}
            <CardTitle className="text-sm font-medium">
              {match.sourceTitle || "Unknown Source"}
            </CardTitle>
          </div>
          <Badge variant="outline" className={textColor}>
            {match.similarityScore.toFixed(0)}%
          </Badge>
        </div>
        {match.sourceUrl && (
          <CardDescription className="flex items-center gap-1 text-xs">
            <a
              href={match.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline flex items-center gap-1"
            >
              {match.sourceUrl.slice(0, 50)}...
              <ExternalLink className="w-3 h-3" />
            </a>
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-3">
          "{match.matchedText}"
        </p>
      </CardContent>
    </Card>
  );
}

export default function ReportPage() {
  const params = useParams();
  const documentId = params.id;
  const { toast } = useToast();
  const [downloadingAI, setDownloadingAI] = useState(false);
  const [downloadingPlag, setDownloadingPlag] = useState(false);

  const handleDownloadReport = async (type: "ai" | "plagiarism") => {
    const setDownloading = type === "ai" ? setDownloadingAI : setDownloadingPlag;
    setDownloading(true);
    try {
      const sessionId = getSessionId();
      const endpoint = type === "ai" ? "download-ai-report" : "download-plagiarism-report";
      const res = await fetch(`/api/documents/${documentId}/${endpoint}`, {
        headers: { "x-session-id": sessionId || "" },
      });
      if (!res.ok) {
        throw new Error("Failed to download report");
      }
      const data = await res.json();
      const blob = new Blob([data.content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        title: "Downloaded",
        description: `${type === "ai" ? "AI" : "Plagiarism"} report downloaded successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download report",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const { data, isLoading, error } = useQuery<ReportData>({
    queryKey: ["/api/documents", documentId, "report"],
    queryFn: async () => {
      const sessionId = getSessionId();
      const res = await fetch(`/api/documents/${documentId}/report`, {
        headers: { "x-session-id": sessionId || "" },
      });
      if (!res.ok) {
        if (res.status === 404) throw new Error("Report not found");
        throw new Error("Failed to fetch report");
      }
      return res.json();
    },
    enabled: !!documentId,
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="text-center py-16">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Report Not Available</h2>
          <p className="text-muted-foreground mb-6">
            {error?.message || "The report could not be loaded"}
          </p>
          <Button asChild>
            <Link href="/documents">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Documents
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const { document: doc, scanResult } = data;
  const verdictInfo = getVerdictInfo(scanResult.verdict, scanResult.overallScore);
  const VerdictIcon = verdictInfo.icon;
  const highlights = (scanResult.highlightedText as HighlightedSection[]) || [];
  const aiMatches = scanResult.sourceMatches.filter((m) => m.matchType === "ai");
  const webMatches = scanResult.sourceMatches.filter((m) => m.matchType !== "ai");

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/documents">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold truncate" data-testid="text-document-name">
              {doc.fileName}
            </h1>
            <p className="text-sm text-muted-foreground">
              Scanned {formatDistanceToNow(new Date(scanResult.createdAt), { addSuffix: true })}
              {scanResult.scanDuration && ` in ${scanResult.scanDuration}s`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleDownloadReport("ai")}
            disabled={downloadingAI}
            data-testid="button-download-ai-report"
          >
            {downloadingAI ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            AI Report
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleDownloadReport("plagiarism")}
            disabled={downloadingPlag}
            data-testid="button-download-plag-report"
          >
            {downloadingPlag ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Globe className="w-4 h-4 mr-2" />
            )}
            Plagiarism Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader className="text-center pb-4">
              <CardTitle>Overall Similarity</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <ScoreRing score={scanResult.overallScore} />
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-lg ${verdictInfo.bgColor} ${verdictInfo.borderColor} border`}
              >
                <VerdictIcon className={`w-5 h-5 ${verdictInfo.color}`} />
                <span className={`font-medium ${verdictInfo.color}`} data-testid="text-verdict">
                  {verdictInfo.label}
                </span>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {verdictInfo.description}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Score Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    AI Content
                  </span>
                  <span className="font-medium" data-testid="text-ai-score">
                    {(scanResult.aiScore || 0).toFixed(0)}%
                  </span>
                </div>
                <Progress value={scanResult.aiScore || 0} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-500" />
                    Web Similarity
                  </span>
                  <span className="font-medium" data-testid="text-web-score">
                    {(scanResult.webScore || 0).toFixed(0)}%
                  </span>
                </div>
                <Progress value={scanResult.webScore || 0} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Document Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Words</span>
                <span className="font-medium font-mono">
                  {doc.wordCount?.toLocaleString() || "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">File Size</span>
                <span className="font-medium font-mono">
                  {(doc.fileSize / 1024).toFixed(1)} KB
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sources Found</span>
                <span className="font-medium font-mono">
                  {scanResult.sourceMatches.length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="h-full">
            <Tabs defaultValue="document" className="h-full flex flex-col">
              <CardHeader className="pb-0">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="document" data-testid="tab-document">
                    <FileText className="w-4 h-4 mr-2" />
                    Document
                  </TabsTrigger>
                  <TabsTrigger value="sources" data-testid="tab-sources">
                    <Globe className="w-4 h-4 mr-2" />
                    Sources ({scanResult.sourceMatches.length})
                  </TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent className="flex-1 pt-4">
                <TabsContent value="document" className="h-full m-0">
                  <ScrollArea className="h-[500px] pr-4">
                    <HighlightedDocument
                      text={doc.extractedText || ""}
                      highlights={highlights}
                    />
                  </ScrollArea>
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-red-500" />
                      <span>High (&gt;80%)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-yellow-500" />
                      <span>Medium (50-80%)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-green-500" />
                      <span>Low (&lt;50%)</span>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="sources" className="h-full m-0">
                  <ScrollArea className="h-[500px] pr-4">
                    {scanResult.sourceMatches.length === 0 ? (
                      <div className="text-center py-12">
                        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                        <h3 className="font-medium mb-1">No Matches Found</h3>
                        <p className="text-sm text-muted-foreground">
                          Your document appears to be original
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {aiMatches.length > 0 && (
                          <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-purple-500" />
                              AI-Generated Content ({aiMatches.length})
                            </h3>
                            <div className="space-y-3">
                              {aiMatches.map((match) => (
                                <SourceMatchCard key={match.id} match={match} />
                              ))}
                            </div>
                          </div>
                        )}
                        {webMatches.length > 0 && (
                          <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                              <Globe className="w-4 h-4 text-blue-500" />
                              Web Sources ({webMatches.length})
                            </h3>
                            <div className="space-y-3">
                              {webMatches.map((match) => (
                                <SourceMatchCard key={match.id} match={match} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}
