import { BaseScraper } from "./base-scraper";
import type { SearchResponse } from "@shared/schema";
import * as cheerio from "cheerio";

export class DRScraper extends BaseScraper {
  constructor() {
    super('https://www.dr.com.tr', 'D&R');
  }

  async search(isbn: string): Promise<SearchResponse> {
    try {
      const searchUrl = `${this.baseUrl}/search?q=${isbn}`;
      const html = await this.makeRequest(searchUrl);
      const $ = cheerio.load(html);

      // Look for book results
      const bookElement = $('.prd-item, .product-item').first();
      
      if (bookElement.length === 0) {
        return {
          success: false,
          error: 'Kitap bulunamadı',
        };
      }

      const title = this.cleanText(bookElement.find('.prd-name a, .product-title a').text());
      const author = this.cleanText(bookElement.find('.prd-author, .product-author').text());
      const price = this.extractPrice(bookElement.find('.prd-price, .product-price').text());
      const productUrl = bookElement.find('.prd-name a, .product-title a').attr('href');
      
      // Get publisher info
      let publisher = this.cleanText(bookElement.find('.prd-publisher, .publisher').text());
      
      // If publisher not found in listing, try to get from product page
      if (!publisher && productUrl) {
        try {
          const fullUrl = productUrl.startsWith('http') ? productUrl : `${this.baseUrl}${productUrl}`;
          const productHtml = await this.makeRequest(fullUrl);
          const $product = cheerio.load(productHtml);
          publisher = this.cleanText($product('.publisher-name, .yayinevi').text());
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
        error: error instanceof Error ? error.message : 'D&R arama hatası',
      };
    }
  }
}
