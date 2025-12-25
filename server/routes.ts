import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { sendOtpEmail, sendWelcomeEmail } from "./email";
import { extractText, countWords } from "./textExtractor";
import { scanDocument } from "./plagiarismScanner";
import { emailSchema, otpVerifySchema, registrationSchema } from "@shared/schema";
import multer from "multer";
import { randomInt } from "crypto";
import { uploadFile, getFileBuffer, getSignedDownloadUrl } from "./s3";
import { checkGrammar } from "./grammarChecker";
import { stripeService } from "./stripeService";
import { getStripePublishableKey, getUncachableStripeClient } from "./stripeClient";

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
      res.json({ documents });
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

  // Seed super admin on startup
  await storage.ensureSuperAdmin(SUPER_ADMIN_EMAIL);
  console.log(`Super admin ensured: ${SUPER_ADMIN_EMAIL}`);

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
      const { priceId } = req.body;
      if (!priceId) {
        return res.status(400).json({ error: "Price ID is required" });
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
        priceId,
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

  return httpServer;
}
