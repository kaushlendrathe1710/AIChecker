import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { sendOtpEmail, sendWelcomeEmail } from "./email";
import { extractText, countWords } from "./textExtractor";
import { scanDocument } from "./plagiarismScanner";
import { scanForAI } from "./aiScanner";
import { scanForPlagiarism, scanForPlagiarismEnhanced } from "./plagiarismScannerService";
import { emailSchema, otpVerifySchema, registrationSchema } from "@shared/schema";
import multer from "multer";
import { randomInt } from "crypto";
import { uploadFile, getFileBuffer, getSignedDownloadUrl } from "./s3";
import { checkGrammar } from "./grammarChecker";
import { stripeService } from "./stripeService";
import { getStripePublishableKey, getUncachableStripeClient } from "./stripeClient";
import { generateAiCheckPdf, generatePlagiarismCheckPdf, generateGrammarCheckPdf } from "./pdfReportGenerator";
import { convertFile, type ConversionType } from "./fileConverter";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

function generateOtp(): string {
  return randomInt(100000, 999999).toString();
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: {
        id: string;
        email: string;
        fullName: string | null;
        role: string;
        isAdmin: boolean;
        isSuperAdmin: boolean;
      };
    }
  }
}

async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.headers["x-session-id"] as string;
  
  if (!sessionId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const session = await storage.getSession(sessionId);
  if (!session) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  const user = await storage.getUser(session.userId);
  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }

  req.userId = user.id;
  req.user = {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    isAdmin: user.isAdmin,
    isSuperAdmin: user.isSuperAdmin,
  };
  
  next();
}

async function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

async function superAdminMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({ error: "Super admin access required" });
  }
  next();
}

const SUPER_ADMIN_EMAIL = "kaushlendra.k12@fms.edu";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const parsed = emailSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const { email } = parsed.data;
      
      await storage.invalidateOtpsForEmail(email);
      
      const otp = generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await storage.createOtp({ email, code: otp, expiresAt });
      const sent = await sendOtpEmail(email, otp);

      if (!sent) {
        return res.status(500).json({ error: "Failed to send OTP email" });
      }

      const user = await storage.getUserByEmail(email);
      res.json({ 
        success: true, 
        message: "OTP sent to your email",
        isNewUser: !user || !user.isVerified
      });
    } catch (error) {
      console.error("Send OTP error:", error);
      res.status(500).json({ error: "Failed to send OTP" });
    }
  });

  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const parsed = otpVerifySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const { email, code } = parsed.data;
      const otp = await storage.getValidOtp(email, code);

      if (!otp) {
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }

      await storage.markOtpUsed(otp.id);
      let user = await storage.getUserByEmail(email);
      const isNewUser = !user || !user.isVerified;

      if (!user) {
        user = await storage.createUser({ email, role: "student" });
      }

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const session = await storage.createSession({ userId: user.id, expiresAt });

      res.json({
        success: true,
        sessionId: session.id,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          isVerified: user.isVerified,
          isAdmin: user.isAdmin,
          isSuperAdmin: user.isSuperAdmin,
        },
        needsRegistration: isNewUser || !user.fullName,
      });
    } catch (error) {
      console.error("Verify OTP error:", error);
      res.status(500).json({ error: "Failed to verify OTP" });
    }
  });

  app.post("/api/auth/complete-registration", authMiddleware, async (req, res) => {
    try {
      const parsed = registrationSchema.safeParse({ ...req.body, email: req.user?.email });
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const { fullName, mobile, role } = parsed.data;
      const user = await storage.updateUser(req.userId!, { 
        fullName, 
        mobile,
        role,
        isVerified: true 
      });

      if (user) {
        await sendWelcomeEmail(user.email, user.fullName || "User");
      }

      res.json({ 
        success: true, 
        user: {
          id: user?.id,
          email: user?.email,
          fullName: user?.fullName,
          role: user?.role,
          isVerified: user?.isVerified,
        }
      });
    } catch (error) {
      console.error("Complete registration error:", error);
      res.status(500).json({ error: "Failed to complete registration" });
    }
  });

  app.get("/api/auth/me", authMiddleware, async (req, res) => {
    const user = await storage.getUser(req.userId!);
    res.json({ 
      user: {
        ...req.user,
        isAdmin: user?.isAdmin ?? false,
        isSuperAdmin: user?.isSuperAdmin ?? false,
      }
    });
  });

  app.post("/api/auth/logout", authMiddleware, async (req, res) => {
    try {
      const sessionId = req.headers["x-session-id"] as string;
      await storage.deleteSession(sessionId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to logout" });
    }
  });

  // Upload document via multipart form
  app.post("/api/documents/upload", authMiddleware, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { originalname, mimetype, buffer } = req.file;
      
      const { key, url } = await uploadFile(buffer, originalname, mimetype);

      const doc = await storage.createDocument({
        userId: req.userId!,
        fileName: originalname,
        fileType: mimetype,
        fileSize: buffer.length,
        s3Key: key,
        s3Url: url,
      });

      res.json({ success: true, document: doc });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to upload document" });
    }
  });

  app.get("/api/documents", authMiddleware, async (req, res) => {
    try {
      const documents = await storage.getDocumentsByUser(req.userId!);
      
      const documentsWithChecks = await Promise.all(
        documents.map(async (doc) => {
          const [aiCheck, plagiarismCheck, grammarCheck] = await Promise.all([
            storage.getAiCheckResultByDocument(doc.id),
            storage.getPlagiarismCheckResultByDocument(doc.id),
            storage.getGrammarResultByDocument(doc.id),
          ]);
          
          return {
            ...doc,
            checks: {
              ai: aiCheck ? { done: true, score: aiCheck.aiScore, status: aiCheck.status } : null,
              plagiarism: plagiarismCheck ? { done: true, score: plagiarismCheck.plagiarismScore, status: plagiarismCheck.status } : null,
              grammar: grammarCheck ? { done: true, score: grammarCheck.overallScore, totalMistakes: grammarCheck.totalMistakes } : null,
            },
          };
        })
      );
      
      res.json({ documents: documentsWithChecks });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  app.get("/api/documents/:id", authMiddleware, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id);
      if (!doc || doc.userId !== req.userId) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.json({ document: doc });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch document" });
    }
  });

  app.get("/api/documents/:id/download", authMiddleware, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id);
      if (!doc || doc.userId !== req.userId) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      const url = await getSignedDownloadUrl(doc.s3Key);
      res.json({ url });
    } catch (error) {
      console.error("Download URL error:", error);
      res.status(500).json({ error: "Failed to generate download URL" });
    }
  });

  app.post("/api/documents/:id/scan", authMiddleware, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id);
      if (!doc || doc.userId !== req.userId) {
        return res.status(404).json({ error: "Document not found" });
      }

      if (doc.status === "scanning") {
        return res.status(400).json({ error: "Document is already being scanned" });
      }

      await storage.updateDocument(doc.id, { status: "scanning" });

      res.json({ success: true, message: "Scan started" });

      (async () => {
        try {
          // Read file from S3
          const buffer = await getFileBuffer(doc.s3Key);
          
          const text = await extractText(buffer, doc.fileType);
          const wordCount = countWords(text);

          await storage.updateDocument(doc.id, { 
            extractedText: text, 
            wordCount 
          });

          const startTime = Date.now();
          const scanResult = await scanDocument(text);
          const duration = Math.round((Date.now() - startTime) / 1000);

          const result = await storage.createScanResult({
            documentId: doc.id,
            overallScore: scanResult.overallScore,
            aiScore: scanResult.aiScore,
            webScore: scanResult.webScore,
            verdict: scanResult.verdict,
            highlightedText: scanResult.highlightedSections,
            scanDuration: duration,
          });

          for (const match of scanResult.sourceMatches) {
            await storage.createSourceMatch({
              scanResultId: result.id,
              sourceUrl: match.sourceUrl,
              sourceTitle: match.sourceTitle,
              matchedText: match.matchedText,
              originalText: match.originalText,
              similarityScore: match.similarityScore,
              startIndex: match.startIndex,
              endIndex: match.endIndex,
              matchType: match.matchType,
            });
          }

          await storage.updateDocument(doc.id, { status: "completed" });
        } catch (error) {
          console.error("Scan error:", error);
          await storage.updateDocument(doc.id, { status: "failed" });
        }
      })();
    } catch (error) {
      console.error("Start scan error:", error);
      res.status(500).json({ error: "Failed to start scan" });
    }
  });

  app.get("/api/documents/:id/report", authMiddleware, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id);
      if (!doc || doc.userId !== req.userId) {
        return res.status(404).json({ error: "Document not found" });
      }

      const scanResult = await storage.getScanResultByDocument(doc.id);
      if (!scanResult) {
        return res.status(404).json({ error: "No scan result found" });
      }

      const sourceMatches = await storage.getSourceMatchesByScanResult(scanResult.id);

      res.json({
        document: doc,
        scanResult: {
          ...scanResult,
          sourceMatches,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch report" });
    }
  });

  app.get("/api/stats", authMiddleware, async (req, res) => {
    try {
      const stats = await storage.getUserStats(req.userId!);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.post("/api/documents/:id/grammar-check", authMiddleware, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id);
      if (!doc || doc.userId !== req.userId) {
        return res.status(404).json({ error: "Document not found" });
      }

      res.json({ success: true, message: "Grammar check started" });

      (async () => {
        try {
          let text = doc.extractedText;
          
          if (!text) {
            const buffer = await getFileBuffer(doc.s3Key);
            text = await extractText(buffer, doc.fileType);
            await storage.updateDocument(doc.id, { extractedText: text });
          }

          const grammarResult = await checkGrammar(text);

          await storage.createGrammarResult({
            documentId: doc.id,
            totalMistakes: grammarResult.totalMistakes,
            spellingErrors: grammarResult.spellingErrors,
            grammarErrors: grammarResult.grammarErrors,
            punctuationErrors: grammarResult.punctuationErrors,
            styleErrors: grammarResult.styleErrors,
            overallScore: grammarResult.overallScore,
            mistakes: grammarResult.mistakes,
            correctedText: grammarResult.correctedText,
          });
        } catch (error) {
          console.error("Grammar check error:", error);
        }
      })();
    } catch (error) {
      console.error("Start grammar check error:", error);
      res.status(500).json({ error: "Failed to start grammar check" });
    }
  });

  app.get("/api/documents/:id/grammar-report", authMiddleware, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id);
      if (!doc || doc.userId !== req.userId) {
        return res.status(404).json({ error: "Document not found" });
      }

      const grammarResult = await storage.getGrammarResultByDocument(doc.id);
      if (!grammarResult) {
        return res.status(404).json({ error: "No grammar check result found" });
      }

      res.json({
        document: doc,
        grammarResult,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch grammar report" });
    }
  });

  app.post("/api/documents/:id/apply-corrections", authMiddleware, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id);
      if (!doc || doc.userId !== req.userId) {
        return res.status(404).json({ error: "Document not found" });
      }

      const grammarResult = await storage.getGrammarResultByDocument(doc.id);
      if (!grammarResult || !grammarResult.correctedText) {
        return res.status(404).json({ error: "No corrections available" });
      }

      res.json({
        success: true,
        correctedText: grammarResult.correctedText,
        message: "Corrections retrieved successfully",
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to apply corrections" });
    }
  });

  app.get("/api/documents/:id/download-corrected", authMiddleware, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id);
      if (!doc || doc.userId !== req.userId) {
        return res.status(404).json({ error: "Document not found" });
      }

      const grammarResult = await storage.getGrammarResultByDocument(doc.id);
      if (!grammarResult || !grammarResult.correctedText) {
        return res.status(404).json({ error: "No corrections available" });
      }

      const baseName = doc.fileName.replace(/\.[^/.]+$/, "");
      const correctedFileName = `${baseName}_corrected.txt`;
      
      res.json({
        fileName: correctedFileName,
        content: grammarResult.correctedText,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to download corrected file" });
    }
  });

  app.post("/api/ai-check/upload", authMiddleware, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const allowedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ error: "Invalid file type. Please upload PDF, DOCX, or TXT files." });
      }

      const fileBuffer = Buffer.from(req.file.buffer);
      const fileMimetype = req.file.mimetype;
      const fileName = req.file.originalname;
      const fileSize = req.file.size;
      
      const s3KeyPrefix = `ai-checks/${req.userId}/${Date.now()}-${fileName}`;
      const uploadResult = await uploadFile(fileBuffer, s3KeyPrefix, fileMimetype);

      const doc = await storage.createDocument({
        userId: req.userId!,
        fileName: fileName,
        fileType: fileMimetype,
        fileSize: fileSize,
        s3Key: uploadResult.key,
        s3Url: uploadResult.url,
      });

      const aiCheckResult = await storage.createAiCheckResult({
        documentId: doc.id,
        aiScore: 0,
        verdict: "human",
        analysis: null,
        highlightedSections: null,
        scanDuration: null,
        status: "pending",
      });

      res.json({ 
        success: true, 
        document: doc,
        aiCheckResult,
        message: "Document uploaded. AI check will start now." 
      });

      (async () => {
        try {
          console.log("[AI CHECK] Starting text extraction for document:", doc.id);
          const text = await extractText(fileBuffer, fileMimetype);
          const wordCount = countWords(text);
          console.log("[AI CHECK] Extracted text length:", text.length, "words:", wordCount);
          await storage.updateDocument(doc.id, { extractedText: text, wordCount });

          const startTime = Date.now();
          console.log("[AI CHECK] Starting AI scan...");
          const result = await scanForAI(text);
          const duration = Math.round((Date.now() - startTime) / 1000);
          console.log("[AI CHECK] Scan complete. Score:", result.aiScore, "Verdict:", result.verdict, "Duration:", duration, "s");

          const updated = await storage.updateAiCheckResult(aiCheckResult.id, {
            aiScore: result.aiScore,
            verdict: result.verdict,
            analysis: result.analysis,
            highlightedSections: result.highlightedSections,
            scanDuration: duration,
            status: "completed",
          });
          console.log("[AI CHECK] Updated result in DB:", updated?.id, "aiScore:", updated?.aiScore);

          await storage.updateDocument(doc.id, { status: "completed" });
          console.log("[AI CHECK] Document status updated to completed");
        } catch (error) {
          console.error("[AI CHECK] Error:", error);
          await storage.updateAiCheckResult(aiCheckResult.id, { status: "failed" });
          await storage.updateDocument(doc.id, { status: "failed" });
        }
      })();
    } catch (error) {
      console.error("AI check upload error:", error);
      res.status(500).json({ error: "Failed to upload file for AI check" });
    }
  });

  app.get("/api/ai-check/:documentId", authMiddleware, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.documentId);
      if (!doc || doc.userId !== req.userId) {
        return res.status(404).json({ error: "Document not found" });
      }

      const aiResult = await storage.getAiCheckResultByDocument(doc.id);
      if (!aiResult) {
        return res.status(404).json({ error: "No AI check result found" });
      }

      res.json({
        document: doc,
        aiResult,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch AI check result" });
    }
  });

  app.get("/api/ai-check/:documentId/download-report", authMiddleware, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.documentId);
      if (!doc || doc.userId !== req.userId) {
        return res.status(404).json({ error: "Document not found" });
      }

      const aiResult = await storage.getAiCheckResultByDocument(doc.id);
      if (!aiResult) {
        return res.status(404).json({ error: "No AI check result found" });
      }

      const baseName = doc.fileName.replace(/\.[^/.]+$/, "");
      const reportFileName = `${baseName}_ai_report.pdf`;

      const pdfBuffer = await generateAiCheckPdf(doc, aiResult);
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${reportFileName}"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Failed to generate AI PDF report:", error);
      res.status(500).json({ error: "Failed to generate AI report" });
    }
  });

  app.post("/api/plagiarism-check/upload", authMiddleware, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const allowedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ error: "Invalid file type. Please upload PDF, DOCX, or TXT files." });
      }

      const fileBuffer = Buffer.from(req.file.buffer);
      const fileMimetype = req.file.mimetype;
      const fileName = req.file.originalname;
      const fileSize = req.file.size;
      
      const s3KeyPrefix = `plagiarism-checks/${req.userId}/${Date.now()}-${fileName}`;
      const uploadResult = await uploadFile(fileBuffer, s3KeyPrefix, fileMimetype);

      const doc = await storage.createDocument({
        userId: req.userId!,
        fileName: fileName,
        fileType: fileMimetype,
        fileSize: fileSize,
        s3Key: uploadResult.key,
        s3Url: uploadResult.url,
      });

      const plagiarismResult = await storage.createPlagiarismCheckResult({
        documentId: doc.id,
        plagiarismScore: 0,
        verdict: "original",
        summary: null,
        highlightedSections: null,
        scanDuration: null,
        status: "pending",
      });

      res.json({ 
        success: true, 
        document: doc,
        plagiarismResult,
        message: "Document uploaded. Plagiarism check will start now." 
      });

      (async () => {
        try {
          console.log("[PLAGIARISM CHECK] Starting text extraction for document:", doc.id);
          const text = await extractText(fileBuffer, fileMimetype);
          const wordCount = countWords(text);
          console.log("[PLAGIARISM CHECK] Extracted text length:", text.length, "words:", wordCount);
          await storage.updateDocument(doc.id, { extractedText: text, wordCount });

          const startTime = Date.now();
          console.log("[PLAGIARISM CHECK] Starting plagiarism scan...");
          const result = await scanForPlagiarismEnhanced(text, doc.id, req.userId!, fileName);
          const duration = Math.round((Date.now() - startTime) / 1000);
          console.log("[PLAGIARISM CHECK] Scan complete. Score:", result.plagiarismScore, "Verdict:", result.verdict, "Duration:", duration, "s");
          if (result.hasInternalMatches) {
            console.log("[PLAGIARISM CHECK] Internal database matches detected");
          }
          if (result.webSearchEnabled) {
            console.log("[PLAGIARISM CHECK] Web search was enabled for this scan");
          }

          const updated = await storage.updatePlagiarismCheckResult(plagiarismResult.id, {
            plagiarismScore: result.plagiarismScore,
            verdict: result.verdict,
            summary: result.summary,
            highlightedSections: result.highlightedSections,
            scanDuration: duration,
            status: "completed",
          });
          console.log("[PLAGIARISM CHECK] Updated result in DB:", updated?.id, "plagiarismScore:", updated?.plagiarismScore);

          for (const match of result.matches) {
            await storage.createPlagiarismMatch({
              plagiarismResultId: plagiarismResult.id,
              sourceUrl: match.sourceUrl,
              sourceTitle: match.sourceTitle,
              matchedText: match.matchedText,
              originalText: match.originalText,
              similarityScore: match.similarityScore,
              startIndex: match.startIndex,
              endIndex: match.endIndex,
            });
          }
          console.log("[PLAGIARISM CHECK] Created", result.matches.length, "matches");

          await storage.updateDocument(doc.id, { status: "completed" });
          console.log("[PLAGIARISM CHECK] Document status updated to completed");
        } catch (error) {
          console.error("[PLAGIARISM CHECK] Error:", error);
          await storage.updatePlagiarismCheckResult(plagiarismResult.id, { status: "failed" });
          await storage.updateDocument(doc.id, { status: "failed" });
        }
      })();
    } catch (error) {
      console.error("Plagiarism check upload error:", error);
      res.status(500).json({ error: "Failed to upload file for plagiarism check" });
    }
  });

  app.get("/api/plagiarism-check/:documentId", authMiddleware, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.documentId);
      if (!doc || doc.userId !== req.userId) {
        return res.status(404).json({ error: "Document not found" });
      }

      const plagiarismResult = await storage.getPlagiarismCheckResultByDocument(doc.id);
      if (!plagiarismResult) {
        return res.status(404).json({ error: "No plagiarism check result found" });
      }

      const matches = await storage.getPlagiarismMatchesByResult(plagiarismResult.id);

      res.json({
        document: doc,
        plagiarismResult,
        matches,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch plagiarism check result" });
    }
  });

  app.get("/api/plagiarism-check/:documentId/download-report", authMiddleware, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.documentId);
      if (!doc || doc.userId !== req.userId) {
        return res.status(404).json({ error: "Document not found" });
      }

      const plagiarismResult = await storage.getPlagiarismCheckResultByDocument(doc.id);
      if (!plagiarismResult) {
        return res.status(404).json({ error: "No plagiarism check result found" });
      }

      const matches = await storage.getPlagiarismMatchesByResult(plagiarismResult.id);
      const baseName = doc.fileName.replace(/\.[^/.]+$/, "");
      const reportFileName = `${baseName}_plagiarism_report.pdf`;

      const pdfBuffer = await generatePlagiarismCheckPdf(doc, plagiarismResult, matches);
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${reportFileName}"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Failed to generate plagiarism PDF report:", error);
      res.status(500).json({ error: "Failed to generate plagiarism report" });
    }
  });

  app.post("/api/grammar-check/upload", authMiddleware, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const allowedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ error: "Invalid file type. Please upload PDF, DOCX, or TXT files." });
      }

      const fileBuffer = Buffer.from(req.file.buffer);
      const fileMimetype = req.file.mimetype;
      const fileName = req.file.originalname;
      const fileSize = req.file.size;
      
      const s3KeyPrefix = `grammar-checks/${req.userId}/${Date.now()}-${fileName}`;
      const uploadResult = await uploadFile(fileBuffer, s3KeyPrefix, fileMimetype);

      const doc = await storage.createDocument({
        userId: req.userId!,
        fileName: fileName,
        fileType: fileMimetype,
        fileSize: fileSize,
        s3Key: uploadResult.key,
        s3Url: uploadResult.url,
      });

      res.json({ 
        success: true, 
        document: doc,
        message: "Document uploaded. Grammar check will start now." 
      });

      (async () => {
        try {
          const text = await extractText(fileBuffer, fileMimetype);
          const wordCount = countWords(text);
          await storage.updateDocument(doc.id, { extractedText: text, wordCount });

          const grammarResult = await checkGrammar(text);

          await storage.createGrammarResult({
            documentId: doc.id,
            totalMistakes: grammarResult.totalMistakes,
            spellingErrors: grammarResult.spellingErrors,
            grammarErrors: grammarResult.grammarErrors,
            punctuationErrors: grammarResult.punctuationErrors,
            styleErrors: grammarResult.styleErrors,
            overallScore: grammarResult.overallScore,
            mistakes: grammarResult.mistakes,
            correctedText: grammarResult.correctedText,
          });

          await storage.updateDocument(doc.id, { status: "completed" });
        } catch (error) {
          console.error("Grammar check error:", error);
          await storage.updateDocument(doc.id, { status: "failed" });
        }
      })();
    } catch (error) {
      console.error("Grammar check upload error:", error);
      res.status(500).json({ error: "Failed to upload file for grammar check" });
    }
  });

  app.get("/api/grammar-check/:documentId", authMiddleware, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.documentId);
      if (!doc || doc.userId !== req.userId) {
        return res.status(404).json({ error: "Document not found" });
      }

      const grammarResult = await storage.getGrammarResultByDocument(doc.id);
      if (!grammarResult) {
        return res.status(404).json({ error: "No grammar check result found" });
      }

      res.json({
        document: doc,
        grammarResult,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch grammar check result" });
    }
  });

  app.get("/api/grammar-check/:documentId/download-report", authMiddleware, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.documentId);
      if (!doc || doc.userId !== req.userId) {
        return res.status(404).json({ error: "Document not found" });
      }

      const grammarResult = await storage.getGrammarResultByDocument(doc.id);
      if (!grammarResult) {
        return res.status(404).json({ error: "No grammar check result found" });
      }

      const baseName = doc.fileName.replace(/\.[^/.]+$/, "");
      const reportFileName = `${baseName}_grammar_report.pdf`;

      const pdfBuffer = await generateGrammarCheckPdf(doc, grammarResult);
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${reportFileName}"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Failed to generate grammar PDF report:", error);
      res.status(500).json({ error: "Failed to generate grammar report" });
    }
  });

  app.post("/api/convert-file", authMiddleware, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const conversionType = req.body.conversionType as ConversionType;
      const validTypes = ["word-to-pdf", "pdf-to-word", "txt-to-pdf", "pdf-to-txt"];
      
      if (!validTypes.includes(conversionType)) {
        return res.status(400).json({ error: "Invalid conversion type" });
      }

      const result = await convertFile(req.file.buffer, conversionType, req.file.originalname);
      
      res.setHeader("Content-Type", result.mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${result.fileName}"`);
      res.send(result.buffer);
    } catch (error) {
      console.error("File conversion failed:", error);
      res.status(500).json({ error: "File conversion failed" });
    }
  });

  app.get("/api/documents/:id/download-ai-report", authMiddleware, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id);
      if (!doc || doc.userId !== req.userId) {
        return res.status(404).json({ error: "Document not found" });
      }

      const scanResult = await storage.getScanResultByDocument(doc.id);
      if (!scanResult) {
        return res.status(404).json({ error: "No scan results available" });
      }

      const sourceMatches = await storage.getSourceMatchesByScanResult(scanResult.id);
      const aiMatches = sourceMatches.filter(m => m.matchType === "ai");

      let reportContent = `AI CONTENT DETECTION REPORT\n`;
      reportContent += `${"=".repeat(50)}\n\n`;
      reportContent += `Document: ${doc.fileName}\n`;
      reportContent += `Scan Date: ${new Date(scanResult.createdAt).toLocaleString()}\n`;
      reportContent += `AI Content Score: ${(scanResult.aiScore || 0).toFixed(1)}%\n\n`;
      
      reportContent += `SUMMARY\n`;
      reportContent += `${"-".repeat(30)}\n`;
      if ((scanResult.aiScore || 0) < 20) {
        reportContent += `This document appears to be primarily human-written content.\n\n`;
      } else if ((scanResult.aiScore || 0) < 50) {
        reportContent += `This document contains some patterns consistent with AI-generated content.\n\n`;
      } else {
        reportContent += `This document shows significant characteristics of AI-generated content.\n\n`;
      }

      if (aiMatches.length > 0) {
        reportContent += `DETECTED AI-GENERATED SECTIONS (${aiMatches.length})\n`;
        reportContent += `${"-".repeat(30)}\n\n`;
        aiMatches.forEach((match, i) => {
          reportContent += `[${i + 1}] Confidence: ${match.similarityScore.toFixed(0)}%\n`;
          reportContent += `Text: "${match.matchedText}"\n`;
          if (match.sourceTitle) {
            reportContent += `Reason: ${match.sourceTitle}\n`;
          }
          reportContent += `\n`;
        });
      } else {
        reportContent += `No specific AI-generated sections detected.\n\n`;
      }

      reportContent += `\n${"=".repeat(50)}\n`;
      reportContent += `Generated by PlagiarismGuard\n`;

      const baseName = doc.fileName.replace(/\.[^/.]+$/, "");
      const reportFileName = `${baseName}_AI_Report.txt`;

      res.json({
        fileName: reportFileName,
        content: reportContent,
      });
    } catch (error) {
      console.error("AI report download error:", error);
      res.status(500).json({ error: "Failed to generate AI report" });
    }
  });

  app.get("/api/documents/:id/download-plagiarism-report", authMiddleware, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id);
      if (!doc || doc.userId !== req.userId) {
        return res.status(404).json({ error: "Document not found" });
      }

      const scanResult = await storage.getScanResultByDocument(doc.id);
      if (!scanResult) {
        return res.status(404).json({ error: "No scan results available" });
      }

      const sourceMatches = await storage.getSourceMatchesByScanResult(scanResult.id);
      const webMatches = sourceMatches.filter(m => m.matchType !== "ai");

      let reportContent = `PLAGIARISM DETECTION REPORT\n`;
      reportContent += `${"=".repeat(50)}\n\n`;
      reportContent += `Document: ${doc.fileName}\n`;
      reportContent += `Scan Date: ${new Date(scanResult.createdAt).toLocaleString()}\n`;
      reportContent += `Word Count: ${doc.wordCount || "N/A"}\n`;
      reportContent += `Overall Similarity: ${scanResult.overallScore.toFixed(1)}%\n`;
      reportContent += `Web Similarity Score: ${(scanResult.webScore || 0).toFixed(1)}%\n`;
      reportContent += `Verdict: ${scanResult.verdict.toUpperCase()}\n\n`;

      reportContent += `SUMMARY\n`;
      reportContent += `${"-".repeat(30)}\n`;
      if (scanResult.overallScore < 15) {
        reportContent += `This document appears to be original content with minimal similarity to other sources.\n\n`;
      } else if (scanResult.overallScore < 30) {
        reportContent += `This document shows low similarity to other sources. Minor similarities are likely acceptable.\n\n`;
      } else if (scanResult.overallScore < 50) {
        reportContent += `This document shows moderate similarity to other sources. Review recommended.\n\n`;
      } else {
        reportContent += `This document shows significant similarity to other sources. Careful review required.\n\n`;
      }

      if (webMatches.length > 0) {
        reportContent += `MATCHED SOURCES (${webMatches.length})\n`;
        reportContent += `${"-".repeat(30)}\n\n`;
        webMatches.forEach((match, i) => {
          reportContent += `[${i + 1}] Similarity: ${match.similarityScore.toFixed(0)}%\n`;
          if (match.sourceTitle) {
            reportContent += `Source: ${match.sourceTitle}\n`;
          }
          if (match.sourceUrl) {
            reportContent += `URL: ${match.sourceUrl}\n`;
          }
          reportContent += `Matched Text: "${match.matchedText}"\n`;
          reportContent += `\n`;
        });
      } else {
        reportContent += `No matching sources found. The document appears to be original.\n\n`;
      }

      reportContent += `\n${"=".repeat(50)}\n`;
      reportContent += `Generated by PlagiarismGuard\n`;

      const baseName = doc.fileName.replace(/\.[^/.]+$/, "");
      const reportFileName = `${baseName}_Plagiarism_Report.txt`;

      res.json({
        fileName: reportFileName,
        content: reportContent,
      });
    } catch (error) {
      console.error("Plagiarism report download error:", error);
      res.status(500).json({ error: "Failed to generate plagiarism report" });
    }
  });

  // Admin Routes
  app.get("/api/admin/stats", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const stats = await storage.getSystemStats();
      res.json(stats);
    } catch (error) {
      console.error("Admin stats error:", error);
      res.status(500).json({ error: "Failed to fetch admin stats" });
    }
  });

  app.get("/api/admin/users", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const usersWithStats = await Promise.all(
        allUsers.map(async (user) => {
          const stats = await storage.getUserStats(user.id);
          return { ...user, stats };
        })
      );
      res.json(usersWithStats);
    } catch (error) {
      console.error("Admin users error:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.delete("/api/admin/users/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const userToDelete = await storage.getUser(req.params.id);
      if (!userToDelete) {
        return res.status(404).json({ error: "User not found" });
      }

      if (userToDelete.isSuperAdmin) {
        return res.status(403).json({ error: "Cannot delete super admin" });
      }

      if (userToDelete.isAdmin && !req.user?.isSuperAdmin) {
        return res.status(403).json({ error: "Only super admin can delete other admins" });
      }

      await storage.deleteUser(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  app.get("/api/admin/admins", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const admins = await storage.getAllAdmins();
      res.json(admins);
    } catch (error) {
      console.error("Admin admins error:", error);
      res.status(500).json({ error: "Failed to fetch admins" });
    }
  });

  app.post("/api/admin/promote/:id", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const updated = await storage.setAdminStatus(req.params.id, true);
      res.json({ success: true, user: updated });
    } catch (error) {
      console.error("Promote admin error:", error);
      res.status(500).json({ error: "Failed to promote user" });
    }
  });

  app.post("/api/admin/demote/:id", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
      const adminToDemote = await storage.getUser(req.params.id);
      if (!adminToDemote) {
        return res.status(404).json({ error: "User not found" });
      }

      if (adminToDemote.isSuperAdmin) {
        return res.status(403).json({ error: "Cannot demote super admin" });
      }

      const updated = await storage.setAdminStatus(req.params.id, false);
      res.json({ success: true, user: updated });
    } catch (error) {
      console.error("Demote admin error:", error);
      res.status(500).json({ error: "Failed to demote admin" });
    }
  });

  app.post("/api/admin/admins", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const updated = await storage.setAdminStatus(userId, true);
      res.json({ success: true, user: updated });
    } catch (error) {
      console.error("Create admin error:", error);
      res.status(500).json({ error: "Failed to create admin" });
    }
  });

  app.delete("/api/admin/admins/:id", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
      const adminToRemove = await storage.getUser(req.params.id);
      if (!adminToRemove) {
        return res.status(404).json({ error: "User not found" });
      }

      if (adminToRemove.isSuperAdmin) {
        return res.status(403).json({ error: "Cannot remove super admin privileges" });
      }

      const updated = await storage.setAdminStatus(req.params.id, false);
      res.json({ success: true, user: updated });
    } catch (error) {
      console.error("Remove admin error:", error);
      res.status(500).json({ error: "Failed to remove admin" });
    }
  });

  app.get("/api/admin/documents", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const allDocs = await storage.getAllDocuments();
      const docsWithUsers = await Promise.all(
        allDocs.map(async (doc) => {
          const user = await storage.getUser(doc.userId);
          return { ...doc, userEmail: user?.email, userName: user?.fullName };
        })
      );
      res.json(docsWithUsers);
    } catch (error) {
      console.error("Admin documents error:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  // Subscription Plan Management Routes (Super Admin only)
  app.get("/api/admin/plans", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const plans = await storage.getAllSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      console.error("Get plans error:", error);
      res.status(500).json({ error: "Failed to fetch subscription plans" });
    }
  });

  app.post("/api/admin/plans", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
      const { name, description, stripePriceId, priceAmount, currency, interval, intervalCount, monthlyScans, 
              hasAiDetection, hasPlagiarismCheck, hasGrammarCheck, hasApiAccess, hasTeamManagement, 
              hasPrioritySupport, displayOrder } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Plan name is required" });
      }

      const existing = await storage.getSubscriptionPlanByName(name);
      if (existing) {
        return res.status(400).json({ error: "Plan with this name already exists" });
      }

      const plan = await storage.createSubscriptionPlan({
        name,
        description: description || null,
        stripePriceId: stripePriceId || null,
        priceAmount: priceAmount || 0,
        currency: currency || "aed",
        interval: interval || "month",
        intervalCount: intervalCount || 1,
        monthlyScans: monthlyScans || 5,
        hasAiDetection: hasAiDetection ?? true,
        hasPlagiarismCheck: hasPlagiarismCheck ?? true,
        hasGrammarCheck: hasGrammarCheck ?? false,
        hasApiAccess: hasApiAccess ?? false,
        hasTeamManagement: hasTeamManagement ?? false,
        hasPrioritySupport: hasPrioritySupport ?? false,
        displayOrder: displayOrder || 0,
        isActive: true,
      });

      res.json({ success: true, plan });
    } catch (error) {
      console.error("Create plan error:", error);
      res.status(500).json({ error: "Failed to create subscription plan" });
    }
  });

  app.patch("/api/admin/plans/:id", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
      const plan = await storage.getSubscriptionPlan(req.params.id);
      if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
      }

      const updated = await storage.updateSubscriptionPlan(req.params.id, req.body);
      res.json({ success: true, plan: updated });
    } catch (error) {
      console.error("Update plan error:", error);
      res.status(500).json({ error: "Failed to update subscription plan" });
    }
  });

  app.delete("/api/admin/plans/:id", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
      const plan = await storage.getSubscriptionPlan(req.params.id);
      if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
      }

      await storage.deleteSubscriptionPlan(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete plan error:", error);
      res.status(500).json({ error: "Failed to delete subscription plan" });
    }
  });

  // Manually assign subscription to user (Super Admin only)
  app.post("/api/admin/users/:id/subscription", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const { planName, status } = req.body;
      if (!planName) {
        return res.status(400).json({ error: "Plan name is required" });
      }

      const updated = await storage.assignUserSubscription(
        req.params.id, 
        planName, 
        status || "active"
      );

      res.json({ success: true, user: updated });
    } catch (error) {
      console.error("Assign subscription error:", error);
      res.status(500).json({ error: "Failed to assign subscription" });
    }
  });

  app.delete("/api/admin/users/:id/subscription", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const updated = await storage.assignUserSubscription(req.params.id, "", "canceled");
      res.json({ success: true, user: updated });
    } catch (error) {
      console.error("Remove subscription error:", error);
      res.status(500).json({ error: "Failed to remove subscription" });
    }
  });

  // Seed super admin on startup
  await storage.ensureSuperAdmin(SUPER_ADMIN_EMAIL);
  console.log(`Super admin ensured: ${SUPER_ADMIN_EMAIL}`);

  // Public subscription plans endpoint
  app.get("/api/subscription/plans", async (req, res) => {
    try {
      const allPlans = await storage.getAllSubscriptionPlans();
      const activePlans = allPlans.filter(p => p.isActive);
      res.json(activePlans);
    } catch (error) {
      console.error("Get plans error:", error);
      res.status(500).json({ error: "Failed to fetch subscription plans" });
    }
  });

  // Stripe Routes
  app.get("/api/stripe/config", async (req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      console.error("Stripe config error:", error);
      res.status(500).json({ error: "Failed to get Stripe config" });
    }
  });

  app.get("/api/subscription/products", async (req, res) => {
    try {
      const rows = await stripeService.listProductsWithPrices();
      
      const productsMap = new Map();
      for (const row of rows as any[]) {
        if (!productsMap.has(row.product_id)) {
          productsMap.set(row.product_id, {
            id: row.product_id,
            name: row.product_name,
            description: row.product_description,
            active: row.product_active,
            metadata: row.product_metadata,
            prices: []
          });
        }
        if (row.price_id) {
          productsMap.get(row.product_id).prices.push({
            id: row.price_id,
            unit_amount: row.unit_amount,
            currency: row.currency,
            recurring: row.recurring,
            active: row.price_active,
            metadata: row.price_metadata,
          });
        }
      }
      
      res.json({ products: Array.from(productsMap.values()) });
    } catch (error) {
      console.error("Products error:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/subscription/status", authMiddleware, async (req, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user?.stripeSubscriptionId) {
        return res.json({ 
          hasSubscription: false,
          subscription: null,
          plan: null,
          status: null
        });
      }

      const subscription = await stripeService.getSubscription(user.stripeSubscriptionId);
      res.json({ 
        hasSubscription: true,
        subscription,
        plan: user.subscriptionPlan,
        status: user.subscriptionStatus
      });
    } catch (error) {
      console.error("Subscription status error:", error);
      res.status(500).json({ error: "Failed to fetch subscription status" });
    }
  });

  app.post("/api/subscription/checkout", authMiddleware, async (req, res) => {
    try {
      const { planId, priceId } = req.body;
      
      let stripePriceId = priceId;
      let planName: string | null = null;
      
      if (planId) {
        const plan = await storage.getSubscriptionPlan(planId);
        if (!plan) {
          return res.status(404).json({ error: "Plan not found" });
        }
        if (!plan.isActive) {
          return res.status(400).json({ error: "This plan is no longer available" });
        }
        if (!plan.stripePriceId) {
          return res.status(400).json({ error: "This plan is not configured for checkout. Please contact support." });
        }
        stripePriceId = plan.stripePriceId;
        planName = plan.name;
      }
      
      if (!stripePriceId) {
        return res.status(400).json({ error: "Plan ID or Price ID is required" });
      }

      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.stripeSubscriptionId && user.subscriptionStatus === 'active') {
        return res.status(400).json({ error: "You already have an active subscription. Use the billing portal to manage it." });
      }

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        try {
          const customer = await stripeService.createCustomer(user.email, user.id, user.fullName || undefined);
          await storage.updateUserStripeInfo(user.id, { stripeCustomerId: customer.id });
          customerId = customer.id;
        } catch (customerError: any) {
          if (customerError?.code === 'resource_already_exists') {
            console.log('Customer already exists in Stripe, finding existing customer');
            const stripe = await getUncachableStripeClient();
            const customers = await stripe.customers.list({ email: user.email, limit: 1 });
            if (customers.data.length > 0) {
              customerId = customers.data[0].id;
              await storage.updateUserStripeInfo(user.id, { stripeCustomerId: customerId });
            } else {
              throw new Error('Could not find or create customer');
            }
          } else {
            throw customerError;
          }
        }
      }

      const baseUrl = `https://${req.get('host')}`;
      const session = await stripeService.createCheckoutSession(
        customerId,
        stripePriceId,
        `${baseUrl}/subscription?success=true`,
        `${baseUrl}/subscription?canceled=true`,
        user.id
      );

      res.json({ url: session.url });
    } catch (error) {
      console.error("Checkout error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.post("/api/subscription/portal", authMiddleware, async (req, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user?.stripeCustomerId) {
        return res.status(400).json({ error: "No subscription found" });
      }

      const baseUrl = `https://${req.get('host')}`;
      const session = await stripeService.createCustomerPortalSession(
        user.stripeCustomerId,
        `${baseUrl}/subscription`
      );

      res.json({ url: session.url });
    } catch (error) {
      console.error("Portal error:", error);
      res.status(500).json({ error: "Failed to create portal session" });
    }
  });

  app.get("/api/ppt/templates", authMiddleware, async (req, res) => {
    try {
      const { presentationTemplates } = await import("./pptTemplates");
      res.json({ templates: presentationTemplates });
    } catch (error) {
      console.error("Failed to get PPT templates:", error);
      res.status(500).json({ error: "Failed to get templates" });
    }
  });

  app.get("/api/ppt/slide-templates", authMiddleware, async (req, res) => {
    try {
      const { slideTemplates } = await import("./pptTemplates");
      res.json({ slideTemplates });
    } catch (error) {
      console.error("Failed to get slide templates:", error);
      res.status(500).json({ error: "Failed to get slide templates" });
    }
  });

  app.post("/api/ppt/generate", authMiddleware, async (req, res) => {
    try {
      const { templateId, slides, title, generateFootnotes } = req.body;
      
      if (!templateId || !slides || !Array.isArray(slides)) {
        return res.status(400).json({ error: "Template ID and slides are required" });
      }

      const { generatePresentation } = await import("./pptGenerator");
      const buffer = await generatePresentation(
        { templateId, slides, title },
        generateFootnotes !== false
      );

      const fileName = `${title || "presentation"}_${Date.now()}.pptx`;
      
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      res.send(buffer);
    } catch (error) {
      console.error("PPT generation error:", error);
      res.status(500).json({ error: "Failed to generate presentation" });
    }
  });

  app.post("/api/ppt/generate-footnote", authMiddleware, async (req, res) => {
    try {
      const { slideContent, slideTemplateId } = req.body;
      
      if (!slideContent || !slideTemplateId) {
        return res.status(400).json({ error: "Slide content and template ID are required" });
      }

      const { slideTemplates } = await import("./pptTemplates");
      const slideTemplate = slideTemplates.find(t => t.id === slideTemplateId);
      
      if (!slideTemplate) {
        return res.status(400).json({ error: "Invalid slide template" });
      }

      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI();

      const contentText = Object.entries(slideContent)
        .filter(([_, value]) => value && typeof value === 'string' && value.trim())
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n");

      if (!contentText.trim()) {
        return res.json({ footnote: "" });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a presentation assistant. Generate a brief, helpful speaker note/footnote for the given slide content. Keep it to 1-2 sentences that would help the presenter remember key talking points. Be concise and professional."
          },
          {
            role: "user",
            content: `Slide type: ${slideTemplate.name}\n\nSlide content:\n${contentText}\n\nGenerate a brief speaker note for this slide:`
          }
        ],
        max_tokens: 100,
        temperature: 0.7,
      });

      res.json({ footnote: response.choices[0]?.message?.content?.trim() || "" });
    } catch (error) {
      console.error("Footnote generation error:", error);
      res.status(500).json({ error: "Failed to generate footnote" });
    }
  });

  return httpServer;
}
