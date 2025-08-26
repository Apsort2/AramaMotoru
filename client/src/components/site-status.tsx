import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSiteStatus } from "@/hooks/use-isbn-search";
import { Globe, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import type { SiteStatus as SiteStatusType } from "@/types";

export function SiteStatus() {
  const { data: statusData, isLoading, error } = useSiteStatus();

  const getSiteIcon = (siteName: string) => {
    const name = siteName.charAt(0).toUpperCase();
    const colors = {
      'D': 'from-blue-500 to-purple-600',
      'B': 'from-green-500 to-teal-600',
      'K': 'from-orange-500 to-red-600',
      'BKM': 'from-indigo-500 to-purple-600'
    };
    
    const key = siteName.includes('BKM') ? 'BKM' : name;
    return { 
      name: siteName.includes('BKM') ? 'B' : name, 
      color: colors[key as keyof typeof colors] || colors['D'] 
    };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-emerald-600" />;
      case 'inactive':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-amber-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-slate-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Aktif';
      case 'inactive':
        return 'Pasif';
      case 'error':
        return 'Hata';
      default:
        return 'Bilinmiyor';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-emerald-600';
      case 'inactive':
        return 'text-red-600';
      case 'error':
        return 'text-amber-600';
      default:
        return 'text-slate-400';
    }
  };

  if (error) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center" data-testid="site-status-title">
          <Globe className="text-primary-600 mr-2" />
          Site Durumu
        </h3>
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600" data-testid="error-message">Site durumu alınamadı</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center" data-testid="site-status-title">
        <Globe className="text-primary-600 mr-2" />
        Site Durumu
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <Skeleton className="w-16 h-4" />
              </div>
              <Skeleton className="w-12 h-4" />
            </div>
          ))
        ) : (
          statusData && typeof statusData === 'object' && 'sites' in statusData && Array.isArray(statusData.sites) ? statusData.sites.map((site: SiteStatusType, index: number) => (
            <div 
              key={site.name} 
              className="flex items-center justify-between p-4 border border-slate-200 rounded-lg"
              data-testid={`site-status-${index}`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 bg-gradient-to-br ${getSiteIcon(site.name).color} rounded-lg flex items-center justify-center text-white text-sm font-bold`}>
                  {getSiteIcon(site.name).name}
                </div>
                <span className="font-medium text-slate-700" data-testid={`text-site-name-${index}`}>
                  {site.name}
                </span>
              </div>
              <div className={`flex items-center space-x-1 ${getStatusColor(site.status)}`}>
                {getStatusIcon(site.status)}
                <span className="text-sm font-medium" data-testid={`text-site-status-${index}`}>
                  {getStatusText(site.status)}
                </span>
              </div>
            </div>
          )) : null
        )}
      </div>
    </Card>
  );
}
