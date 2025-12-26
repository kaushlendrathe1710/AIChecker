import PDFDocument from "pdfkit";
import mammoth from "mammoth";
import AdmZip from "adm-zip";

export type ConversionType = "word-to-pdf" | "pdf-to-word" | "txt-to-pdf" | "pdf-to-txt";

export async function convertFile(
  buffer: Buffer,
  conversionType: ConversionType,
  originalFileName: string
): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
  const baseName = originalFileName.replace(/\.[^/.]+$/, "");

  switch (conversionType) {
    case "word-to-pdf":
      return convertWordToPdf(buffer, baseName);
    case "pdf-to-word":
      return convertPdfToWord(buffer, baseName);
    case "txt-to-pdf":
      return convertTxtToPdf(buffer, baseName);
    case "pdf-to-txt":
      return convertPdfToTxt(buffer, baseName);
    default:
      throw new Error("Unsupported conversion type");
  }
}

async function convertWordToPdf(buffer: Buffer, baseName: string): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => {
      resolve({
        buffer: Buffer.concat(chunks),
        fileName: `${baseName}.pdf`,
        mimeType: "application/pdf",
      });
    });
    doc.on("error", reject);

    doc.fontSize(12).font("Helvetica");
    
    const lines = text.split("\n");
    for (const line of lines) {
      if (doc.y > 750) {
        doc.addPage();
      }
      doc.text(line.trim() || " ", { continued: false });
    }

    doc.end();
  });
}

async function convertPdfToWord(buffer: Buffer, baseName: string): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
  const pdfParse = await import("pdf-parse");
  const pdfData = await pdfParse.default(buffer);
  const text = pdfData.text;

  const simpleDocx = createSimpleDocx(text);

  return {
    buffer: simpleDocx,
    fileName: `${baseName}.docx`,
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
}

function createSimpleDocx(text: string): Buffer {
  const textContent = text
    .split("\n")
    .map((line: string) => `<w:p><w:r><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`)
    .join("\n");

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
${textContent}
  </w:body>
</w:document>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const zip = new AdmZip();
  
  zip.addFile("[Content_Types].xml", Buffer.from(contentTypesXml, "utf8"));
  zip.addFile("_rels/.rels", Buffer.from(relsXml, "utf8"));
  zip.addFile("word/document.xml", Buffer.from(documentXml, "utf8"));

  return zip.toBuffer();
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function convertTxtToPdf(buffer: Buffer, baseName: string): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
  const text = buffer.toString("utf-8");

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => {
      resolve({
        buffer: Buffer.concat(chunks),
        fileName: `${baseName}.pdf`,
        mimeType: "application/pdf",
      });
    });
    doc.on("error", reject);

    doc.fontSize(12).font("Helvetica");
    
    const lines = text.split("\n");
    for (const line of lines) {
      if (doc.y > 750) {
        doc.addPage();
      }
      doc.text(line || " ", { continued: false });
    }

    doc.end();
  });
}

async function convertPdfToTxt(buffer: Buffer, baseName: string): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
  const pdfParse = await import("pdf-parse");
  const pdfData = await pdfParse.default(buffer);
  const text = pdfData.text;

  return {
    buffer: Buffer.from(text, "utf-8"),
    fileName: `${baseName}.txt`,
    mimeType: "text/plain",
  };
}
