import { BaseScraper } from "./base-scraper";
import type { SearchResponse } from "@shared/schema";
import * as cheerio from "cheerio";

export class BKMScraper extends BaseScraper {
  constructor() {
    super('https://www.bkmkitap.com', 'BKM Kitap');
  }

  async search(isbn: string): Promise<SearchResponse> {
    try {
      const searchUrl = `${this.baseUrl}/arama?q=${isbn}`;
      const html = await this.makeRequest(searchUrl);
      const $ = cheerio.load(html);

      // Look for book results
      const bookElement = $('.product-box, .book-item').first();
      
      if (bookElement.length === 0) {
        return {
          success: false,
          error: 'Kitap bulunamadı',
        };
      }

      const title = this.cleanText(bookElement.find('.product-name a, .book-title').text());
      const author = this.cleanText(bookElement.find('.product-author, .author').text());
      const price = this.extractPrice(bookElement.find('.product-price, .price').text());
      const productUrl = bookElement.find('.product-name a, .book-title a').attr('href');
      
      // Get publisher info
      let publisher = this.cleanText(bookElement.find('.product-publisher, .publisher').text());
      
      if (!title) {
        return {
          success: false,
          error: 'Kitap bilgileri eksik',
        };
      }

      return {
        success: true,
        data: {
          isbn,
          title,
          author: author || 'Yazar bilgisi bulunamadı',
          publisher: publisher || 'Yayınevi bilgisi bulunamadı',
          price: price || 'Fiyat bilgisi bulunamadı',
          url: productUrl ? (productUrl.startsWith('http') ? productUrl : `${this.baseUrl}${productUrl}`) : searchUrl,
          site: this.siteName,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'BKM Kitap arama hatası',
      };
    }
  }
}
