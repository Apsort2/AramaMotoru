import * as XLSX from 'xlsx';

export interface ExcelParseResult {
  success: boolean;
  isbns?: string[];
  invalidISBNs?: string[];
  error?: string;
}

export async function parseExcelFile(buffer: Buffer): Promise<ExcelParseResult> {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    
    if (!sheetName) {
      return {
        success: false,
        error: 'Excel dosyasında sayfa bulunamadı',
      };
    }

    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    const validISBNs: string[] = [];
    const invalidISBNs: string[] = [];

    for (const row of data) {
      if (Array.isArray(row) && row.length > 0) {
        const potentialISBN = String(row[0]).trim();
        
        if (potentialISBN && potentialISBN !== '') {
          const cleanedISBN = potentialISBN.replace(/[-\s]/g, '');
          
          if (isValidISBN(cleanedISBN)) {
            validISBNs.push(cleanedISBN);
          } else {
            invalidISBNs.push(potentialISBN);
          }
        }
      }
    }

    if (validISBNs.length === 0) {
      return {
        success: false,
        error: 'Excel dosyasında geçerli ISBN numarası bulunamadı',
      };
    }

    return {
      success: true,
      isbns: validISBNs,
      invalidISBNs,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Excel dosyası okunamadı',
    };
  }
}

function isValidISBN(isbn: string): boolean {
  // Remove any remaining non-digit characters
  const cleaned = isbn.replace(/\D/g, '');
  
  // Check if it's 10 or 13 digits
  if (cleaned.length !== 10 && cleaned.length !== 13) {
    return false;
  }

  // Basic validation - all digits
  return /^\d+$/.test(cleaned);
}
