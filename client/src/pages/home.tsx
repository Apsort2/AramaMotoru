import { useState } from "react";
import { SearchPanel } from "@/components/search-panel";
import { ResultsPanel } from "@/components/results-panel";
import { SiteStatus } from "@/components/site-status";
import { Book, Globe } from "lucide-react";

export default function Home() {
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>();
  const [searchStats, setSearchStats] = useState({
    totalSearches: 0,
    successfulSearches: 0,
  });

  const handleSearchComplete = (sessionId: string, successful: boolean) => {
    setCurrentSessionId(sessionId);
    setSearchStats(prev => ({
      totalSearches: prev.totalSearches + 1,
      successfulSearches: prev.successfulSearches + (successful ? 1 : 0),
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-primary-600 text-white p-2 rounded-lg" data-testid="header-logo">
                <Book className="text-xl" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800" data-testid="header-title">ISBN Arama</h1>
                <p className="text-sm text-slate-500" data-testid="header-subtitle">Türk Kitap Sitelerinden Hızlı Arama</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <span className="text-sm text-slate-600" data-testid="developer-info">Geliştirici: Abdullah ÖZMEN</span>
              <div className="h-6 w-px bg-slate-300"></div>
              <span className="text-sm text-emerald-600 font-medium" data-testid="status-indicator">
                <i className="fas fa-circle text-xs mr-1"></i>
                Çevrimiçi
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Search Panel */}
          <div className="lg:col-span-1">
            <SearchPanel 
              onSearchComplete={handleSearchComplete} 
              searchStats={searchStats}
            />
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2">
            <ResultsPanel sessionId={currentSessionId} />
          </div>
        </div>

        {/* Site Status */}
        <div className="mt-8">
          <SiteStatus />
        </div>
      </div>
    </div>
  );
}
