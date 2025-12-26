import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  FileText,
  Download,
  RefreshCw,
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

interface GrammarCheckResponse {
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

function MistakeCard({ mistake }: { mistake: GrammarMistake }) {
  const typeInfo = getErrorTypeInfo(mistake.type);
  const TypeIcon = typeInfo.icon;

  return (
    <div className={`p-4 rounded-lg border ${typeInfo.bg}`}>
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-background/50">
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
    </div>
  );
}

export default function GrammarCheck() {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedDocId, setUploadedDocId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery<GrammarCheckResponse>({
    queryKey: ["/api/grammar-check", uploadedDocId],
    enabled: !!uploadedDocId,
    refetchInterval: isPolling ? 2000 : false,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/grammar-check/upload", {
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
      toast({ title: "Document uploaded", description: "Grammar analysis has started." });
    },
    onError: (error: Error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await fetch(`/api/grammar-check/${documentId}/download-report`, {
        headers: { "x-session-id": localStorage.getItem("sessionId") || "" },
      });
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      const fileName = disposition?.match(/filename="(.+)"/)?.[1] || "grammar_report.pdf";
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
    if (data?.grammarResult && isPolling) {
      setIsPolling(false);
    }
  }, [data?.grammarResult, isPolling]);

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

  const handleCopyCorrections = async () => {
    if (data?.grammarResult?.correctedText) {
      await navigator.clipboard.writeText(data.grammarResult.correctedText);
      setCopied(true);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const showResults = data?.grammarResult;
  const isPending = uploadMutation.isPending || (isPolling && !data?.grammarResult);
  const mistakes = (data?.grammarResult?.mistakes as GrammarMistake[]) || [];
  const scoreColors = data?.grammarResult ? getScoreColor(data.grammarResult.overallScore) : { text: "", bg: "" };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2" data-testid="page-title">
          <SpellCheck className="w-6 h-6 text-primary" />
          Grammar Check
        </h1>
        <p className="text-muted-foreground mt-1">
          Upload a document to check for spelling, grammar, and style errors
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
              } ${isPending ? "opacity-50 pointer-events-none" : ""}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              data-testid="dropzone-grammar-check"
            >
              {isPending ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-12 h-12 text-primary animate-spin" />
                  <div>
                    <p className="font-medium">Analyzing document...</p>
                    <p className="text-sm text-muted-foreground">
                      Checking grammar and spelling
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
                    data-testid="input-file-grammar-check"
                  />
                  <Button asChild>
                    <label htmlFor="file-input" className="cursor-pointer" data-testid="button-browse-grammar-check">
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
                  onClick={handleCopyCorrections}
                  disabled={!data.grammarResult.correctedText || mistakes.length === 0}
                  data-testid="button-copy-corrected"
                >
                  {copied ? (
                    <Check className="w-4 h-4 mr-2" />
                  ) : (
                    <Copy className="w-4 h-4 mr-2" />
                  )}
                  {copied ? "Copied" : "Copy Corrected"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadMutation.mutate(data.document.id)}
                  disabled={downloadMutation.isPending}
                  data-testid="button-download-grammar-report"
                >
                  {downloadMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Download Report
                </Button>
                <Button size="sm" onClick={handleNewCheck} data-testid="button-new-grammar-check">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  New Check
                </Button>
              </div>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-6">
              <Card>
                <CardHeader className="text-center pb-4">
                  <CardTitle>Grammar Score</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
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
                        strokeDasharray={`${(data.grammarResult.overallScore / 100) * 352} 352`}
                        className={scoreColors.bg}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold" data-testid="text-grammar-score">
                        {Math.round(data.grammarResult.overallScore)}%
                      </span>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${scoreColors.text}`}>
                    {data.grammarResult.overallScore >= 90 ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <AlertCircle className="w-5 h-5" />
                    )}
                    <span className="font-medium">
                      {data.grammarResult.overallScore >= 90
                        ? "Excellent"
                        : data.grammarResult.overallScore >= 70
                        ? "Good"
                        : "Needs Improvement"}
                    </span>
                  </div>
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
                        {data.grammarResult.spellingErrors}
                      </span>
                    </div>
                    <Progress 
                      value={data.grammarResult.totalMistakes > 0 ? (data.grammarResult.spellingErrors / data.grammarResult.totalMistakes) * 100 : 0} 
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
                        {data.grammarResult.grammarErrors}
                      </span>
                    </div>
                    <Progress 
                      value={data.grammarResult.totalMistakes > 0 ? (data.grammarResult.grammarErrors / data.grammarResult.totalMistakes) * 100 : 0} 
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
                        {data.grammarResult.punctuationErrors}
                      </span>
                    </div>
                    <Progress 
                      value={data.grammarResult.totalMistakes > 0 ? (data.grammarResult.punctuationErrors / data.grammarResult.totalMistakes) * 100 : 0} 
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
                        {data.grammarResult.styleErrors}
                      </span>
                    </div>
                    <Progress 
                      value={data.grammarResult.totalMistakes > 0 ? (data.grammarResult.styleErrors / data.grammarResult.totalMistakes) * 100 : 0} 
                      className="h-2" 
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="lg:col-span-2">
              <Tabs defaultValue="errors" className="h-full flex flex-col">
                <CardHeader className="pb-0">
                  <TabsList className="w-full justify-start">
                    <TabsTrigger value="errors" data-testid="tab-errors">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Errors ({mistakes.length})
                    </TabsTrigger>
                    <TabsTrigger value="corrected" data-testid="tab-corrected" disabled={!data.grammarResult.correctedText}>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Corrected Text
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>
                <CardContent className="flex-1 pt-4">
                  <TabsContent value="errors" className="m-0">
                    <ScrollArea className="h-[400px] pr-4">
                      {mistakes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
                          <p className="font-medium">No errors found</p>
                          <p className="text-sm text-muted-foreground">Your document looks great!</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {mistakes.map((mistake, index) => (
                            <MistakeCard key={index} mistake={mistake} />
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="corrected" className="m-0">
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                        {data.grammarResult.correctedText || data.document.extractedText || "No text available"}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
