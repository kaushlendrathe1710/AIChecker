import { 
  type User, type InsertUser, 
  type Otp, type InsertOtp,
  type Session, type InsertSession,
  type Document, type InsertDocument,
  type ScanResult, type InsertScanResult,
  type SourceMatch, type InsertSourceMatch,
  type GrammarResult, type InsertGrammarResult,
  type AiCheckResult, type InsertAiCheckResult,
  type PlagiarismCheckResult, type InsertPlagiarismCheckResult,
  type PlagiarismMatch, type InsertPlagiarismMatch,
  type SubscriptionPlan, type InsertSubscriptionPlan,
  users, otpCodes, sessions, documents, scanResults, sourceMatches, grammarResults,
  aiCheckResults, plagiarismCheckResults, plagiarismMatches, subscriptionPlans
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gt, count, ne } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser> & { isVerified?: boolean }): Promise<User | undefined>;
  
  createOtp(otp: InsertOtp): Promise<Otp>;
  getValidOtp(email: string, code: string): Promise<Otp | undefined>;
  markOtpUsed(id: string): Promise<void>;
  invalidateOtpsForEmail(email: string): Promise<void>;
  
  createSession(session: InsertSession): Promise<Session>;
  getSession(id: string): Promise<Session | undefined>;
  deleteSession(id: string): Promise<void>;
  
  createDocument(doc: InsertDocument): Promise<Document>;
  getDocument(id: string): Promise<Document | undefined>;
  getDocumentsByUser(userId: string): Promise<Document[]>;
  updateDocument(id: string, data: Partial<Document>): Promise<Document | undefined>;
  
  createScanResult(result: InsertScanResult): Promise<ScanResult>;
  getScanResult(id: string): Promise<ScanResult | undefined>;
  getScanResultByDocument(documentId: string): Promise<ScanResult | undefined>;
  
  createSourceMatch(match: InsertSourceMatch): Promise<SourceMatch>;
  getSourceMatchesByScanResult(scanResultId: string): Promise<SourceMatch[]>;
  
  createGrammarResult(result: InsertGrammarResult): Promise<GrammarResult>;
  getGrammarResultByDocument(documentId: string): Promise<GrammarResult | undefined>;
  
  createAiCheckResult(result: InsertAiCheckResult): Promise<AiCheckResult>;
  getAiCheckResultByDocument(documentId: string): Promise<AiCheckResult | undefined>;
  updateAiCheckResult(id: string, data: Partial<AiCheckResult>): Promise<AiCheckResult | undefined>;
  
  createPlagiarismCheckResult(result: InsertPlagiarismCheckResult): Promise<PlagiarismCheckResult>;
  getPlagiarismCheckResultByDocument(documentId: string): Promise<PlagiarismCheckResult | undefined>;
  updatePlagiarismCheckResult(id: string, data: Partial<PlagiarismCheckResult>): Promise<PlagiarismCheckResult | undefined>;
  
  createPlagiarismMatch(match: InsertPlagiarismMatch): Promise<PlagiarismMatch>;
  getPlagiarismMatchesByResult(plagiarismResultId: string): Promise<PlagiarismMatch[]>;
  
  getUserStats(userId: string): Promise<{ totalScans: number; avgScore: number; lastScan: Date | null }>;
  
  getAllUsers(): Promise<User[]>;
  getAllAdmins(): Promise<User[]>;
  getAllDocuments(): Promise<Document[]>;
  getActiveSessionsCount(): Promise<number>;
  setAdminStatus(userId: string, isAdmin: boolean): Promise<User | undefined>;
  deleteUser(userId: string): Promise<void>;
  getSystemStats(): Promise<{
    totalUsers: number;
    totalDocuments: number;
    totalScans: number;
    totalGrammarChecks: number;
    activeSessions: number;
  }>;
  ensureSuperAdmin(email: string): Promise<User>;
  updateUserStripeInfo(userId: string, data: { 
    stripeCustomerId?: string; 
    stripeSubscriptionId?: string;
    subscriptionStatus?: string;
    subscriptionPlan?: string;
  }): Promise<User | undefined>;
  
  getAllSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined>;
  getSubscriptionPlanByName(name: string): Promise<SubscriptionPlan | undefined>;
  createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan>;
  updateSubscriptionPlan(id: string, data: Partial<InsertSubscriptionPlan>): Promise<SubscriptionPlan | undefined>;
  deleteSubscriptionPlan(id: string): Promise<void>;
  assignUserSubscription(userId: string, planName: string, status: string): Promise<User | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values({
      ...user,
      email: user.email.toLowerCase(),
    }).returning();
    return newUser;
  }

  async updateUser(id: string, data: Partial<InsertUser> & { isVerified?: boolean }): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  async createOtp(otp: InsertOtp): Promise<Otp> {
    const [newOtp] = await db.insert(otpCodes).values({
      ...otp,
      email: otp.email.toLowerCase(),
    }).returning();
    return newOtp;
  }

  async getValidOtp(email: string, code: string): Promise<Otp | undefined> {
    const [otp] = await db.select().from(otpCodes).where(
      and(
        eq(otpCodes.email, email.toLowerCase()),
        eq(otpCodes.code, code),
        eq(otpCodes.used, false),
        gt(otpCodes.expiresAt, new Date())
      )
    );
    return otp;
  }

  async markOtpUsed(id: string): Promise<void> {
    await db.update(otpCodes).set({ used: true }).where(eq(otpCodes.id, id));
  }

  async invalidateOtpsForEmail(email: string): Promise<void> {
    await db.update(otpCodes).set({ used: true }).where(eq(otpCodes.email, email.toLowerCase()));
  }

  async createSession(session: InsertSession): Promise<Session> {
    const [newSession] = await db.insert(sessions).values(session).returning();
    return newSession;
  }

  async getSession(id: string): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(
      and(eq(sessions.id, id), gt(sessions.expiresAt, new Date()))
    );
    return session;
  }

  async deleteSession(id: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.id, id));
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const [newDoc] = await db.insert(documents).values(doc).returning();
    return newDoc;
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc;
  }

  async getDocumentsByUser(userId: string): Promise<Document[]> {
    return db.select().from(documents).where(eq(documents.userId, userId)).orderBy(desc(documents.createdAt));
  }

  async updateDocument(id: string, data: Partial<Document>): Promise<Document | undefined> {
    const [updated] = await db.update(documents).set(data).where(eq(documents.id, id)).returning();
    return updated;
  }

  async createScanResult(result: InsertScanResult): Promise<ScanResult> {
    const [newResult] = await db.insert(scanResults).values(result).returning();
    return newResult;
  }

  async getScanResult(id: string): Promise<ScanResult | undefined> {
    const [result] = await db.select().from(scanResults).where(eq(scanResults.id, id));
    return result;
  }

  async getScanResultByDocument(documentId: string): Promise<ScanResult | undefined> {
    const [result] = await db.select().from(scanResults).where(eq(scanResults.documentId, documentId));
    return result;
  }

  async createSourceMatch(match: InsertSourceMatch): Promise<SourceMatch> {
    const [newMatch] = await db.insert(sourceMatches).values(match).returning();
    return newMatch;
  }

  async getSourceMatchesByScanResult(scanResultId: string): Promise<SourceMatch[]> {
    return db.select().from(sourceMatches).where(eq(sourceMatches.scanResultId, scanResultId));
  }

  async createGrammarResult(result: InsertGrammarResult): Promise<GrammarResult> {
    const [newResult] = await db.insert(grammarResults).values(result).returning();
    return newResult;
  }

  async getGrammarResultByDocument(documentId: string): Promise<GrammarResult | undefined> {
    const [result] = await db.select().from(grammarResults)
      .where(eq(grammarResults.documentId, documentId))
      .orderBy(desc(grammarResults.createdAt));
    return result;
  }

  async createAiCheckResult(result: InsertAiCheckResult): Promise<AiCheckResult> {
    const [newResult] = await db.insert(aiCheckResults).values(result).returning();
    return newResult;
  }

  async getAiCheckResultByDocument(documentId: string): Promise<AiCheckResult | undefined> {
    const [result] = await db.select().from(aiCheckResults)
      .where(eq(aiCheckResults.documentId, documentId))
      .orderBy(desc(aiCheckResults.createdAt));
    return result;
  }

  async updateAiCheckResult(id: string, data: Partial<AiCheckResult>): Promise<AiCheckResult | undefined> {
    const [updated] = await db.update(aiCheckResults).set(data).where(eq(aiCheckResults.id, id)).returning();
    return updated;
  }

  async createPlagiarismCheckResult(result: InsertPlagiarismCheckResult): Promise<PlagiarismCheckResult> {
    const [newResult] = await db.insert(plagiarismCheckResults).values(result).returning();
    return newResult;
  }

  async getPlagiarismCheckResultByDocument(documentId: string): Promise<PlagiarismCheckResult | undefined> {
    const [result] = await db.select().from(plagiarismCheckResults)
      .where(eq(plagiarismCheckResults.documentId, documentId))
      .orderBy(desc(plagiarismCheckResults.createdAt));
    return result;
  }

  async updatePlagiarismCheckResult(id: string, data: Partial<PlagiarismCheckResult>): Promise<PlagiarismCheckResult | undefined> {
    const [updated] = await db.update(plagiarismCheckResults).set(data).where(eq(plagiarismCheckResults.id, id)).returning();
    return updated;
  }

  async createPlagiarismMatch(match: InsertPlagiarismMatch): Promise<PlagiarismMatch> {
    const [newMatch] = await db.insert(plagiarismMatches).values(match).returning();
    return newMatch;
  }

  async getPlagiarismMatchesByResult(plagiarismResultId: string): Promise<PlagiarismMatch[]> {
    return db.select().from(plagiarismMatches).where(eq(plagiarismMatches.plagiarismResultId, plagiarismResultId));
  }

  async getUserStats(userId: string): Promise<{ totalScans: number; avgScore: number; lastScan: Date | null }> {
    const docs = await db.select().from(documents).where(eq(documents.userId, userId));
    const completedDocs = docs.filter(d => d.status === "completed");
    
    let totalScore = 0;
    let scoreCount = 0;
    let lastScan: Date | null = null;
    
    for (const doc of completedDocs) {
      const result = await this.getScanResultByDocument(doc.id);
      if (result) {
        totalScore += result.overallScore;
        scoreCount++;
        if (!lastScan || doc.createdAt > lastScan) {
          lastScan = doc.createdAt;
        }
      }
    }
    
    return {
      totalScans: completedDocs.length,
      avgScore: scoreCount > 0 ? totalScore / scoreCount : 0,
      lastScan,
    };
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getAllAdmins(): Promise<User[]> {
    return db.select().from(users).where(eq(users.isAdmin, true)).orderBy(desc(users.createdAt));
  }

  async getAllDocuments(): Promise<Document[]> {
    return db.select().from(documents).orderBy(desc(documents.createdAt));
  }

  async getActiveSessionsCount(): Promise<number> {
    const result = await db.select({ count: count() }).from(sessions).where(gt(sessions.expiresAt, new Date()));
    return result[0]?.count ?? 0;
  }

  async setAdminStatus(userId: string, isAdmin: boolean): Promise<User | undefined> {
    const [updated] = await db.update(users).set({ isAdmin }).where(eq(users.id, userId)).returning();
    return updated;
  }

  async deleteUser(userId: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.userId, userId));
    const userDocs = await db.select().from(documents).where(eq(documents.userId, userId));
    for (const doc of userDocs) {
      await db.delete(grammarResults).where(eq(grammarResults.documentId, doc.id));
      const scanResult = await this.getScanResultByDocument(doc.id);
      if (scanResult) {
        await db.delete(sourceMatches).where(eq(sourceMatches.scanResultId, scanResult.id));
        await db.delete(scanResults).where(eq(scanResults.id, scanResult.id));
      }
    }
    await db.delete(documents).where(eq(documents.userId, userId));
    await db.delete(otpCodes).where(eq(otpCodes.email, (await this.getUser(userId))?.email ?? ""));
    await db.delete(users).where(eq(users.id, userId));
  }

  async getSystemStats(): Promise<{
    totalUsers: number;
    totalDocuments: number;
    totalScans: number;
    totalGrammarChecks: number;
    activeSessions: number;
  }> {
    const [userCount] = await db.select({ count: count() }).from(users);
    const [docCount] = await db.select({ count: count() }).from(documents);
    const [scanCount] = await db.select({ count: count() }).from(scanResults);
    const [grammarCount] = await db.select({ count: count() }).from(grammarResults);
    const activeSessions = await this.getActiveSessionsCount();

    return {
      totalUsers: userCount?.count ?? 0,
      totalDocuments: docCount?.count ?? 0,
      totalScans: scanCount?.count ?? 0,
      totalGrammarChecks: grammarCount?.count ?? 0,
      activeSessions,
    };
  }

  async ensureSuperAdmin(email: string): Promise<User> {
    const normalizedEmail = email.toLowerCase();
    let user = await this.getUserByEmail(normalizedEmail);
    
    if (!user) {
      const [newUser] = await db.insert(users).values({
        email: normalizedEmail,
        fullName: "Super Admin",
        role: "admin",
        isVerified: true,
        isAdmin: true,
        isSuperAdmin: true,
      }).returning();
      user = newUser;
    } else if (!user.isSuperAdmin) {
      const [updated] = await db.update(users).set({
        isAdmin: true,
        isSuperAdmin: true,
        role: "admin",
      }).where(eq(users.id, user.id)).returning();
      user = updated;
    }
    
    return user;
  }

  async updateUserStripeInfo(userId: string, data: { 
    stripeCustomerId?: string; 
    stripeSubscriptionId?: string;
    subscriptionStatus?: string;
    subscriptionPlan?: string;
  }): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, userId)).returning();
    return updated;
  }

  async getAllSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return db.select().from(subscriptionPlans).orderBy(subscriptionPlans.displayOrder);
  }

  async getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id));
    return plan;
  }

  async getSubscriptionPlanByName(name: string): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.name, name));
    return plan;
  }

  async createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    const [newPlan] = await db.insert(subscriptionPlans).values(plan).returning();
    return newPlan;
  }

  async updateSubscriptionPlan(id: string, data: Partial<InsertSubscriptionPlan>): Promise<SubscriptionPlan | undefined> {
    const [updated] = await db.update(subscriptionPlans).set(data).where(eq(subscriptionPlans.id, id)).returning();
    return updated;
  }

  async deleteSubscriptionPlan(id: string): Promise<void> {
    await db.delete(subscriptionPlans).where(eq(subscriptionPlans.id, id));
  }

  async assignUserSubscription(userId: string, planName: string, status: string): Promise<User | undefined> {
    const [updated] = await db.update(users).set({
      subscriptionPlan: planName,
      subscriptionStatus: status,
    }).where(eq(users.id, userId)).returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
