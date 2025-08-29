import { BaseScraper } from "./base-scraper";
import type { SearchResponse } from "@shared/schema";

export class AmazonScraper extends BaseScraper {
  constructor() {
    super("https://www.amazon.com.tr", "Amazon");
  }

  async checkStatus(): Promise<boolean> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async search(isbn: string): Promise<SearchResponse> {
    try {
      // Amazon search URL pattern for books by ISBN
      const searchUrl = `${this.baseUrl}/s?k=${isbn}`;
      const html = await this.makeRequest(searchUrl, {
        headers:
          {
            "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
          },
      });

      // Regex to find the first product link that likely contains the book details
      const productLinkMatch = html.match(/<a class="a-link-normal s-underline-text s-underline-link-text s-link-style a-text-normal" href="([^"]+)">/);

      if (!productLinkMatch || !productLinkMatch[1]) {
        return {
          success: false,
          error: "Amazon arama sonuçlarında ürün linki bulunamadı.",
        };
      }

      const productUrl = `${this.baseUrl}${productLinkMatch[1]}`;
      const productHtml = await this.makeRequest(productUrl, {
        headers:
          {
            "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
          },
      });

      // Basic regex for title extraction (Amazon pages include <span id="productTitle">)
      const titleMatch = productHtml.match(/<span[^>]*id="productTitle"[^>]*>([^<]+)<\/span>/i);
      const authorMatch = productHtml.match(/<a[^>]*class="a-link-normal contributorNameID"[^>]*>([^<]+)<\/a>/i);
      const publisherMatch = productHtml.match(/Yayınevi(?:\s*:)\s*<span[^>]*>([^<]+)<\/span>/i);

      if (titleMatch) {
        return {
          success: true,
          data: {
            isbn,
            title: this.cleanText(titleMatch[1]),
            author: authorMatch ? this.cleanText(authorMatch[1]) : "",
            publisher: publisherMatch ? this.cleanText(publisherMatch[1]) : "",
            price: "",
            url: productUrl,
            // kitap bilgisi dönerken site alanı eklendi
            site: this.siteName,
          },
        };
      }

      return {
        success: false,
        error: "ISBN Amazon üzerinde bulunamadı",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      };
    }
  }
}