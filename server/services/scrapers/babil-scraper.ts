import { BaseScraper } from "./base-scraper";
import type { SearchResponse } from "@shared/schema";
import * as cheerio from "cheerio";

export class BabilScraper extends BaseScraper {
  constructor() {
    super('https://www.babil.com', 'Babil');
  }

  async search(isbn: string): Promise<SearchResponse> {
    try {
      const searchUrl = `${this.baseUrl}/arama?q=${isbn}`;
      const html = await this.makeRequest(searchUrl);
      const $ = cheerio.load(html);

      // Look for book results
      const bookElement = $('.product-item').first();
      
      if (bookElement.length === 0) {
        return {
          success: false,
          error: 'Kitap bulunamadı',
        };
      }

      const title = this.cleanText(bookElement.find('.product-title a').text());
      const author = this.cleanText(bookElement.find('.product-author').text());
      const price = this.extractPrice(bookElement.find('.product-price').text());
      const productUrl = bookElement.find('.product-title a').attr('href');
      
      // Get more details from product page if URL is available
      let publisher = '';
      if (productUrl) {
        try {
          const fullUrl = productUrl.startsWith('http') ? productUrl : `${this.baseUrl}${productUrl}`;
          const productHtml = await this.makeRequest(fullUrl);
          const $product = cheerio.load(productHtml);
          publisher = this.cleanText($product('.publisher-info, .yayinevi').text());
        } catch (error) {
          console.warn('Could not fetch product details:', error);
        }
      }

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
        error: error instanceof Error ? error.message : 'Babil arama hatası',
      };
    }
  }
}
