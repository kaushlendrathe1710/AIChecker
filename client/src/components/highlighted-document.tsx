import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, Highlighter } from "lucide-react";

interface HighlightedSection {
  text: string;
  startIndex: number;
  endIndex: number;
  aiProbability?: number;
  similarityScore?: number;
  reason?: string;
}

interface HighlightedDocumentProps {
  text: string;
  sections: HighlightedSection[];
  type: "ai" | "plagiarism";
  title?: string;
}

interface TextSegment {
  text: string;
  isHighlighted: boolean;
  section?: HighlightedSection;
}

export function HighlightedDocument({ text, sections, type, title }: HighlightedDocumentProps) {
  const segments = useMemo(() => {
    if (!text || sections.length === 0) {
      return [{ text, isHighlighted: false }];
    }

    const sortedSections = [...sections].sort((a, b) => {
      const aStart = a.startIndex >= 0 ? a.startIndex : text.indexOf(a.text);
      const bStart = b.startIndex >= 0 ? b.startIndex : text.indexOf(b.text);
      return aStart - bStart;
    });

    const result: TextSegment[] = [];
    let currentIndex = 0;

    for (const section of sortedSections) {
      let startIdx = section.startIndex;
      
      if (startIdx < 0 || startIdx >= text.length) {
        startIdx = text.indexOf(section.text);
      }
      
      if (startIdx < 0) continue;
      
      const endIdx = startIdx + section.text.length;

      if (startIdx > currentIndex) {
        result.push({
          text: text.slice(currentIndex, startIdx),
          isHighlighted: false,
        });
      }

      if (startIdx >= currentIndex) {
        result.push({
          text: text.slice(startIdx, endIdx),
          isHighlighted: true,
          section,
        });
        currentIndex = endIdx;
      }
    }

    if (currentIndex < text.length) {
      result.push({
        text: text.slice(currentIndex),
        isHighlighted: false,
      });
    }

    return result;
  }, [text, sections]);

  const highlightColor = type === "ai" 
    ? "bg-orange-200 dark:bg-orange-900/50 border-b-2 border-orange-400" 
    : "bg-yellow-200 dark:bg-yellow-900/50 border-b-2 border-yellow-400";

  const textColor = type === "ai"
    ? "text-orange-900 dark:text-orange-100"
    : "text-yellow-900 dark:text-yellow-100";

  if (!text) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Highlighter className="w-5 h-5" />
          {title || "Document with Highlighted Sections"}
        </CardTitle>
        <CardDescription>
          {type === "ai" 
            ? "Orange highlights indicate sections with AI-generated patterns" 
            : "Yellow highlights indicate sections that may be copied"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div 
          className="p-4 rounded-lg border bg-muted/30 max-h-96 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap"
          data-testid="highlighted-document-content"
        >
          {segments.map((segment, index) => (
            segment.isHighlighted ? (
              <span
                key={index}
                className={`${highlightColor} ${textColor} px-0.5 rounded-sm cursor-help`}
                title={segment.section?.reason || `${type === "ai" ? "AI probability" : "Similarity"}: ${Math.round(segment.section?.aiProbability || segment.section?.similarityScore || 0)}%`}
                data-testid={`highlight-${type}-${index}`}
              >
                {segment.text}
              </span>
            ) : (
              <span key={index}>{segment.text}</span>
            )
          ))}
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className={`w-3 h-3 rounded ${type === "ai" ? "bg-orange-300 dark:bg-orange-700" : "bg-yellow-300 dark:bg-yellow-700"}`}></span>
            <span>{type === "ai" ? "AI-generated content" : "Potentially copied content"}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-transparent border border-muted-foreground/30"></span>
            <span>Original content</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
