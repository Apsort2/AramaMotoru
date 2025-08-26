import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { FileUpload } from "@/components/file-upload";
import { useSingleSearch, useBulkSearch } from "@/hooks/use-isbn-search";
import { Search, Table } from "lucide-react";

interface SearchPanelProps {
  onSearchComplete: (sessionId: string, successful: boolean) => void;
  searchStats: {
    totalSearches: number;
    successfulSearches: number;
  };
}

export function SearchPanel({ onSearchComplete, searchStats }: SearchPanelProps) {
  const [isbn, setIsbn] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const singleSearchMutation = useSingleSearch();
  const bulkSearchMutation = useBulkSearch();

  const validateISBN = (isbnValue: string): boolean => {
    const cleaned = isbnValue.replace(/[-\s]/g, '');
    return cleaned.length >= 10 && cleaned.length <= 13 && /^\d+$/.test(cleaned);
  };

  const handleSingleSearch = async () => {
    if (!validateISBN(isbn)) {
      return;
    }

    try {
      const result = await singleSearchMutation.mutateAsync(isbn);
      onSearchComplete(result.sessionId, result.found);
    } catch (error) {
      // Error handled in mutation
    }
  };

  const handleBulkSearch = async () => {
    if (!uploadedFile) {
      return;
    }

    try {
      const result = await bulkSearchMutation.mutateAsync(uploadedFile);
      onSearchComplete(result.sessionId, true);
    } catch (error) {
      // Error handled in mutation
    }
  };

  const handleFileSelect = (file: File) => {
    setUploadedFile(file);
  };

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-6 flex items-center" data-testid="search-panel-title">
        <Search className="text-primary-600 mr-2" />
        Arama Paneli
      </h2>

      {/* Single ISBN Search */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-slate-700 mb-4" data-testid="single-search-title">Tekli ISBN Arama</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="isbn-input" data-testid="isbn-label">ISBN Numarası</Label>
            <Input
              id="isbn-input"
              type="text"
              placeholder="10-13 haneli ISBN giriniz"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              data-testid="input-isbn"
            />
          </div>
          <Button
            onClick={handleSingleSearch}
            disabled={!validateISBN(isbn) || singleSearchMutation.isPending}
            className="w-full"
            data-testid="button-single-search"
          >
            <Search className="mr-2 h-4 w-4" />
            {singleSearchMutation.isPending ? "Aranıyor..." : "Ara"}
          </Button>
        </div>
      </div>

      {/* Bulk Search Section */}
      <div className="border-t border-slate-200 pt-8">
        <h3 className="text-sm font-medium text-slate-700 mb-4" data-testid="bulk-search-title">Toplu Arama</h3>
        <div className="space-y-4">
          <FileUpload onFileSelect={handleFileSelect} uploadedFile={uploadedFile} />
          
          <Button
            onClick={handleBulkSearch}
            disabled={!uploadedFile || bulkSearchMutation.isPending}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            data-testid="button-bulk-search"
          >
            <Table className="mr-2 h-4 w-4" />
            {bulkSearchMutation.isPending ? "Yükleniyor..." : "Toplu Arama Başlat"}
          </Button>
        </div>
      </div>

      {/* Search Statistics */}
      <div className="border-t border-slate-200 pt-6 mt-8">
        <h3 className="text-sm font-medium text-slate-700 mb-3" data-testid="statistics-title">İstatistikler</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <div className="text-lg font-bold text-slate-800" data-testid="text-total-searches">
              {searchStats.totalSearches}
            </div>
            <div className="text-xs text-slate-500">Toplam Arama</div>
          </div>
          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <div className="text-lg font-bold text-emerald-600" data-testid="text-successful-searches">
              {searchStats.successfulSearches}
            </div>
            <div className="text-xs text-slate-500">Başarılı</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
