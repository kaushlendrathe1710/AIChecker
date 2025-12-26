import PDFDocument from "pdfkit";
import type { Document, AiCheckResult, PlagiarismCheckResult, PlagiarismMatch, GrammarResult, GrammarMistake } from "@shared/schema";

interface HighlightedSection {
  text: string;
  startIndex: number;
  endIndex: number;
  aiProbability?: number;
  label?: string;
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
  }
  return [0, 0, 0];
}

function getAiHighlightColor(probability: number): string {
  if (probability >= 0.8) return "#FEE2E2";
  if (probability >= 0.6) return "#FED7AA";
  if (probability >= 0.4) return "#FEF3C7";
  return "#DCFCE7";
}

function getPlagiarismHighlightColor(similarity: number): string {
  if (similarity >= 0.8) return "#FEE2E2";
  if (similarity >= 0.5) return "#FED7AA";
  return "#FEF3C7";
}

function getGrammarHighlightColor(type: string): string {
  switch (type) {
    case "spelling": return "#FEE2E2";
    case "grammar": return "#FED7AA";
    case "punctuation": return "#DBEAFE";
    case "style": return "#F3E8FF";
    default: return "#F3F4F6";
  }
}

export async function generateAiCheckPdf(
  document: Document,
  aiResult: AiCheckResult
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.fontSize(20).font("Helvetica-Bold").text("AI Content Detection Report", { align: "center" });
      doc.moveDown();

      doc.fontSize(12).font("Helvetica");
      doc.text(`Document: ${document.fileName}`, { continued: false });
      doc.text(`Analysis Date: ${new Date(aiResult.createdAt).toLocaleDateString()}`);
      doc.text(`Word Count: ${document.wordCount || "N/A"}`);
      doc.moveDown();

      doc.rect(50, doc.y, 495, 80).fillAndStroke("#F3F4F6", "#E5E7EB");
      const scoreY = doc.y + 10;
      doc.fillColor("#000000");
      doc.fontSize(14).font("Helvetica-Bold").text("AI Detection Score", 60, scoreY);
      doc.fontSize(32).text(`${Math.round(aiResult.aiScore)}%`, 60, scoreY + 25);
      
      const verdictLabel = aiResult.verdict.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      let verdictColor = "#22C55E";
      if (aiResult.verdict === "ai" || aiResult.verdict === "likely_ai") verdictColor = "#EF4444";
      else if (aiResult.verdict === "mixed") verdictColor = "#F59E0B";
      
      doc.fillColor(verdictColor).fontSize(16).text(verdictLabel, 300, scoreY + 20);
      doc.fillColor("#000000");
      doc.y = scoreY + 90;
      doc.moveDown();

      doc.fontSize(14).font("Helvetica-Bold").text("Legend:");
      doc.fontSize(10).font("Helvetica");
      
      const legendY = doc.y;
      doc.rect(50, legendY, 15, 15).fill("#FEE2E2");
      doc.fillColor("#000000").text("High AI probability (80%+)", 70, legendY + 2);
      
      doc.rect(200, legendY, 15, 15).fill("#FED7AA");
      doc.fillColor("#000000").text("Medium AI probability (60-80%)", 220, legendY + 2);
      
      doc.rect(380, legendY, 15, 15).fill("#FEF3C7");
      doc.fillColor("#000000").text("Low AI probability (40-60%)", 400, legendY + 2);
      
      doc.moveDown(2);

      if (aiResult.analysis) {
        doc.fontSize(14).font("Helvetica-Bold").text("Analysis Summary:");
        doc.fontSize(10).font("Helvetica").text(aiResult.analysis);
        doc.moveDown();
      }

      doc.addPage();
      doc.fontSize(14).font("Helvetica-Bold").text("Document Content with Highlighted AI Sections:");
      doc.moveDown();

      const text = document.extractedText || "";
      const highlights = (aiResult.highlightedSections as HighlightedSection[]) || [];
      
      if (highlights.length > 0 && text) {
        const sortedHighlights = [...highlights].sort((a, b) => a.startIndex - b.startIndex);
        let lastIndex = 0;

        for (const highlight of sortedHighlights) {
          if (highlight.startIndex > lastIndex) {
            const normalText = text.slice(lastIndex, highlight.startIndex);
            doc.font("Helvetica").fontSize(10).fillColor("#000000").text(normalText, { continued: true });
          }

          const highlightColor = getAiHighlightColor(highlight.aiProbability || 0.5);
          const highlightedText = text.slice(highlight.startIndex, highlight.endIndex);
          
          doc.save();
          doc.rect(doc.x, doc.y - 2, doc.widthOfString(highlightedText.substring(0, 80)) + 2, 14).fill(highlightColor);
          doc.restore();
          doc.font("Helvetica").fontSize(10).fillColor("#000000").text(highlightedText, { continued: true });
          
          lastIndex = highlight.endIndex;
        }

        if (lastIndex < text.length) {
          doc.font("Helvetica").fontSize(10).fillColor("#000000").text(text.slice(lastIndex));
        }
      } else {
        doc.font("Helvetica").fontSize(10).text(text || "No text content available");
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export async function generatePlagiarismCheckPdf(
  document: Document,
  plagiarismResult: PlagiarismCheckResult,
  matches: PlagiarismMatch[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.fontSize(20).font("Helvetica-Bold").text("Plagiarism Detection Report", { align: "center" });
      doc.moveDown();

      doc.fontSize(12).font("Helvetica");
      doc.text(`Document: ${document.fileName}`);
      doc.text(`Analysis Date: ${new Date(plagiarismResult.createdAt).toLocaleDateString()}`);
      doc.text(`Word Count: ${document.wordCount || "N/A"}`);
      doc.moveDown();

      doc.rect(50, doc.y, 495, 80).fillAndStroke("#F3F4F6", "#E5E7EB");
      const scoreY = doc.y + 10;
      doc.fillColor("#000000");
      doc.fontSize(14).font("Helvetica-Bold").text("Plagiarism Score", 60, scoreY);
      doc.fontSize(32).text(`${Math.round(plagiarismResult.plagiarismScore)}%`, 60, scoreY + 25);
      
      const verdictLabels: Record<string, string> = {
        original: "Original Content",
        low: "Low Similarity",
        moderate: "Moderate Similarity",
        high: "High Similarity"
      };
      const verdictLabel = verdictLabels[plagiarismResult.verdict] || plagiarismResult.verdict;
      let verdictColor = "#22C55E";
      if (plagiarismResult.verdict === "high") verdictColor = "#EF4444";
      else if (plagiarismResult.verdict === "moderate") verdictColor = "#F59E0B";
      
      doc.fillColor(verdictColor).fontSize(16).text(verdictLabel, 300, scoreY + 20);
      doc.fillColor("#000000");
      doc.y = scoreY + 90;
      doc.moveDown();

      doc.fontSize(14).font("Helvetica-Bold").text("Legend:");
      doc.fontSize(10).font("Helvetica");
      
      const legendY = doc.y;
      doc.rect(50, legendY, 15, 15).fill("#FEE2E2");
      doc.fillColor("#000000").text("High similarity (80%+)", 70, legendY + 2);
      
      doc.rect(200, legendY, 15, 15).fill("#FED7AA");
      doc.fillColor("#000000").text("Medium similarity (50-80%)", 220, legendY + 2);
      
      doc.rect(380, legendY, 15, 15).fill("#FEF3C7");
      doc.fillColor("#000000").text("Low similarity (<50%)", 400, legendY + 2);
      
      doc.moveDown(2);

      if (plagiarismResult.summary) {
        doc.fontSize(14).font("Helvetica-Bold").text("Summary:");
        doc.fontSize(10).font("Helvetica").text(plagiarismResult.summary);
        doc.moveDown();
      }

      if (matches.length > 0) {
        doc.addPage();
        doc.fontSize(14).font("Helvetica-Bold").text("Matched Sources:");
        doc.moveDown();

        for (let i = 0; i < matches.length; i++) {
          const match = matches[i];
          if (doc.y > 700) doc.addPage();
          
          const matchColor = getPlagiarismHighlightColor(match.similarityScore / 100);
          const rgb = hexToRgb(matchColor);
          
          doc.rect(50, doc.y, 495, 80).fillAndStroke(rgb, "#E5E7EB");
          doc.fillColor("#000000");
          
          const matchY = doc.y + 5;
          doc.fontSize(11).font("Helvetica-Bold").text(`Match ${i + 1}: ${Math.round(match.similarityScore)}% similar`, 60, matchY);
          if (match.sourceTitle) {
            doc.fontSize(10).font("Helvetica").text(`Source: ${match.sourceTitle}`, 60, matchY + 15);
          }
          if (match.sourceUrl) {
            doc.fillColor("#2563EB").text(match.sourceUrl, 60, matchY + 30, { link: match.sourceUrl, underline: true });
          }
          doc.fillColor("#000000").fontSize(9).text(`"${match.matchedText.substring(0, 100)}..."`, 60, matchY + 50);
          
          doc.y = matchY + 85;
          doc.moveDown(0.5);
        }
      }

      doc.addPage();
      doc.fontSize(14).font("Helvetica-Bold").text("Document Content with Highlighted Matches:");
      doc.moveDown();

      const text = document.extractedText || "";
      
      if (matches.length > 0 && text) {
        const sortedMatches = [...matches].sort((a, b) => a.startIndex - b.startIndex);
        let lastIndex = 0;

        for (const match of sortedMatches) {
          if (match.startIndex > lastIndex) {
            const normalText = text.slice(lastIndex, match.startIndex);
            doc.font("Helvetica").fontSize(10).fillColor("#000000").text(normalText, { continued: true });
          }

          const highlightColor = getPlagiarismHighlightColor(match.similarityScore / 100);
          const highlightedText = text.slice(match.startIndex, match.endIndex);
          
          doc.save();
          doc.rect(doc.x, doc.y - 2, doc.widthOfString(highlightedText.substring(0, 80)) + 2, 14).fill(highlightColor);
          doc.restore();
          doc.font("Helvetica").fontSize(10).fillColor("#000000").text(highlightedText, { continued: true });
          
          lastIndex = match.endIndex;
        }

        if (lastIndex < text.length) {
          doc.font("Helvetica").fontSize(10).fillColor("#000000").text(text.slice(lastIndex));
        }
      } else {
        doc.font("Helvetica").fontSize(10).text(text || "No text content available");
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export async function generateGrammarCheckPdf(
  document: Document,
  grammarResult: GrammarResult
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.fontSize(20).font("Helvetica-Bold").text("Grammar Check Report", { align: "center" });
      doc.moveDown();

      doc.fontSize(12).font("Helvetica");
      doc.text(`Document: ${document.fileName}`);
      doc.text(`Analysis Date: ${new Date(grammarResult.createdAt).toLocaleDateString()}`);
      doc.text(`Word Count: ${document.wordCount || "N/A"}`);
      doc.moveDown();

      doc.rect(50, doc.y, 495, 80).fillAndStroke("#F3F4F6", "#E5E7EB");
      const scoreY = doc.y + 10;
      doc.fillColor("#000000");
      doc.fontSize(14).font("Helvetica-Bold").text("Grammar Score", 60, scoreY);
      doc.fontSize(32).text(`${Math.round(grammarResult.overallScore)}%`, 60, scoreY + 25);
      
      let verdictLabel = "Needs Improvement";
      let verdictColor = "#EF4444";
      if (grammarResult.overallScore >= 90) {
        verdictLabel = "Excellent";
        verdictColor = "#22C55E";
      } else if (grammarResult.overallScore >= 70) {
        verdictLabel = "Good";
        verdictColor = "#F59E0B";
      }
      
      doc.fillColor(verdictColor).fontSize(16).text(verdictLabel, 300, scoreY + 20);
      doc.fillColor("#000000");
      doc.y = scoreY + 90;
      doc.moveDown();

      doc.fontSize(14).font("Helvetica-Bold").text("Error Summary:");
      doc.fontSize(10).font("Helvetica");
      doc.text(`Total Errors: ${grammarResult.totalMistakes}`);
      doc.text(`Spelling Errors: ${grammarResult.spellingErrors}`);
      doc.text(`Grammar Errors: ${grammarResult.grammarErrors}`);
      doc.text(`Punctuation Errors: ${grammarResult.punctuationErrors}`);
      doc.text(`Style Issues: ${grammarResult.styleErrors}`);
      doc.moveDown();

      doc.fontSize(14).font("Helvetica-Bold").text("Legend:");
      doc.fontSize(10).font("Helvetica");
      
      const legendY = doc.y;
      doc.rect(50, legendY, 15, 15).fill("#FEE2E2");
      doc.fillColor("#000000").text("Spelling", 70, legendY + 2);
      
      doc.rect(130, legendY, 15, 15).fill("#FED7AA");
      doc.fillColor("#000000").text("Grammar", 150, legendY + 2);
      
      doc.rect(220, legendY, 15, 15).fill("#DBEAFE");
      doc.fillColor("#000000").text("Punctuation", 240, legendY + 2);
      
      doc.rect(320, legendY, 15, 15).fill("#F3E8FF");
      doc.fillColor("#000000").text("Style", 340, legendY + 2);
      
      doc.moveDown(2);

      const mistakes = (grammarResult.mistakes as GrammarMistake[]) || [];
      
      if (mistakes.length > 0) {
        doc.addPage();
        doc.fontSize(14).font("Helvetica-Bold").text("Detailed Corrections:");
        doc.moveDown();

        for (let i = 0; i < mistakes.length && i < 50; i++) {
          const mistake = mistakes[i];
          if (doc.y > 700) doc.addPage();
          
          const errorColor = getGrammarHighlightColor(mistake.type);
          const rgb = hexToRgb(errorColor);
          
          doc.rect(50, doc.y, 495, 60).fillAndStroke(rgb, "#E5E7EB");
          doc.fillColor("#000000");
          
          const errorY = doc.y + 5;
          doc.fontSize(10).font("Helvetica-Bold").text(`${mistake.type.toUpperCase()}`, 60, errorY);
          doc.fontSize(9).font("Helvetica");
          doc.fillColor("#DC2626").text(`Original: "${mistake.text}"`, 60, errorY + 15);
          doc.fillColor("#16A34A").text(`Correction: "${mistake.suggestion}"`, 60, errorY + 30);
          doc.fillColor("#6B7280").text(mistake.explanation, 60, errorY + 45, { width: 480 });
          
          doc.y = errorY + 65;
          doc.moveDown(0.5);
        }
      }

      if (grammarResult.correctedText) {
        doc.addPage();
        doc.fontSize(14).font("Helvetica-Bold").text("Corrected Document:");
        doc.moveDown();
        doc.fontSize(10).font("Helvetica").fillColor("#000000").text(grammarResult.correctedText);
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
