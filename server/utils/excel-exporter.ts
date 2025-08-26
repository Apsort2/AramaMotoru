import * as XLSX from 'xlsx';
import type { SearchResult } from '@shared/schema';

export async function exportToExcel(results: SearchResult[]): Promise<Buffer> {
  // Prepare data for Excel
  const excelData = results.map(result => ({
    'ISBN': result.isbn,
    'Site': result.site || '-',
    'Kitap Adı': result.title || '-',
    'Yazar': result.author || '-',
    'Yayınevi': result.publisher || '-',
    'Fiyat': result.price || '-',
    'Web Adresi': result.url || '-',
    'Durum': result.status === 'found' ? 'Bulundu' : result.status === 'not_found' ? 'Bulunamadı' : 'Hata',
    'Hata Mesajı': result.errorMessage || '-',
  }));

  // Create workbook
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // Set column widths
  const columnWidths = [
    { wch: 15 }, // ISBN
    { wch: 12 }, // Site
    { wch: 40 }, // Kitap Adı
    { wch: 30 }, // Yazar
    { wch: 25 }, // Yayınevi
    { wch: 12 }, // Fiyat
    { wch: 50 }, // Web Adresi
    { wch: 12 }, // Durum
    { wch: 30 }, // Hata Mesajı
  ];
  worksheet['!cols'] = columnWidths;

  // Add conditional formatting for status
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  for (let rowNum = 1; rowNum <= range.e.r; rowNum++) {
    const statusCell = `H${rowNum + 1}`;
    const cell = worksheet[statusCell];
    if (cell && cell.v === 'Bulunamadı') {
      // Red background for not found
      cell.s = {
        fill: {
          fgColor: { rgb: "FFCDD2" }
        },
        font: {
          color: { rgb: "D32F2F" }
        }
      };
    } else if (cell && cell.v === 'Bulundu') {
      // Green background for found
      cell.s = {
        fill: {
          fgColor: { rgb: "C8E6C9" }
        },
        font: {
          color: { rgb: "388E3C" }
        }
      };
    }
  }

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Arama Sonuçları');

  // Generate Excel buffer
  const excelBuffer = XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
    compression: true
  });

  return excelBuffer;
}
