import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth } from "./auth";
import { singleSearchSchema, bulkSearchSchema } from "@shared/schema";
import { ISBNSearchService } from "./services/isbn-search";
import { parseExcelFile, type ExcelParseResult } from "./utils/excel-parser";
import { exportToExcel } from "./utils/excel-exporter";
import multer from "multer";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      cb(null, true);
    } else {
      cb(new Error('Sadece .xlsx dosyaları desteklenir'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);
  
  const searchService = new ISBNSearchService();

  // Single ISBN search (protected route)
  app.post("/api/search/single", requireAuth, async (req, res) => {
    try {
      const { isbn } = singleSearchSchema.parse(req.body);
      
      // Clean ISBN
      const cleanedISBN = isbn.replace(/[-\s]/g, '');
      
      // Create search session
      const sessionId = randomUUID();
      const searchSession = await storage.createSearchSession({
        sessionId,
        searchType: 'single',
        status: 'in_progress',
        totalItems: 1,
      });

      // Perform search
      const result = await searchService.searchSingle(cleanedISBN);
      
      // Save result
      await storage.createSearchResult({
        sessionId,
        isbn: cleanedISBN,
        site: result.data?.site || '',
        title: result.data?.title || '',
        author: result.data?.author || '',
        publisher: result.data?.publisher || '',
        price: result.data?.price || '',
        url: result.data?.url || '',
        status: result.success ? 'found' : 'not_found',
        errorMessage: result.error,
      });

      // Update session
      await storage.updateSearchSession(searchSession.id, {
        status: 'completed',
        processedItems: 1,
        successfulItems: result.success ? 1 : 0,
      });

      res.json({
        success: true,
        sessionId,
        result: result.data,
        found: result.success,
      });
    } catch (error) {
      console.error('Single search error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Arama sırasında hata oluştu',
      });
    }
  });

  // Upload Excel file for bulk search (protected route)
  app.post("/api/search/upload", requireAuth, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Dosya yüklenmedi',
        });
      }

      // Parse Excel file
      const parseResult: ExcelParseResult = await parseExcelFile(req.file.buffer);
      
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: parseResult.error,
        });
      }

      // Create search session
      const sessionId = randomUUID();
      const searchSession = await storage.createSearchSession({
        sessionId,
        searchType: 'bulk',
        status: 'pending',
        totalItems: parseResult.isbns!.length,
      });

      res.json({
        success: true,
        sessionId,
        totalItems: parseResult.isbns!.length,
        validISBNs: parseResult.isbns!.length,
        invalidISBNs: parseResult.invalidISBNs?.length || 0,
      });

      // Start bulk search in background
      searchService.searchBulk(sessionId, parseResult.isbns!, storage)
        .catch(error => {
          console.error('Bulk search error:', error);
          storage.updateSearchSession(searchSession.id, {
            status: 'failed',
          });
        });

    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Dosya yükleme hatası',
      });
    }
  });

  // Get search progress (protected route)
  app.get("/api/search/progress/:sessionId", requireAuth, async (req, res) => {
    try {
      const { sessionId } = req.params;
      const session = await storage.getSearchSessionBySessionId(sessionId);
      
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Arama oturumu bulunamadı',
        });
      }

      res.json({
        success: true,
        status: session.status,
        totalItems: session.totalItems,
        processedItems: session.processedItems,
        successfulItems: session.successfulItems,
        progress: (session.totalItems || 0) > 0 ? Math.round(((session.processedItems || 0) / (session.totalItems || 1)) * 100) : 0,
      });
    } catch (error) {
      console.error('Progress check error:', error);
      res.status(500).json({
        success: false,
        error: 'İlerleme kontrolü hatası',
      });
    }
  });

  // Get search results (protected route)
  app.get("/api/search/results/:sessionId", requireAuth, async (req, res) => {
    try {
      const { sessionId } = req.params;
      const results = await storage.getSearchResultsBySessionId(sessionId);
      
      res.json({
        success: true,
        results: results.map(result => ({
          isbn: result.isbn,
          site: result.site,
          title: result.title,
          author: result.author,
          publisher: result.publisher,
          price: result.price,
          url: result.url,
          status: result.status,
          errorMessage: result.errorMessage,
        })),
      });
    } catch (error) {
      console.error('Results fetch error:', error);
      res.status(500).json({
        success: false,
        error: 'Sonuçlar alınamadı',
      });
    }
  });

  // Export results to Excel
  app.get("/api/search/export/:sessionId", requireAuth, async (req, res) => {
    try {
      const { sessionId } = req.params;
      const results = await storage.getSearchResultsBySessionId(sessionId);
      
      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Dışa aktarılacak sonuç bulunamadı',
        });
      }

      const excelBuffer = await exportToExcel(results);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=isbn-arama-sonuclari-${sessionId}.xlsx`);
      res.send(excelBuffer);
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({
        success: false,
        error: 'Dışa aktarma hatası',
      });
    }
  });

  // Get site status
  app.get("/api/sites/status", async (req, res) => {
    try {
      const sites = await searchService.getSiteStatus();
      res.json({
        success: true,
        sites,
      });
    } catch (error) {
      console.error('Site status error:', error);
      res.status(500).json({
        success: false,
        error: 'Site durumu alınamadı',
      });
    }
  });

  // ↓ DEBUG LOGS ENDPOINT
  app.get("/api/debug/logs", requireAuth, async (req, res) => {
    try {
      const linesParam = parseInt(String(req.query.lines || "500"), 10);
      const lineCount = isNaN(linesParam) || linesParam <= 0 ? 500 : linesParam;

      const logPath = path.resolve(__dirname, "../log.txt");
      const content = await fs.readFile(logPath, "utf8");
      const allLines = content.split(/\r?\n/);
      const lastLines = allLines.slice(-lineCount);

      res.json({ success: true, lines: lastLines });
    } catch (error) {
      console.error("Debug logs endpoint error:", error);
      res.status(500).json({ success: false, error: "Loglar okunamadı" });
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}
