import { type User, type InsertUser, type SearchSession, type SearchResult, type InsertSearchSession, type InsertSearchResult } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Search session methods
  createSearchSession(session: InsertSearchSession): Promise<SearchSession>;
  getSearchSession(id: string): Promise<SearchSession | undefined>;
  updateSearchSession(id: string, updates: Partial<SearchSession>): Promise<SearchSession | undefined>;
  getSearchSessionBySessionId(sessionId: string): Promise<SearchSession | undefined>;
  
  // Search result methods
  createSearchResult(result: InsertSearchResult): Promise<SearchResult>;
  getSearchResultsBySessionId(sessionId: string): Promise<SearchResult[]>;
  updateSearchResult(id: string, updates: Partial<SearchResult>): Promise<SearchResult | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private searchSessions: Map<string, SearchSession>;
  private searchResults: Map<string, SearchResult>;

  constructor() {
    this.users = new Map();
    this.searchSessions = new Map();
    this.searchResults = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createSearchSession(insertSession: InsertSearchSession): Promise<SearchSession> {
    const id = randomUUID();
    const now = new Date();
    const session: SearchSession = {
      id,
      ...insertSession,
      totalItems: insertSession.totalItems || 0,
      processedItems: 0,
      successfulItems: 0,
      results: [],
      createdAt: now,
      updatedAt: now,
    };
    this.searchSessions.set(id, session);
    return session;
  }

  async getSearchSession(id: string): Promise<SearchSession | undefined> {
    return this.searchSessions.get(id);
  }

  async getSearchSessionBySessionId(sessionId: string): Promise<SearchSession | undefined> {
    return Array.from(this.searchSessions.values()).find(
      (session) => session.sessionId === sessionId,
    );
  }

  async updateSearchSession(id: string, updates: Partial<SearchSession>): Promise<SearchSession | undefined> {
    const session = this.searchSessions.get(id);
    if (!session) return undefined;
    
    const updatedSession: SearchSession = {
      ...session,
      ...updates,
      updatedAt: new Date(),
    };
    this.searchSessions.set(id, updatedSession);
    return updatedSession;
  }

  async createSearchResult(insertResult: InsertSearchResult): Promise<SearchResult> {
    const id = randomUUID();
    const result: SearchResult = {
      id,
      ...insertResult,
      site: insertResult.site || '',
      title: insertResult.title || '',
      author: insertResult.author || '',
      publisher: insertResult.publisher || '',
      price: insertResult.price || '',
      url: insertResult.url || '',
      errorMessage: insertResult.errorMessage || null,
      createdAt: new Date(),
    };
    this.searchResults.set(id, result);
    return result;
  }

  async getSearchResultsBySessionId(sessionId: string): Promise<SearchResult[]> {
    return Array.from(this.searchResults.values()).filter(
      (result) => result.sessionId === sessionId,
    );
  }

  async updateSearchResult(id: string, updates: Partial<SearchResult>): Promise<SearchResult | undefined> {
    const result = this.searchResults.get(id);
    if (!result) return undefined;
    
    const updatedResult: SearchResult = {
      ...result,
      ...updates,
    };
    this.searchResults.set(id, updatedResult);
    return updatedResult;
  }
}

export const storage = new MemStorage();
