import { db } from "./db";
import { documentFingerprints, documents } from "@shared/schema";
import { eq, ne, and, desc } from "drizzle-orm";
import crypto from "crypto";

export interface InternalMatch {
  matchPercentage: number;
  matchCount: number;
  uploadedAt: Date;
  matchedSentences: string[];
}

export interface InternalCheckResult {
  hasInternalMatches: boolean;
  matches: InternalMatch[];
  highestMatch: number;
}

function hashText(text: string): string {
  return crypto.createHash("md5").update(text.toLowerCase().trim()).digest("hex");
}

function hashSentences(sentences: string[]): string[] {
  return sentences.map(s => hashText(s));
}

function normalizeText(text: string): string {
  return text.toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitIntoSentences(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20);
}

function splitIntoSentencesPreserved(text: string): { original: string; normalized: string }[] {
  return text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20)
    .map(s => ({
      original: s,
      normalized: normalizeText(s)
    }));
}

export async function createDocumentFingerprint(
  documentId: string,
  userId: string,
  fileName: string,
  text: string
): Promise<void> {
  const normalizedText = normalizeText(text);
  const sentences = splitIntoSentences(normalizedText);
  const textHash = hashText(normalizedText);
  const sentenceHashes = hashSentences(sentences);
  const wordCount = normalizedText.split(/\s+/).length;

  await db.insert(documentFingerprints).values({
    documentId,
    userId,
    fileName,
    textHash,
    sentenceHashes,
    wordCount,
  });

  console.log(`[INTERNAL CHECK] Created fingerprint for document ${documentId} with ${sentences.length} sentences`);
}

export async function checkAgainstInternalDatabase(
  currentDocumentId: string,
  text: string
): Promise<InternalCheckResult> {
  const preservedSentences = splitIntoSentencesPreserved(text);
  const sentences = preservedSentences.map(s => s.normalized);
  const originalSentences = preservedSentences.map(s => s.original);
  const currentSentenceHashes = hashSentences(sentences);
  const currentTextHash = hashText(normalizeText(text));

  const existingFingerprints = await db
    .select()
    .from(documentFingerprints)
    .where(ne(documentFingerprints.documentId, currentDocumentId))
    .orderBy(desc(documentFingerprints.createdAt))
    .limit(500);

  console.log(`[INTERNAL CHECK] Comparing against ${existingFingerprints.length} existing documents`);

  const matches: InternalMatch[] = [];

  for (const fp of existingFingerprints) {
    if (fp.textHash === currentTextHash) {
      matches.push({
        matchPercentage: 100,
        matchCount: sentences.length,
        uploadedAt: fp.createdAt,
        matchedSentences: originalSentences,
      });
      continue;
    }

    const existingSentenceHashes = fp.sentenceHashes as string[] || [];
    let matchCount = 0;
    const matchedSentences: string[] = [];

    for (let i = 0; i < currentSentenceHashes.length; i++) {
      if (existingSentenceHashes.includes(currentSentenceHashes[i])) {
        matchCount++;
        matchedSentences.push(originalSentences[i]);
      }
    }

    if (matchCount > 0) {
      const matchPercentage = Math.round((matchCount / Math.max(currentSentenceHashes.length, 1)) * 100);
      
      if (matchPercentage >= 10) {
        matches.push({
          matchPercentage,
          matchCount,
          uploadedAt: fp.createdAt,
          matchedSentences,
        });
      }
    }
  }

  matches.sort((a, b) => b.matchPercentage - a.matchPercentage);

  const topMatches = matches.slice(0, 5);
  const highestMatch = topMatches.length > 0 ? topMatches[0].matchPercentage : 0;

  console.log(`[INTERNAL CHECK] Found ${matches.length} matches, highest: ${highestMatch}%`);

  return {
    hasInternalMatches: topMatches.length > 0,
    matches: topMatches,
    highestMatch,
  };
}
