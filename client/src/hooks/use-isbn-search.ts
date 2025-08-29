import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { 
  SingleSearchResponse, 
  BulkSearchResponse, 
  SearchProgress, 
  SearchResultsResponse,
  SiteStatusResponse 
} from "@/types";
import { useToast } from "@/hooks/use-toast";

export function useSingleSearch() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (isbn: string): Promise<SingleSearchResponse> => {
      // ✅ DÜZELTİLDİ: Önce URL, sonra method, sonra data
      const response = await apiRequest("/api/search/single", "POST", { isbn });
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.success && data.found) {
        toast({
          title: "Arama tamamlandı",
          description: `Kitap ${data.result?.site} sitesinde bulundu`,
          variant: "default",
        });
      } else {
        toast({
          title: "Sonuç bulunamadı",
          description: "ISBN hiçbir sitede bulunamadı",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Arama hatası",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useBulkSearch() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (file: File): Promise<BulkSearchResponse> => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch("/api/search/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Dosya yükleme hatası');
      }

      return await response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Dosya başarıyla yüklendi",
          description: `${data.totalItems} ISBN bulundu, arama başlatıldı`,
          variant: "default",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Dosya yükleme hatası",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useSearchProgress(sessionId?: string) {
  return useQuery({
    queryKey: ['/api/search/progress', sessionId],
    enabled: !!sessionId,
    refetchInterval: 2000, // Poll every 2 seconds
  });
}

export function useSearchResults(sessionId?: string) {
  return useQuery({
    queryKey: ['/api/search/results', sessionId],
    enabled: !!sessionId,
  });
}

export function useSiteStatus() {
  return useQuery({
    queryKey: ['/api/sites/status'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useExportResults() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/search/export/${sessionId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Export hatası');
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `isbn-arama-sonuclari-${sessionId}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast({
        title: "İndirme başarılı",
        description: "Sonuçlar Excel dosyası olarak indirildi",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "İndirme hatası",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}