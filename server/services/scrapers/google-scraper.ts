import { BaseScraper } from "./base-scraper";
import type { SearchResponse } from "@shared/schema";

export class GoogleScraper extends BaseScraper {
  constructor() {
    super("https://www.googleapis.com/books/v1", "Google Books");
  }

  async checkStatus(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/volumes?q=intitle:"The Lord of the Rings"&maxResults=1`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async search(isbn: string): Promise<SearchResponse> {
    try {
      const url = `${this.baseUrl}/volumes?q=isbn:${isbn}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const json: any = await response.json();
      if (json.totalItems && json.items && json.items.length > 0) {
        const info = json.items[0].volumeInfo || {};
        return {
          success: true,
          data: {
            isbn,
            title: info.title || "",
            author: (info.authors || []).join(", "),
            publisher: info.publisher || "",
            price: "",
            url: info.infoLink || "",
            // kitap bilgisi dönerken site alanı eklendi
            site: this.siteName,
          },
        };
      }

      return {
        success: false,
        error: "ISBN Google Books üzerinde bulunamadı",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      };
    }
  }
}