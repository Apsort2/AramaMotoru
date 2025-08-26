import { BabilScraper } from "./scrapers/babil-scraper";
import { DRScraper } from "./scrapers/dr-scraper";
import { KitapsecScraper } from "./scrapers/kitapsec-scraper";
import { BKMScraper } from "./scrapers/bkm-scraper";
import type { BookData, SearchResponse } from "@shared/schema";
import type { IStorage } from "../storage";

export class ISBNSearchService {
  private scrapers: Map<string, any>;

  constructor() {
    this.scrapers = new Map([
      ['Babil', new BabilScraper()],
      ['D&R', new DRScraper()],
      ['Kitapsec', new KitapsecScraper()],
      ['BKM Kitap', new BKMScraper()],
    ]);
  }

  async searchSingle(isbn: string): Promise<SearchResponse> {
    // Try each scraper until we find a result
    for (const [siteName, scraper] of Array.from(this.scrapers.entries())) {
      try {
        console.log(`Searching ${siteName} for ISBN: ${isbn}`);
        const result = await scraper.search(isbn);
        
        if (result.success && result.data) {
          return {
            success: true,
            data: {
              ...result.data,
              site: siteName,
            },
          };
        }
      } catch (error) {
        console.error(`Error searching ${siteName}:`, error);
        continue;
      }
    }

    return {
      success: false,
      error: 'ISBN hiçbir sitede bulunamadı',
    };
  }

  async searchBulk(sessionId: string, isbns: string[], storage: IStorage): Promise<void> {
    const session = await storage.getSearchSessionBySessionId(sessionId);
    if (!session) {
      throw new Error('Search session not found');
    }

    // Update session status
    await storage.updateSearchSession(session.id, {
      status: 'in_progress',
    });

    let processedCount = 0;
    let successCount = 0;

    for (const isbn of isbns) {
      try {
        const result = await this.searchSingle(isbn);
        
        // Save result
        await storage.createSearchResult({
          sessionId,
          isbn,
          site: result.data?.site || '',
          title: result.data?.title || '',
          author: result.data?.author || '',
          publisher: result.data?.publisher || '',
          price: result.data?.price || '',
          url: result.data?.url || '',
          status: result.success ? 'found' : 'not_found',
          errorMessage: result.error,
        });

        if (result.success) {
          successCount++;
        }
      } catch (error) {
        // Save error result
        await storage.createSearchResult({
          sessionId,
          isbn,
          site: '',
          title: '',
          author: '',
          publisher: '',
          price: '',
          url: '',
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Bilinmeyen hata',
        });
      }

      processedCount++;

      // Update progress
      await storage.updateSearchSession(session.id, {
        processedItems: processedCount,
        successfulItems: successCount,
      });

      // Add delay to avoid overwhelming the sites
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Mark as completed
    await storage.updateSearchSession(session.id, {
      status: 'completed',
    });
  }

  async getSiteStatus() {
    const sites = [];
    
    for (const [siteName, scraper] of Array.from(this.scrapers.entries())) {
      try {
        const status = await scraper.checkStatus();
        sites.push({
          name: siteName,
          status: status ? 'active' : 'inactive',
          lastChecked: new Date().toISOString(),
        });
      } catch (error) {
        sites.push({
          name: siteName,
          status: 'error',
          lastChecked: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Bilinmeyen hata',
        });
      }
    }

    return sites;
  }
}
