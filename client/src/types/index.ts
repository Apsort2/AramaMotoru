export interface BookData {
  isbn: string;
  title?: string;
  author?: string;
  publisher?: string;
  price?: string;
  url?: string;
  site: string;
}

export interface SearchResult {
  isbn: string;
  site: string;
  title: string;
  author: string;
  publisher: string;
  price: string;
  url: string;
  status: 'found' | 'not_found' | 'error';
  errorMessage?: string;
}

export interface SearchSession {
  id: string;
  sessionId: string;
  searchType: 'single' | 'bulk';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  results: any[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SiteStatus {
  name: string;
  status: 'active' | 'inactive' | 'error';
  lastChecked: string;
  error?: string;
}

export interface SearchProgress {
  status: string;
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  progress: number;
}

export interface SingleSearchResponse {
  success: boolean;
  sessionId: string;
  result?: BookData;
  found: boolean;
}

export interface BulkSearchResponse {
  success: boolean;
  sessionId: string;
  totalItems: number;
  validISBNs: number;
  invalidISBNs: number;
}

export interface SearchResultsResponse {
  success: boolean;
  results: SearchResult[];
}

export interface SiteStatusResponse {
  success: boolean;
  sites: SiteStatus[];
}
