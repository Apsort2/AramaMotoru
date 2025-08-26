import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const searchSessions = pgTable("search_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull(),
  searchType: text("search_type").notNull(), // 'single' | 'bulk'
  status: text("status").notNull(), // 'pending' | 'in_progress' | 'completed' | 'failed'
  totalItems: integer("total_items").default(0),
  processedItems: integer("processed_items").default(0),
  successfulItems: integer("successful_items").default(0),
  results: jsonb("results").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const searchResults = pgTable("search_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull(),
  isbn: text("isbn").notNull(),
  site: text("site"),
  title: text("title"),
  author: text("author"),
  publisher: text("publisher"),
  price: text("price"),
  url: text("url"),
  status: text("status").notNull(), // 'found' | 'not_found' | 'error'
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertSearchSessionSchema = createInsertSchema(searchSessions).pick({
  sessionId: true,
  searchType: true,
  status: true,
  totalItems: true,
});

export const insertSearchResultSchema = createInsertSchema(searchResults).pick({
  sessionId: true,
  isbn: true,
  site: true,
  title: true,
  author: true,
  publisher: true,
  price: true,
  url: true,
  status: true,
  errorMessage: true,
});

// Single ISBN search schema
export const singleSearchSchema = z.object({
  isbn: z.string().min(10).max(13).regex(/^\d+$/, "ISBN sadece rakamlardan oluşmalıdır"),
});

// Bulk search schema
export const bulkSearchSchema = z.object({
  sessionId: z.string(),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type SearchSession = typeof searchSessions.$inferSelect;
export type SearchResult = typeof searchResults.$inferSelect;
export type InsertSearchSession = z.infer<typeof insertSearchSessionSchema>;
export type InsertSearchResult = z.infer<typeof insertSearchResultSchema>;
export type SingleSearchRequest = z.infer<typeof singleSearchSchema>;
export type BulkSearchRequest = z.infer<typeof bulkSearchSchema>;

// Book data interface
export interface BookData {
  isbn: string;
  title?: string;
  author?: string;
  publisher?: string;
  price?: string;
  url?: string;
  site: string;
}

// Search response interface
export interface SearchResponse {
  success: boolean;
  data?: BookData;
  error?: string;
}
