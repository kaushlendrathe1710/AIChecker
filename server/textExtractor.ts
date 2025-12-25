import * as mammoth from "mammoth";

export async function extractText(buffer: Buffer, fileType: string): Promise<string> {
  try {
    if (fileType === "application/pdf" || fileType.endsWith(".pdf")) {
      const pdfParse = (await import("pdf-parse")).default;
      const data = await pdfParse(buffer);
      return data.text.trim();
    }
    
    if (fileType.includes("wordprocessingml") || fileType.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value.trim();
    }
    
    if (fileType === "text/plain" || fileType.endsWith(".txt")) {
      return buffer.toString("utf-8").trim();
    }
    
    throw new Error(`Unsupported file type: ${fileType}`);
  } catch (error) {
    console.error("Text extraction error:", error);
    throw new Error("Failed to extract text from document");
  }
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

export function splitIntoSentences(text: string): string[] {
  return text
    .replace(/([.!?])\s+/g, "$1|")
    .split("|")
    .map(s => s.trim())
    .filter(s => s.length > 10);
}

export function splitIntoChunks(text: string, chunkSize: number = 500): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize).join(" "));
  }
  
  return chunks;
}
