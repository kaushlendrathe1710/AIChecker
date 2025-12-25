import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  mobile: text("mobile"),
  role: text("role").notNull().default("student"),
  isVerified: boolean("is_verified").notNull().default(false),
  isAdmin: boolean("is_admin").notNull().default(false),
  isSuperAdmin: boolean("is_super_admin").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const otpCodes = pgTable("otp_codes", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const documents = pgTable("documents", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  s3Key: text("s3_key").notNull(),
  s3Url: text("s3_url").notNull(),
  wordCount: integer("word_count"),
  extractedText: text("extracted_text"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const scanResults = pgTable("scan_results", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id", { length: 36 }).notNull().references(() => documents.id),
  overallScore: real("overall_score").notNull(),
  aiScore: real("ai_score"),
  webScore: real("web_score"),
  verdict: text("verdict").notNull(),
  highlightedText: jsonb("highlighted_text"),
  scanDuration: integer("scan_duration"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sourceMatches = pgTable("source_matches", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  scanResultId: varchar("scan_result_id", { length: 36 }).notNull().references(() => scanResults.id),
  sourceUrl: text("source_url"),
  sourceTitle: text("source_title"),
  matchedText: text("matched_text").notNull(),
  originalText: text("original_text").notNull(),
  similarityScore: real("similarity_score").notNull(),
  startIndex: integer("start_index").notNull(),
  endIndex: integer("end_index").notNull(),
  matchType: text("match_type").notNull(),
});

export const grammarResults = pgTable("grammar_results", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id", { length: 36 }).notNull().references(() => documents.id),
  totalMistakes: integer("total_mistakes").notNull(),
  spellingErrors: integer("spelling_errors").notNull().default(0),
  grammarErrors: integer("grammar_errors").notNull().default(0),
  punctuationErrors: integer("punctuation_errors").notNull().default(0),
  styleErrors: integer("style_errors").notNull().default(0),
  overallScore: real("overall_score").notNull(),
  mistakes: jsonb("mistakes"),
  correctedText: text("corrected_text"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  isVerified: true,
  isAdmin: true,
  isSuperAdmin: true,
});

export const insertOtpSchema = createInsertSchema(otpCodes).omit({
  id: true,
  createdAt: true,
  used: true,
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  extractedText: true,
  wordCount: true,
  status: true,
});

export const insertScanResultSchema = createInsertSchema(scanResults).omit({
  id: true,
  createdAt: true,
});

export const insertSourceMatchSchema = createInsertSchema(sourceMatches).omit({
  id: true,
});

export const insertGrammarResultSchema = createInsertSchema(grammarResults).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertOtp = z.infer<typeof insertOtpSchema>;
export type Otp = typeof otpCodes.$inferSelect;

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

export type InsertScanResult = z.infer<typeof insertScanResultSchema>;
export type ScanResult = typeof scanResults.$inferSelect;

export type InsertSourceMatch = z.infer<typeof insertSourceMatchSchema>;
export type SourceMatch = typeof sourceMatches.$inferSelect;

export type InsertGrammarResult = z.infer<typeof insertGrammarResultSchema>;
export type GrammarResult = typeof grammarResults.$inferSelect;

export const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const otpVerifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6, "OTP must be 6 digits"),
});

export const registrationSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  mobile: z.string().optional(),
  role: z.enum(["student", "teacher", "admin"]).default("student"),
});

export type HighlightedSection = {
  text: string;
  startIndex: number;
  endIndex: number;
  similarityScore: number;
  matchType: "high" | "medium" | "low";
  sourceMatchId?: string;
};

export type ScanResultWithMatches = ScanResult & {
  sourceMatches: SourceMatch[];
  document: Document;
};

export type GrammarMistake = {
  text: string;
  startIndex: number;
  endIndex: number;
  type: "spelling" | "grammar" | "punctuation" | "style";
  suggestion: string;
  explanation: string;
};

export type GrammarResultWithDocument = GrammarResult & {
  document: Document;
};
