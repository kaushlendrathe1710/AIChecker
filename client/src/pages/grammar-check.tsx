import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { getSessionId } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  FileText,
  Download,
  AlertCircle,
  CheckCircle2,
  Wand2,
  SpellCheck,
  Type,
  Quote,
  Paintbrush,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import type { Document, GrammarResult, GrammarMistake } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

interface GrammarReportData {
  document: Document;
  grammarResult: GrammarResult;
}

function getScoreColor(score: number) {
  if (score >= 90) return { text: "text-green-600", bg: "bg-green-500" };
  if (score >= 70) return { text: "text-yellow-600", bg: "bg-yellow-500" };
  return { text: "text-red-600", bg: "bg-red-500" };
}

function getErrorTypeInfo(type: string) {
  switch (type) {
    case "spelling":
      return { icon: SpellCheck, color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20" };
    case "grammar":
      return { icon: Type, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/20" };
    case "punctuation":
      return { icon: Quote, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" };
    case "style":
      return { icon: Paintbrush, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/20" };
    default:
      return { icon: AlertCircle, color: "text-gray-500", bg: "bg-gray-50 dark:bg-gray-900/20" };
  }
}

function ScoreRing({ score, size = 160 }: { score: number; size?: number }) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const colors = getScoreColor(score);

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
          className={colors.bg}
          style={{ transition: "stroke-dashoffset 0.5s ease-in-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold" data-testid="text-grammar-score">
          {score.toFixed(0)}
        </span>
        <span className="text-sm text-muted-foreground">Score</span>
      </div>
    </div>
  );
}

function MistakeCard({ mistake }: { mistake: GrammarMistake }) {
  const typeInfo = getErrorTypeInfo(mistake.type);
  const TypeIcon = typeInfo.icon;

  return (
    <Card className={`${typeInfo.bg} border`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg bg-background/50`}>
            <TypeIcon className={`w-4 h-4 ${typeInfo.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs capitalize">
                {mistake.type}
              </Badge>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-xs text-muted-foreground">Original:</span>
                <p className="text-sm line-through text-destructive">{mistake.text}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Suggestion:</span>
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                  {mistake.suggestion}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">{mistake.explanation}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HighlightedDocument({
  text,
  mistakes,
}: {
  text: string;
  mistakes: GrammarMistake[];
}) {
  if (!text || mistakes.length === 0) {
    return (
      <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
        {text || "No text content available"}
      </div>
    );
  }

  const sortedMistakes = [...mistakes].sort((a, b) => a.startIndex - b.startIndex);
  const elements: JSX.Element[] = [];
  let lastIndex = 0;

  sortedMistakes.forEach((mistake, i) => {
    if (mistake.startIndex > lastIndex) {
      elements.push(
        <span key={`text-${i}`}>{text.slice(lastIndex, mistake.startIndex)}</span>
      );
    }

    const typeInfo = getErrorTypeInfo(mistake.type);

    elements.push(
      <span
        key={`highlight-${i}`}
        className={`${typeInfo.bg} px-1 py-0.5 rounded-sm inline border-b-2 border-current ${typeInfo.color}`}
        title={`${mistake.type}: ${mistake.explanation}`}
      >
        {text.slice(mistake.startIndex, mistake.endIndex)}
      </span>
    );

    lastIndex = mistake.endIndex;
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

function CorrectedDocument({
  correctedText,
  originalText,
  mistakes,
}: {
  correctedText: string;
  originalText: string;
  mistakes: GrammarMistake[];
}) {
  if (!correctedText) {
    return (
      <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
        {originalText || "No text content available"}
      </div>
    );
  }

  if (mistakes.length === 0) {
    return (
      <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
        {correctedText}
      </div>
    );
  }

  const elements: JSX.Element[] = [];
  let currentPos = 0;

  const sortedMistakes = [...mistakes].sort((a, b) => a.startIndex - b.startIndex);
  
  sortedMistakes.forEach((mistake, i) => {
    const suggestion = mistake.suggestion;
    const suggestionIndex = correctedText.indexOf(suggestion, currentPos);
    
    if (suggestionIndex >= currentPos) {
      if (suggestionIndex > currentPos) {
        elements.push(
          <span key={`text-${i}`}>{correctedText.slice(currentPos, suggestionIndex)}</span>
        );
      }

      elements.push(
        <span
          key={`correction-${i}`}
          className="bg-yellow-200 dark:bg-yellow-700/50 px-0.5 rounded-sm inline"
          title={`Corrected from: "${mistake.text}"`}
        >
          {suggestion}
        </span>
      );

      currentPos = suggestionIndex + suggestion.length;
    }
  });

  if (currentPos < correctedText.length) {
    elements.push(<span key="text-end">{correctedText.slice(currentPos)}</span>);
  }

  if (elements.length === 0) {
    return (
      <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
        {correctedText}
      </div>
    );
  }

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap leading-relaxed">
      {elements}
    </div>
  );
}

export default function GrammarCheckPage() {
  const params = useParams();
  const documentId = params.id;
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<GrammarReportData>({
    queryKey: ["/api/documents", documentId, "grammar-report"],
    queryFn: async () => {
      const sessionId = getSessionId();
      const res = await fetch(`/api/documents/${documentId}/grammar-report`, {
        headers: { "x-session-id": sessionId || "" },
      });
      if (!res.ok) {
        if (res.status === 404) throw new Error("Grammar report not found");
        throw new Error("Failed to fetch grammar report");
      }
      return res.json();
    },
    enabled: !!documentId,
    refetchInterval: (query) => {
      if (query.state.error) return false;
      if (query.state.data?.grammarResult?.correctedText) return false;
      return 3000;
    },
  });

  const startCheckMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/documents/${documentId}/grammar-check`);
    },
    onSuccess: () => {
      toast({
        title: "Grammar Check Started",
        description: "We're analyzing your document. This may take a moment.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/documents", documentId, "grammar-report"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start grammar check",
        variant: "destructive",
      });
    },
  });

  const applyCorrectionsMutation = useMutation({
    mutationFn: async () => {
      const sessionId = getSessionId();
      const res = await fetch(`/api/documents/${documentId}/apply-corrections`, {
        method: "POST",
        headers: { "x-session-id": sessionId || "" },
      });
      if (!res.ok) throw new Error("Failed to apply corrections");
      return res.json();
    },
    onSuccess: async (data) => {
      await navigator.clipboard.writeText(data.correctedText);
      setCopied(true);
      toast({
        title: "Corrected Text Copied",
        description: "The corrected version has been copied to your clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to get corrections",
        variant: "destructive",
      });
    },
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
          <SpellCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Grammar Check Yet</h2>
          <p className="text-muted-foreground mb-6">
            Start a grammar check to analyze this document for spelling, grammar, and style issues.
          </p>
          <div className="flex justify-center gap-4">
            <Button asChild variant="outline">
              <Link href="/documents">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Documents
              </Link>
            </Button>
            <Button 
              onClick={() => startCheckMutation.mutate()}
              disabled={startCheckMutation.isPending}
            >
              {startCheckMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <SpellCheck className="w-4 h-4 mr-2" />
              )}
              Start Grammar Check
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { document: doc, grammarResult } = data;
  const mistakes = (grammarResult.mistakes as GrammarMistake[]) || [];
  const scoreColors = getScoreColor(grammarResult.overallScore);

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
              Grammar checked {formatDistanceToNow(new Date(grammarResult.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => startCheckMutation.mutate()}
            disabled={startCheckMutation.isPending}
            data-testid="button-recheck"
          >
            {startCheckMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <SpellCheck className="w-4 h-4 mr-2" />
            )}
            Re-check
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => applyCorrectionsMutation.mutate()}
            disabled={applyCorrectionsMutation.isPending || mistakes.length === 0}
            data-testid="button-copy-corrections"
          >
            {applyCorrectionsMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : copied ? (
              <Check className="w-4 h-4 mr-2" />
            ) : (
              <Copy className="w-4 h-4 mr-2" />
            )}
            {copied ? "Copied" : "Copy Corrected"}
          </Button>
          <Button
            size="sm"
            onClick={async () => {
              try {
                const sessionId = getSessionId();
                const res = await fetch(`/api/documents/${documentId}/download-corrected`, {
                  headers: { "x-session-id": sessionId || "" },
                });
                if (!res.ok) throw new Error("Failed to download");
                const data = await res.json();
                
                const blob = new Blob([data.content], { type: "text/plain;charset=utf-8" });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = data.fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                toast({
                  title: "Download Complete",
                  description: `${data.fileName} has been downloaded.`,
                });
              } catch (error) {
                toast({
                  title: "Download Failed",
                  description: "Could not download the corrected file.",
                  variant: "destructive",
                });
              }
            }}
            disabled={mistakes.length === 0}
            data-testid="button-download-corrected"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Corrected
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader className="text-center pb-4">
              <CardTitle>Grammar Score</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <ScoreRing score={grammarResult.overallScore} />
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${scoreColors.text}`}>
                {grammarResult.overallScore >= 90 ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                <span className="font-medium">
                  {grammarResult.overallScore >= 90
                    ? "Excellent"
                    : grammarResult.overallScore >= 70
                    ? "Good"
                    : "Needs Improvement"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {grammarResult.totalMistakes === 0
                  ? "No errors found in your document"
                  : `Found ${grammarResult.totalMistakes} issue${grammarResult.totalMistakes === 1 ? "" : "s"} in your document`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Error Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="flex items-center gap-2">
                    <SpellCheck className="w-4 h-4 text-red-500" />
                    Spelling
                  </span>
                  <span className="font-medium" data-testid="text-spelling-errors">
                    {grammarResult.spellingErrors}
                  </span>
                </div>
                <Progress 
                  value={grammarResult.totalMistakes > 0 ? (grammarResult.spellingErrors / grammarResult.totalMistakes) * 100 : 0} 
                  className="h-2" 
                />
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="flex items-center gap-2">
                    <Type className="w-4 h-4 text-orange-500" />
                    Grammar
                  </span>
                  <span className="font-medium" data-testid="text-grammar-errors">
                    {grammarResult.grammarErrors}
                  </span>
                </div>
                <Progress 
                  value={grammarResult.totalMistakes > 0 ? (grammarResult.grammarErrors / grammarResult.totalMistakes) * 100 : 0} 
                  className="h-2" 
                />
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="flex items-center gap-2">
                    <Quote className="w-4 h-4 text-blue-500" />
                    Punctuation
                  </span>
                  <span className="font-medium" data-testid="text-punctuation-errors">
                    {grammarResult.punctuationErrors}
                  </span>
                </div>
                <Progress 
                  value={grammarResult.totalMistakes > 0 ? (grammarResult.punctuationErrors / grammarResult.totalMistakes) * 100 : 0} 
                  className="h-2" 
                />
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="flex items-center gap-2">
                    <Paintbrush className="w-4 h-4 text-purple-500" />
                    Style
                  </span>
                  <span className="font-medium" data-testid="text-style-errors">
                    {grammarResult.styleErrors}
                  </span>
                </div>
                <Progress 
                  value={grammarResult.totalMistakes > 0 ? (grammarResult.styleErrors / grammarResult.totalMistakes) * 100 : 0} 
                  className="h-2" 
                />
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
                <span className="text-muted-foreground">Total Issues</span>
                <span className="font-medium font-mono">
                  {grammarResult.totalMistakes}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Error Rate</span>
                <span className="font-medium font-mono">
                  {doc.wordCount ? ((grammarResult.totalMistakes / doc.wordCount) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="h-full">
            <Tabs defaultValue="issues" className="h-full flex flex-col">
              <CardHeader className="pb-0">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="issues" data-testid="tab-issues">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Errors ({mistakes.length})
                  </TabsTrigger>
                  <TabsTrigger value="document" data-testid="tab-document">
                    <FileText className="w-4 h-4 mr-2" />
                    Original
                  </TabsTrigger>
                  <TabsTrigger value="corrected" data-testid="tab-corrected" disabled={mistakes.length === 0 || !grammarResult.correctedText}>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Corrected
                  </TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent className="flex-1 pt-4">
                <TabsContent value="document" className="h-full m-0">
                  <ScrollArea className="h-[500px] pr-4">
                    <HighlightedDocument
                      text={doc.extractedText || ""}
                      mistakes={mistakes}
                    />
                  </ScrollArea>
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t text-xs text-muted-foreground flex-wrap">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-red-500" />
                      <span>Spelling</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-orange-500" />
                      <span>Grammar</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-blue-500" />
                      <span>Punctuation</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-purple-500" />
                      <span>Style</span>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="issues" className="h-full m-0">
                  <ScrollArea className="h-[500px] pr-4">
                    {mistakes.length === 0 ? (
                      <div className="text-center py-12">
                        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                        <h3 className="font-medium mb-1">Perfect Score</h3>
                        <p className="text-sm text-muted-foreground">
                          No grammar or spelling issues found
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {mistakes.map((mistake, index) => (
                          <MistakeCard key={index} mistake={mistake} />
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="corrected" className="h-full m-0">
                  <ScrollArea className="h-[500px] pr-4">
                    <CorrectedDocument
                      correctedText={grammarResult.correctedText || ""}
                      originalText={doc.extractedText || ""}
                      mistakes={mistakes}
                    />
                  </ScrollArea>
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t text-xs text-muted-foreground flex-wrap">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-yellow-400" />
                      <span>Corrected text (highlighted in yellow)</span>
                    </div>
                  </div>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}
