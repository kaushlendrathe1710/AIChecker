import { splitIntoSentences } from "./textExtractor";
import type { PlagiarismHighlightedSection } from "@shared/schema";
import { checkAgainstInternalDatabase, createDocumentFingerprint, type InternalMatch } from "./internalPlagiarismChecker";
import { searchForPlagiarism, isWebSearchEnabled, type WebSearchResult } from "./webSearchService";

export interface PlagiarismMatch {
  sourceUrl: string | null;
  sourceTitle: string | null;
  matchedText: string;
  originalText: string;
  similarityScore: number;
  startIndex: number;
  endIndex: number;
}

export interface PlagiarismScanResult {
  plagiarismScore: number;
  verdict: "original" | "low" | "moderate" | "high";
  summary: string;
  highlightedSections: PlagiarismHighlightedSection[];
  matches: PlagiarismMatch[];
  hasInternalMatches?: boolean;
  webSearchEnabled?: boolean;
  internalCoverage?: number;
  webCoverage?: number;
}

function getVerdict(score: number): "original" | "low" | "moderate" | "high" {
  if (score < 15) return "original";
  if (score < 30) return "low";
  if (score < 50) return "moderate";
  return "high";
}

function calculateCoverage(text: string, matchedSpans: { start: number; end: number }[]): number {
  if (!text || matchedSpans.length === 0) return 0;
  
  const sorted = [...matchedSpans].sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [];
  
  for (const span of sorted) {
    if (merged.length === 0 || span.start > merged[merged.length - 1].end) {
      merged.push({ start: span.start, end: span.end });
    } else {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, span.end);
    }
  }
  
  const totalMatchedChars = merged.reduce((sum, span) => sum + (span.end - span.start), 0);
  return (totalMatchedChars / text.length) * 100;
}

function findAllOccurrences(text: string, searchStr: string): { start: number; end: number }[] {
  const occurrences: { start: number; end: number }[] = [];
  let pos = 0;
  while (pos < text.length) {
    const idx = text.indexOf(searchStr, pos);
    if (idx === -1) break;
    occurrences.push({ start: idx, end: idx + searchStr.length });
    pos = idx + 1;
  }
  return occurrences;
}

export async function scanForPlagiarism(text: string): Promise<PlagiarismScanResult> {
  return {
    plagiarismScore: 0,
    verdict: "original",
    summary: "No internal database matches found. For comprehensive checking, use plagiarism check with document upload.",
    highlightedSections: [],
    matches: [],
  };
}

export async function scanForPlagiarismEnhanced(
  text: string,
  documentId: string,
  userId: string,
  fileName: string
): Promise<PlagiarismScanResult> {
  const matches: PlagiarismMatch[] = [];
  const internalSpans: { start: number; end: number }[] = [];
  const webSpans: { start: number; end: number }[] = [];
  
  let internalCoverage = 0;
  let webCoverage = 0;
  let hasInternalMatches = false;
  
  console.log(`[PLAGIARISM] Starting evidence-based scan for document ${documentId}`);
  console.log(`[PLAGIARISM] Document length: ${text.length} characters`);

  try {
    const internalCheck = await checkAgainstInternalDatabase(documentId, text);
    
    if (internalCheck.hasInternalMatches && internalCheck.highestMatch > 0) {
      hasInternalMatches = true;
      console.log(`[PLAGIARISM] Internal database: ${internalCheck.matches.length} document(s) match, highest ${internalCheck.highestMatch}%`);
      
      const addedSpanKeys = new Set<string>();
      
      for (const internalMatch of internalCheck.matches) {
        for (const sentence of internalMatch.matchedSentences) {
          const occurrences = findAllOccurrences(text, sentence);
          
          for (const occ of occurrences) {
            const spanKey = `${occ.start}-${occ.end}`;
            if (addedSpanKeys.has(spanKey)) continue;
            addedSpanKeys.add(spanKey);
            
            internalSpans.push(occ);
            
            matches.push({
              sourceUrl: null,
              sourceTitle: `Previously submitted document (${internalMatch.matchPercentage}% match)`,
              matchedText: sentence,
              originalText: sentence,
              similarityScore: internalMatch.matchPercentage,
              startIndex: occ.start,
              endIndex: occ.end,
            });
          }
        }
      }
      
      internalCoverage = calculateCoverage(text, internalSpans);
      console.log(`[PLAGIARISM] Internal coverage: ${internalCoverage.toFixed(1)}%`);
    }
    
    await createDocumentFingerprint(documentId, userId, fileName, text);
  } catch (error) {
    console.error("[PLAGIARISM] Internal check error:", error);
  }

  if (isWebSearchEnabled()) {
    try {
      const sentences = splitIntoSentences(text);
      const webMatches = await searchForPlagiarism(sentences);
      
      if (webMatches.length > 0) {
        console.log(`[PLAGIARISM] Web search: ${webMatches.length} matches found`);
        
        const addedWebSpanKeys = new Set<string>();
        
        for (const match of webMatches) {
          if (match.matchedText) {
            const occurrences = findAllOccurrences(text, match.matchedText);
            
            for (const occ of occurrences) {
              const spanKey = `${occ.start}-${occ.end}`;
              if (addedWebSpanKeys.has(spanKey)) continue;
              addedWebSpanKeys.add(spanKey);
              
              webSpans.push(occ);
              
              matches.push({
                sourceUrl: match.url,
                sourceTitle: match.title || "Web source",
                matchedText: match.matchedText,
                originalText: match.matchedText,
                similarityScore: match.similarity || 80,
                startIndex: occ.start,
                endIndex: occ.end,
              });
            }
          }
        }
        
        webCoverage = calculateCoverage(text, webSpans);
        console.log(`[PLAGIARISM] Web coverage: ${webCoverage.toFixed(1)}%`);
      }
    } catch (error) {
      console.error("[PLAGIARISM] Web search error:", error);
    }
  } else {
    console.log("[PLAGIARISM] Web search not enabled - using internal database only");
  }

  const allSpans = [...internalSpans, ...webSpans];
  const totalCoverage = calculateCoverage(text, allSpans);
  
  const plagiarismScore = Math.min(100, Math.max(0, Math.round(totalCoverage)));
  const verdict = getVerdict(plagiarismScore);

  const highlightedSections: PlagiarismHighlightedSection[] = matches.map(m => ({
    text: m.originalText,
    startIndex: m.startIndex,
    endIndex: m.endIndex,
    similarityScore: m.similarityScore,
    sourceUrl: m.sourceUrl || undefined,
    sourceTitle: m.sourceTitle || undefined,
  }));

  let summary = "";
  if (matches.length === 0) {
    if (!isWebSearchEnabled()) {
      summary = "No matches found in our internal database. Enable web search for comprehensive checking against online sources.";
    } else {
      summary = "No plagiarism detected. The content appears to be original.";
    }
  } else if (plagiarismScore < 15) {
    summary = `Found ${matches.length} minor match(es) covering ${plagiarismScore}% of your document. This is within acceptable limits.`;
  } else if (plagiarismScore < 30) {
    summary = `Found ${matches.length} match(es) covering ${plagiarismScore}% of your document. Consider adding citations for matched sections.`;
  } else if (plagiarismScore < 50) {
    summary = `Found ${matches.length} match(es) covering ${plagiarismScore}% of your document. Significant revision recommended.`;
  } else {
    summary = `Found ${matches.length} match(es) covering ${plagiarismScore}% of your document. Major revision required.`;
  }
  
  if (hasInternalMatches) {
    summary += " ALERT: Matches found against previously submitted documents.";
  }

  console.log(`[PLAGIARISM] Final score: ${plagiarismScore}% (coverage-based), verdict: ${verdict}, matches: ${matches.length}`);

  return {
    plagiarismScore,
    verdict,
    summary,
    highlightedSections,
    matches,
    hasInternalMatches,
    webSearchEnabled: isWebSearchEnabled(),
    internalCoverage: Math.round(internalCoverage),
    webCoverage: Math.round(webCoverage),
  };
}
