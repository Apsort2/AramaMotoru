import { BaseScraper } from "./base-scraper";
import type { SearchResponse } from "@shared/schema";
import * as cheerio from "cheerio";

export class KitapsecScraper extends BaseScraper {
  constructor() {
    super('https://www.kitapsec.com', 'Kitapsec');
  }

  async search(isbn: string): Promise<SearchResponse> {
    try {
      const searchUrl = `${this.baseUrl}/arama?q=${isbn}`;
      const html = await this.makeRequest(searchUrl);
      const $ = cheerio.load(html);

      // Look for book results
      const bookElement = $('.book-item, .product-item').first();
      
      if (bookElement.length === 0) {
        return {
          success: false,
          error: 'Kitap bulunamadı',
        };
      }

      const title = this.cleanText(bookElement.find('.book-title a, .product-name a').text());
      const author = this.cleanText(bookElement.find('.book-author, .author-name').text());
      const price = this.extractPrice(bookElement.find('.book-price, .price').text());
      const productUrl = bookElement.find('.book-title a, .product-name a').attr('href');
      
      // Get publisher info
      let publisher = this.cleanText(bookElement.find('.book-publisher, .publisher').text());
      
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
        error: error instanceof Error ? error.message : 'Kitapsec arama hatası',
      };
    }
  }
}
