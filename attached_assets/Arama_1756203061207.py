
import wx
import wx.adv
import pandas as pd
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import NoSuchElementException, TimeoutException
from bs4 import BeautifulSoup
import threading
import os
import time
import logging
from threading import Lock
import sys
import concurrent.futures

# Ensure project root is on sys.path for 'src' imports
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from src.webdriver.pool import DriverPool
from src.scrapers.registry import ScraperRegistry
from src.services.isbn_search_service import ISBNSearchService
from src.scrapers.sites.babil import BabilScraper
from src.scrapers.sites.dr import DRScraper
from src.scrapers.sites.kitapsec import KitapsecScraper
from src.scrapers.sites.bkmkitap import BKMKitapScraper
from src.config_loader import load_config
from src.utils.memory import (
    LRUCache,
    chunked_excel_reader,
    memory_profiler_decorator,
    memory_monitor,
    optimize_dataframe_memory
)


class ModernISBNApp(wx.Frame):
    """Modern ISBN Arama Uygulaması'nın ana sınıfı."""

    def __init__(self, parent, title):
        super().__init__(parent, title=title, size=(900, 700))
        
        # Ana panel
        self.panel = wx.Panel(self)
        
        # Load configuration
        try:
            self.config = load_config()
        except Exception:
            # Fallback to default config if loading fails
            from src.config_model import AppConfig
            self.config = AppConfig()
        
        # Thread güvenliği için
        self.lock = Lock()
        # Replace simple cache with LRU cache
        self.cache = LRUCache(
            maxsize=self.config.cache.max_cache_size,
            ttl=self.config.cache.cache_ttl,
            cleanup_interval=self.config.memory.cache_cleanup_interval
        )
        self.start_time = None
        
        # WebDriver havuzu ve Scraper servisi
        self.driver_pool = DriverPool(maxsize=2, headless=True)
        self.registry = ScraperRegistry()
        self.registry.register("Babil", BabilScraper)
        self.registry.register("D&R", DRScraper)
        self.registry.register("Kitapsec", KitapsecScraper)
        self.registry.register("BKM Kitap", BKMKitapScraper)
        self.search_service = ISBNSearchService(self.registry, self.driver_pool)
        
        # Excel dosyası yolu
        self.excel_path = None
        
        # Arayüzü oluştur
        self.init_ui()
        
        # Pencereyi merkeze konumlandır
        self.Centre()
        self.Show()
        
        # Kapatma event'ini bağla
        self.Bind(wx.EVT_CLOSE, self.on_close)

    def init_ui(self):
        """Modern arayüzü oluşturur."""
        # Ana sizer
        main_sizer = wx.BoxSizer(wx.VERTICAL)
        
        # Üst panel - Başlık ve bilgi
        top_panel = wx.Panel(self.panel)
        top_panel.SetBackgroundColour(wx.Colour(52, 73, 94))  # Koyu mavi-gri
        top_sizer = wx.BoxSizer(wx.VERTICAL)
        
        # Ana başlık
        title_label = wx.StaticText(top_panel, label="📚 ISBN Arama Uygulaması")
        title_font = wx.Font(18, wx.FONTFAMILY_DEFAULT, wx.FONTSTYLE_NORMAL, wx.FONTWEIGHT_BOLD)
        title_label.SetFont(title_font)
        title_label.SetForegroundColour(wx.Colour(255, 255, 255))
        
        # Alt başlık
        subtitle_label = wx.StaticText(top_panel, label="Türk Kitap Sitelerinden Hızlı Arama")
        subtitle_font = wx.Font(10, wx.FONTFAMILY_DEFAULT, wx.FONTSTYLE_NORMAL, wx.FONTWEIGHT_NORMAL)
        subtitle_label.SetFont(subtitle_font)
        subtitle_label.SetForegroundColour(wx.Colour(200, 200, 200))
        
        # Geliştirici bilgisi
        dev_label = wx.StaticText(top_panel, label="Geliştirici: Abdullah ÖZMEN")
        dev_font = wx.Font(9, wx.FONTFAMILY_DEFAULT, wx.FONTSTYLE_NORMAL, wx.FONTWEIGHT_NORMAL)
        dev_label.SetFont(dev_font)
        dev_label.SetForegroundColour(wx.Colour(255, 193, 7))  # Altın sarısı
        
        # Üst panel düzeni
        top_sizer.Add(title_label, 0, wx.ALIGN_CENTER | wx.ALL, 15)
        top_sizer.Add(subtitle_label, 0, wx.ALIGN_CENTER | wx.ALL, 5)
        top_sizer.Add(dev_label, 0, wx.ALIGN_CENTER | wx.ALL, 10)
        top_panel.SetSizer(top_sizer)
        
        # Orta panel - Arama kontrolleri
        middle_panel = wx.Panel(self.panel)
        middle_panel.SetBackgroundColour(wx.Colour(236, 240, 241))  # Açık gri
        middle_sizer = wx.BoxSizer(wx.VERTICAL)
        
        # ISBN giriş alanı
        isbn_sizer = wx.BoxSizer(wx.HORIZONTAL)
        isbn_label = wx.StaticText(middle_panel, label="🔍 ISBN Numarası:")
        isbn_label.SetFont(wx.Font(11, wx.FONTFAMILY_DEFAULT, wx.FONTSTYLE_NORMAL, wx.FONTWEIGHT_BOLD))
        self.isbn_input = wx.TextCtrl(middle_panel, size=(200, 30))
        self.isbn_input.SetHint("10-13 haneli ISBN giriniz")
        
        isbn_sizer.Add(isbn_label, 0, wx.ALIGN_CENTER_VERTICAL | wx.ALL, 10)
        isbn_sizer.Add(self.isbn_input, 1, wx.ALL | wx.EXPAND, 10)
        
        # Buton paneli
        button_sizer = wx.BoxSizer(wx.HORIZONTAL)
        
        # Excel yükle butonu
        self.excel_button = wx.Button(middle_panel, label="📁 Excel Yükle", size=(120, 35))
        self.excel_button.SetBackgroundColour(wx.Colour(46, 204, 113))  # Yeşil
        self.excel_button.SetForegroundColour(wx.Colour(255, 255, 255))
        self.Bind(wx.EVT_BUTTON, self.on_excel_load, self.excel_button)
        
        # Tek arama butonu
        self.search_button = wx.Button(middle_panel, label="🔍 Tek Arama", size=(120, 35))
        self.search_button.SetBackgroundColour(wx.Colour(52, 152, 219))  # Mavi
        self.search_button.SetForegroundColour(wx.Colour(255, 255, 255))
        self.Bind(wx.EVT_BUTTON, self.on_search, self.search_button)
        
        # Toplu arama butonu
        self.bulk_search_button = wx.Button(middle_panel, label="📊 Toplu Arama", size=(120, 35))
        self.bulk_search_button.SetBackgroundColour(wx.Colour(155, 89, 182))  # Mor
        self.bulk_search_button.SetForegroundColour(wx.Colour(255, 255, 255))
        self.Bind(wx.EVT_BUTTON, self.on_bulk_search, self.bulk_search_button)
        
        button_sizer.Add(self.excel_button, 0, wx.ALL, 5)
        button_sizer.Add(self.search_button, 0, wx.ALL, 5)
        button_sizer.Add(self.bulk_search_button, 0, wx.ALL, 5)
        
        # Excel dosya yolu etiketi
        self.excel_path_label = wx.StaticText(middle_panel, label="📄 Seçilen dosya: Yok")
        self.excel_path_label.SetFont(wx.Font(9, wx.FONTFAMILY_DEFAULT, wx.FONTSTYLE_NORMAL, wx.FONTWEIGHT_NORMAL))
        
        # Orta panel düzeni
        middle_sizer.Add(isbn_sizer, 0, wx.ALL | wx.EXPAND, 10)
        middle_sizer.Add(button_sizer, 0, wx.ALIGN_CENTER | wx.ALL, 10)
        middle_sizer.Add(self.excel_path_label, 0, wx.ALIGN_CENTER | wx.ALL, 5)
        middle_panel.SetSizer(middle_sizer)
        
        # Alt panel - Sonuçlar ve durum
        bottom_panel = wx.Panel(self.panel)
        bottom_sizer = wx.BoxSizer(wx.VERTICAL)
        
        # Sonuçlar başlığı
        results_label = wx.StaticText(bottom_panel, label="📋 Arama Sonuçları")
        results_label.SetFont(wx.Font(12, wx.FONTFAMILY_DEFAULT, wx.FONTSTYLE_NORMAL, wx.FONTWEIGHT_BOLD))
        
        # Sonuçlar metin alanı
        self.result_label = wx.TextCtrl(bottom_panel, size=(-1, 200), 
                                       style=wx.TE_MULTILINE | wx.TE_READONLY | wx.HSCROLL)
        self.result_label.SetBackgroundColour(wx.Colour(255, 255, 255))
        self.result_label.SetFont(wx.Font(10, wx.FONTFAMILY_DEFAULT, wx.FONTSTYLE_NORMAL, wx.FONTWEIGHT_NORMAL))
        
        # Durum paneli
        status_panel = wx.Panel(bottom_panel)
        status_panel.SetBackgroundColour(wx.Colour(52, 73, 94))
        status_sizer = wx.BoxSizer(wx.HORIZONTAL)
        
        # Yükleniyor metni
        self.loading_text = wx.StaticText(status_panel, label="✅ Hazır")
        self.loading_text.SetForegroundColour(wx.Colour(255, 255, 255))
        self.loading_text.SetFont(wx.Font(9, wx.FONTFAMILY_DEFAULT, wx.FONTSTYLE_NORMAL, wx.FONTWEIGHT_NORMAL))
        
        # Progress Bar
        self.progress = wx.Gauge(status_panel, range=100, size=(200, 20))
        self.progress.Hide()
        
        # Progress etiketi
        self.progress_label = wx.StaticText(status_panel, label="")
        self.progress_label.SetForegroundColour(wx.Colour(255, 255, 255))
        self.progress_label.SetFont(wx.Font(9, wx.FONTFAMILY_DEFAULT, wx.FONTSTYLE_NORMAL, wx.FONTWEIGHT_NORMAL))
        self.progress_label.Hide()
        
        status_sizer.Add(self.loading_text, 0, wx.ALIGN_CENTER_VERTICAL | wx.ALL, 5)
        status_sizer.Add(self.progress, 0, wx.ALIGN_CENTER_VERTICAL | wx.ALL, 5)
        status_sizer.Add(self.progress_label, 0, wx.ALIGN_CENTER_VERTICAL | wx.ALL, 5)
        status_panel.SetSizer(status_sizer)
        
        # Alt panel düzeni
        bottom_sizer.Add(results_label, 0, wx.ALL, 5)
        bottom_sizer.Add(self.result_label, 1, wx.ALL | wx.EXPAND, 5)
        bottom_sizer.Add(status_panel, 0, wx.ALL | wx.EXPAND, 5)
        bottom_panel.SetSizer(bottom_sizer)
        
        # Ana düzeni tamamla
        main_sizer.Add(top_panel, 0, wx.ALL | wx.EXPAND, 5)
        main_sizer.Add(middle_panel, 0, wx.ALL | wx.EXPAND, 5)
        main_sizer.Add(bottom_panel, 1, wx.ALL | wx.EXPAND, 5)
        
        self.panel.SetSizer(main_sizer)

    def on_excel_load(self, event):
        """Excel dosyası yükleme işlemi."""
        with wx.FileDialog(self, "Excel Dosyası Seç", wildcard="Excel files (*.xlsx)|*.xlsx",
                           style=wx.FD_OPEN | wx.FD_FILE_MUST_EXIST) as file_dialog:

            if file_dialog.ShowModal() == wx.ID_CANCEL:
                return

            self.excel_path = file_dialog.GetPath()
            self.excel_path_label.SetLabel(f"📄 Seçilen dosya: {os.path.basename(self.excel_path)}")
            self.result_label.AppendText(f"✅ Excel dosyası yüklendi: {os.path.basename(self.excel_path)}\n")

    def clean_isbn(self, isbn):
        """ISBN'deki tire ve boşlukları temizler."""
        return isbn.replace("-", "").replace(" ", "")

    def validate_isbn(self, isbn):
        """ISBN numarasını doğrular."""
        cleaned_isbn = self.clean_isbn(isbn)
        if len(cleaned_isbn) not in [10, 13]:
            return False, "ISBN 10 veya 13 haneli olmalıdır."
        if not cleaned_isbn.isdigit():
            return False, "ISBN yalnızca rakamlardan oluşmalıdır."
        return True, ""

    def on_search(self, event):
        """Tek ISBN arama işlemi."""
        isbn_value = self.isbn_input.GetValue()
        is_valid, message = self.validate_isbn(isbn_value)
        if not is_valid:
            self.result_label.SetValue(f"❌ Geçersiz ISBN: {message}")
            return

        self.result_label.SetValue("")
        self.loading_text.SetLabel("🔍 Arama yapılıyor...")
        self.search_button.Disable()

        threading.Thread(target=self.perform_search, args=(isbn_value,), daemon=True).start()

    def perform_search(self, isbn):
        """Tekli arama işlemini gerçekleştirir."""
        ok, site_name, message = self.search_service.search_first(isbn)
        if ok:
            result_text = f"✅ {site_name} Sonuç:\n{message}"
        else:
            result_text = f"❌ {message}"
        wx.CallAfter(self.update_results, result_text)

    def update_results(self, message):
        """Arama sonuçlarını ekrana günceller."""
        self.result_label.SetValue(message)
        self.loading_text.SetLabel("✅ Hazır")
        self.search_button.Enable()

    def on_bulk_search(self, event):
        """Toplu ISBN arama işlemi - Memory optimized with chunked reading."""
        if not self.excel_path:
            self.result_label.SetValue("❌ Lütfen önce bir Excel dosyası seçin.")
            return

        self.result_label.SetValue("")
        self.loading_text.SetLabel("📊 Excel dosyası analiz ediliyor...")
        self.bulk_search_button.Disable()
        
        threading.Thread(target=self.process_excel_chunked, daemon=True).start()

    def process_excel_chunked(self):
        """Process Excel file in chunks for memory optimization."""
        try:
            valid_isbns = []
            invalid_isbns = []
            total_rows_processed = 0
            chunk_size = self.config.memory.excel_chunk_size
            
            # Log memory usage before processing
            initial_memory = memory_monitor.get_memory_usage()
            wx.CallAfter(
                self.result_label.AppendText, 
                f"🧠 Başlangıç bellek kullanımı: {initial_memory['current_mb']:.1f} MB\n"
            )
            
            # Process Excel file in chunks
            for chunk_idx, chunk in enumerate(chunked_excel_reader(
                file_path=self.excel_path,
                chunk_size=chunk_size,
                header=None
            ), 1):
                # Optimize chunk memory
                chunk = optimize_dataframe_memory(chunk)
                
                # Extract ISBN from first column
                isbn_series = chunk.iloc[:, 0].dropna().astype(str)
                total_rows_processed += len(isbn_series)
                
                # Validate ISBNs in this chunk
                for isbn in isbn_series:
                    if self.validate_isbn(isbn)[0]:
                        valid_isbns.append(isbn)
                    else:
                        invalid_isbns.append(isbn)
                
                # Update progress
                wx.CallAfter(
                    self.result_label.AppendText,
                    f"📄 Chunk {chunk_idx} işlendi: {len(isbn_series)} satır\n"
                )
                
                # Check memory usage
                current_memory = memory_monitor.get_memory_usage()
                if self.config.memory.memory_limit_mb:
                    if not memory_monitor.check_memory_limit(self.config.memory.memory_limit_mb):
                        wx.CallAfter(
                            self.result_label.AppendText,
                            f"⚠️ Bellek limiti aşıldı ({current_memory['current_mb']:.1f} MB), işlem durduruluyor\n"
                        )
                        break
                
                # Force garbage collection after processing chunks
                if chunk_idx % 5 == 0:  # Every 5 chunks
                    memory_monitor.force_garbage_collection()
            
            # Report validation results
            if invalid_isbns:
                invalid_sample = invalid_isbns[:10]  # Show first 10 invalid ISBNs
                wx.CallAfter(
                    self.result_label.AppendText, 
                    f"⚠️ {len(invalid_isbns)} geçersiz ISBN bulundu (örnek: {', '.join(invalid_sample)})\n"
                )

            if not valid_isbns:
                wx.CallAfter(
                    self.result_label.AppendText, 
                    "❌ Excel dosyasında geçerli ISBN numarası bulunamadı.\n"
                )
                wx.CallAfter(self.finish_bulk_search)
                return
                
            # Report processing statistics
            final_memory = memory_monitor.get_memory_usage()
            wx.CallAfter(
                self.result_label.AppendText,
                f"✅ Excel analizi tamamlandı:\n"
                f"📊 Toplam satır: {total_rows_processed}\n"
                f"✅ Geçerli ISBN: {len(valid_isbns)}\n"
                f"❌ Geçersiz ISBN: {len(invalid_isbns)}\n"
                f"🧠 Bellek kullanımı: {final_memory['current_mb']:.1f} MB\n\n"
            )
            
            # Start search process
            wx.CallAfter(self.progress.SetRange, len(valid_isbns))
            wx.CallAfter(self.progress.Show)
            wx.CallAfter(self.progress_label.Show)
            wx.CallAfter(self.loading_text.SetLabel, "🔍 Arama başlıyor...")
            
            self.bulk_search_parallel(valid_isbns)
            
        except Exception as e:
            error_msg = f"❌ Excel dosyası işlenirken hata oluştu: {str(e)}\n"
            wx.CallAfter(self.result_label.AppendText, error_msg)
            wx.CallAfter(self.finish_bulk_search)

    def bulk_search_parallel(self, isbn_list):
        """Toplu ISBN arama işlemi."""
        start_time = time.time()
        results = []
        success_count = 0
        fail_count = 0

        for idx, isbn in enumerate(isbn_list, start=1):
            ok, site_name, message = self.search_service.search_first(isbn)
            if ok:
                results.append(message)
                success_count += 1
            else:
                results.append(f"❌ {message}")
                fail_count += 1

            wx.CallAfter(self.progress.SetValue, idx)
            wx.CallAfter(self.progress_label.SetLabel, f"📊 {idx}/{len(isbn_list)} ISBN tamamlandı")

        self.save_results_to_excel(results)

        end_time = time.time()
        total_time = end_time - start_time
        minutes = int(total_time // 60)
        seconds = int(total_time % 60)

        result_message = (
            f"✅ Toplu arama tamamlandı!\n"
            f"📊 Toplam ISBN Sayısı: {len(isbn_list)}\n"
            f"✅ Başarılı Sonuçlar: {success_count}\n"
            f"❌ Başarısız Sonuçlar: {fail_count}\n"
            f"⏱️ Toplam Süre: {minutes} dakika {seconds} saniye\n"
        )
        wx.CallAfter(self.result_label.AppendText, result_message)
        wx.CallAfter(self.finish_bulk_search)

    def finish_bulk_search(self):
        """Toplu arama tamamlandığında çalışır."""
        self.loading_text.SetLabel("✅ Hazır")
        self.bulk_search_button.Enable()
        self.progress.Hide()
        self.progress_label.Hide()

    def save_results_to_excel(self, results):
        """Sonuçları Excel'e kaydeder."""
        try:
            data = []
            for result in results:
                if "Sonuç:" in result:
                    lines = result.split("\n")
                    isbn = lines[1].split(": ")[1].strip() if len(lines) > 1 else "ISBN bulunamadı"
                    title = lines[2].split(": ")[1].strip() if len(lines) > 2 else "Kitap adı bulunamadı"
                    author = lines[3].split(": ")[1].strip() if len(lines) > 3 else "Yazar bulunamadı"
                    publisher = lines[4].split(": ")[1].strip() if len(lines) > 4 else "Yayınevi bulunamadı"
                    source = lines[5].split(": ")[1].strip() if len(lines) > 5 else "Web adresi bulunamadı"
                    data.append([isbn, title, author, publisher, source])
                else:
                    data.append([result, "Bulunamadı", "Bulunamadı", "Bulunamadı", "Bulunamadı"])

            output_df = pd.DataFrame(data, columns=["ISBN", "Kitap Adı", "Yazar", "Yayınevi", "Web Adresi"])

            base_path = os.path.dirname(self.excel_path)
            base_filename = "Arama_Sonuclari"
            output_path = os.path.join(base_path, f"{base_filename}.xlsx")

            counter = 1
            while os.path.exists(output_path):
                output_path = os.path.join(base_path, f"{base_filename}_{counter}.xlsx")
                counter += 1

            with pd.ExcelWriter(output_path, engine="xlsxwriter") as writer:
                output_df.to_excel(writer, index=False, sheet_name="Sonuçlar", startrow=1)
                worksheet = writer.sheets["Sonuçlar"]
                worksheet.set_column(0, 0, 20)
                worksheet.set_column(1, 1, 40)
                worksheet.set_column(2, 2, 30)
                worksheet.set_column(3, 3, 30)
                worksheet.set_column(4, 4, 40)

                red_format = writer.book.add_format({"bg_color": "#FFC7CE", "font_color": "#9C0006"})
                worksheet.conditional_format(
                    "B2:E1000",
                    {"type": "text", "criteria": "containing", "value": "Bulunamadı", "format": red_format}
                )

            wx.CallAfter(self.result_label.AppendText, f"💾 Sonuçlar başarıyla kaydedildi: {output_path}\n")
        except Exception as e:
            wx.CallAfter(self.result_label.AppendText, f"❌ Sonuçlar Excel'e kaydedilirken hata oluştu: {str(e)}\n")

    def on_close(self, event):
        """Pencere kapatıldığında tarayıcıyı kapat."""
        if hasattr(self, 'driver_pool'):
            self.driver_pool.close()
        event.Skip()


if __name__ == "__main__":
    app = wx.App(False)
    frame = ModernISBNApp(None, "📚 APSORT")
    app.MainLoop()