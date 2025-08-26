import type { BookData, SearchResponse } from "@shared/schema";

export abstract class BaseScraper {
  protected baseUrl: string;
  protected siteName: string;

  constructor(baseUrl: string, siteName: string) {
    this.baseUrl = baseUrl;
    this.siteName = siteName;
  }

  abstract search(isbn: string): Promise<SearchResponse>;

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

  protected async makeRequest(url: string): Promise<string> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.text();
  }

  protected extractPrice(priceText: string): string {
    // Extract price from various formats
    const priceMatch = priceText.match(/(\d+[,.]?\d*)\s*(TL|₺)/i);
    return priceMatch ? priceMatch[0] : priceText.trim();
  }

  protected cleanText(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }
}
