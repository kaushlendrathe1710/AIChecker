import { 
  type User, type InsertUser, 
  type Otp, type InsertOtp,
  type Session, type InsertSession,
  type Document, type InsertDocument,
  type ScanResult, type InsertScanResult,
  type SourceMatch, type InsertSourceMatch,
  type GrammarResult, type InsertGrammarResult,
  users, otpCodes, sessions, documents, scanResults, sourceMatches, grammarResults
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gt } from "drizzle-orm";

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
  
  getUserStats(userId: string): Promise<{ totalScans: number; avgScore: number; lastScan: Date | null }>;
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
}

export const storage = new DatabaseStorage();
