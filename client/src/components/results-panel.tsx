import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  useSearchProgress, 
  useSearchResults, 
  useExportResults 
} from "@/hooks/use-isbn-search";
import { 
  Ligature, 
  Download, 
  Search, 
  Check, 
  X, 
  AlertCircle 
} from "lucide-react";
import type { SearchResult } from "@/types";

interface ResultsPanelProps {
  sessionId?: string;
}

export function ResultsPanel({ sessionId }: ResultsPanelProps) {
  const [isSearching, setIsSearching] = useState(false);
  
  const { data: progressData } = useSearchProgress(sessionId);
  const { 
    data: resultsData, 
    refetch: refetchResults,
    isLoading: resultsLoading 
  } = useSearchResults(sessionId);

  // Type guard functions
  const hasProgressData = (data: any): data is { status: string; processedItems: number; totalItems: number; progress: number } => {
    return data && typeof data.status === 'string';
  };

  const hasResultsData = (data: any): data is { results: SearchResult[] } => {
    return data && Array.isArray(data.results);
  };
  
  const exportMutation = useExportResults();

  // Auto-refresh results when search is completed
  useEffect(() => {
    if (hasProgressData(progressData)) {
      if (progressData.status === 'completed' || progressData.status === 'failed') {
        setIsSearching(false);
        refetchResults();
      } else if (progressData.status === 'in_progress') {
        setIsSearching(true);
      }
    }
  }, [progressData, refetchResults]);

  const handleExport = () => {
    if (sessionId) {
      exportMutation.mutate(sessionId);
    }
  };

  const getSiteIcon = (siteName: string) => {
    const name = siteName.charAt(0).toUpperCase();
    const colors = {
      'D': 'from-blue-500 to-purple-600',
      'B': 'from-green-500 to-teal-600',
      'K': 'from-orange-500 to-red-600',
      'default': 'from-indigo-500 to-purple-600'
    };
    return { name, color: colors[name as keyof typeof colors] || colors.default };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'found':
        return (
          <Badge className="bg-emerald-100 text-emerald-800" data-testid="badge-found">
            <Check className="w-3 h-3 mr-1" />
            Bulundu
          </Badge>
        );
      case 'not_found':
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800" data-testid="badge-not-found">
            <X className="w-3 h-3 mr-1" />
            Bulunamadı
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800" data-testid="badge-error">
            <AlertCircle className="w-3 h-3 mr-1" />
            Hata
          </Badge>
        );
      default:
        return null;
    }
  };

  const results = hasResultsData(resultsData) ? resultsData.results : [];
  const hasResults = results.length > 0;
  const isSingleResult = results.length === 1 && hasProgressData(progressData) && progressData.totalItems === 1;

  return (
    <Card>
      {/* Results Header */}
      <div className="px-6 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center" data-testid="results-title">
            <Ligature className="text-primary-600 mr-2" />
            Arama Sonuçları
          </h2>
          <div className="flex items-center space-x-3">
            {isSearching && (
              <div className="flex items-center space-x-2 text-sm text-amber-600" data-testid="search-indicator">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-600 border-t-transparent"></div>
                <span>Arama yapılıyor...</span>
              </div>
            )}
            {hasResults && !isSearching && (
              <Button
                onClick={handleExport}
                disabled={exportMutation.isPending}
                variant="outline"
                size="sm"
                data-testid="button-export"
              >
                <Download className="mr-2 h-4 w-4" />
                {exportMutation.isPending ? "İndiriliyor..." : "İndir"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {isSearching && hasProgressData(progressData) && (
        <div className="px-6 py-4 border-b border-slate-200" data-testid="progress-section">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">İlerleme</span>
            <span className="text-sm text-slate-500" data-testid="text-progress">
              {progressData.processedItems} / {progressData.totalItems} tamamlandı
            </span>
          </div>
          <Progress value={progressData.progress} className="w-full" data-testid="progress-bar" />
        </div>
      )}

      {/* Results Content */}
      <div className="p-6">
        {!hasResults && !resultsLoading && (
          <div className="text-center py-12" data-testid="empty-state">
            <div className="mx-auto w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Search className="text-2xl text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-800 mb-2">Henüz arama yapılmadı</h3>
            <p className="text-slate-500 max-w-sm mx-auto">
              Tek ISBN araması yapın veya Excel dosyası yükleyerek toplu arama başlatın.
            </p>
          </div>
        )}

        {resultsLoading && (
          <div className="text-center py-12" data-testid="loading-state">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-slate-500">Sonuçlar yükleniyor...</p>
          </div>
        )}

        {/* Single Search Result Card */}
        {isSingleResult && results[0].status === 'found' && (
          <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl p-6 border border-emerald-200" data-testid="single-result-card">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-emerald-600 text-white p-2 rounded-lg">
                  <Search className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800" data-testid="text-book-title">
                    {results[0].title}
                  </h3>
                  <p className="text-sm text-slate-600" data-testid="text-book-author">
                    {results[0].author}
                  </p>
                </div>
              </div>
              <Badge className="bg-blue-100 text-blue-800" data-testid="badge-site">
                {results[0].site}
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-slate-500">ISBN:</span>
                <span className="font-mono font-medium text-slate-800 ml-2" data-testid="text-isbn">
                  {results[0].isbn}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Fiyat:</span>
                <span className="font-semibold text-emerald-600 ml-2" data-testid="text-price">
                  {results[0].price}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Durum:</span>
                <span className="text-emerald-600 font-medium ml-2">Stokta</span>
              </div>
            </div>
          </div>
        )}

        {/* Results Table */}
        {hasResults && !isSingleResult && (
          <div className="overflow-x-auto" data-testid="results-table">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">ISBN</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Site</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Kitap Adı</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Yazar</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Fiyat</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Durum</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result: SearchResult, index: number) => (
                  <tr 
                    key={`${result.isbn}-${index}`} 
                    className="border-b border-slate-100 hover:bg-slate-50"
                    data-testid={`row-result-${index}`}
                  >
                    <td className="py-3 px-4 text-sm font-mono text-slate-600" data-testid={`text-isbn-${index}`}>
                      {result.isbn}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {result.site ? (
                        <div className="flex items-center space-x-2">
                          <div className={`w-6 h-6 bg-gradient-to-br ${getSiteIcon(result.site).color} rounded text-white text-xs font-bold flex items-center justify-center`}>
                            {getSiteIcon(result.site).name}
                          </div>
                          <span data-testid={`text-site-${index}`}>{result.site}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-800 font-medium" data-testid={`text-title-${index}`}>
                      {result.title || '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600" data-testid={`text-author-${index}`}>
                      {result.author || '-'}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-slate-800" data-testid={`text-price-${index}`}>
                      {result.price || '-'}
                    </td>
                    <td className="py-3 px-4 text-sm" data-testid={`status-${index}`}>
                      {getStatusBadge(result.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}
