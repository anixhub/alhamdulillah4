import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileSpreadsheet, Printer, FileText } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  subTab?: 'santri' | 'surat' | 'akademik' | 'kamar' | 'rombel' | 'keamanan' | string;
  title?: string;
  description?: string;
  defaultFileName?: string;
  onExportExcel: (fileName: string) => void;
  onPrintPDF: (fileName: string) => void;
}

export function ExportModal({
  isOpen,
  onClose,
  subTab = 'santri',
  title,
  description,
  defaultFileName,
  onExportExcel,
  onPrintPDF
}: ExportModalProps) {
  const initialFileName = React.useMemo(() => {
    if (defaultFileName) return defaultFileName;
    const dateStr = new Date().toISOString().split('T')[0];
    if (subTab === 'akademik') return `Data_Akademik_${dateStr}`;
    if (subTab === 'kamar') return `Data_Kamar_Santri_${dateStr}`;
    if (subTab === 'rombel') return `Data_Rombel_${dateStr}`;
    if (subTab === 'keamanan') return `Laporan_Keamanan_${dateStr}`;
    if (subTab === 'surat') return `Data_Surat_${dateStr}`;
    return `Data_Santri_${dateStr}`;
  }, [defaultFileName, subTab]);

  const [fileName, setFileName] = React.useState(initialFileName);

  React.useEffect(() => {
    if (isOpen) {
      setFileName(initialFileName);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, initialFileName]);

  const modalTitle = title || (
    subTab === 'akademik'
      ? 'Ekspor Data Akademik'
      : subTab === 'surat'
      ? 'Ekspor Data Surat'
      : subTab === 'kamar'
      ? 'Ekspor Data Kamar Santri'
      : subTab === 'rombel'
      ? 'Ekspor Data Rombel'
      : subTab === 'keamanan'
      ? 'Ekspor & Cetak Laporan Keamanan'
      : 'Ekspor Data Santri'
  );

  const modalDesc = description || (
    subTab === 'akademik'
      ? 'Pilih format dokumen yang Anda butuhkan untuk mengunduh atau mencetak laporan data akademik saat ini.'
      : subTab === 'surat'
      ? 'Pilih format dokumen yang Anda butuhkan untuk mengunduh atau mencetak arsip surat saat ini.'
      : subTab === 'kamar'
      ? 'Pilih format dokumen yang Anda butuhkan untuk mengunduh atau mencetak data kamar santri saat ini.'
      : subTab === 'rombel'
      ? 'Pilih format dokumen yang Anda butuhkan untuk mengunduh atau mencetak data rombel saat ini.'
      : subTab === 'keamanan'
      ? 'Pilih format dokumen yang Anda butuhkan untuk mengunduh atau mencetak laporan keamanan saat ini.'
      : 'Pilih format dokumen yang Anda butuhkan untuk mengunduh atau mencetak data santri aktif saat ini.'
  );

  const handleExcelClick = () => {
    const finalName = fileName.trim() || initialFileName;
    onExportExcel(finalName);
    onClose();
  };

  const handlePDFClick = () => {
    const finalName = fileName.trim() || initialFileName;
    onPrintPDF(finalName);
    onClose();
  };

  return typeof document !== 'undefined' ? createPortal(
    <AnimatePresence>
      {isOpen && (
        <div id="export-modal-dialog-container" className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            id="export-modal-backdrop"
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40" 
            onClick={onClose}
          />
          
          {/* Modal Dialog */}
          <motion.div
            id="export-modal-content"
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl z-50 text-slate-700 font-sans relative"
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 id="export-modal-title" className="font-display text-lg font-bold text-slate-950">
                {modalTitle}
              </h3>
              <button 
                id="export-modal-close-btn"
                onClick={onClose}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer border-none bg-transparent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-5">
              {modalDesc}
            </p>

            {/* Nama File Export Input */}
            <div className="mb-5 text-left">
              <label htmlFor="export-filename-input" className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                <FileText className="h-3.5 w-3.5 text-emerald-600" />
                <span>Nama File Export</span>
              </label>
              <div className="relative">
                <input
                  id="export-filename-input"
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="Masukkan nama file..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-400 transition-all focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Pilihan 1: Excel */}
              <button
                id="export-excel-btn"
                onClick={handleExcelClick}
                className="flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 group transition-all duration-200 cursor-pointer bg-white text-left outline-none"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 group-hover:scale-110 transition-transform">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-800 transition-colors text-center">Ekspor Excel</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 text-center">Format .XLS (Rapi)</p>
                </div>
              </button>

              {/* Pilihan 2: PDF / Print */}
              <button
                id="export-pdf-btn"
                onClick={handlePDFClick}
                className="flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border border-slate-200 hover:border-rose-500 hover:bg-rose-50/20 group transition-all duration-200 cursor-pointer bg-white text-left outline-none"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-700 group-hover:scale-110 transition-transform">
                  <Printer className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 group-hover:text-rose-800 transition-colors text-center">Cetak PDF</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 text-center">Format PDF / Cetak</p>
                </div>
              </button>
            </div>

            <div className="mt-5 text-[11px] text-slate-400 text-center border-t border-slate-100 pt-3">
              * Data yang diekspor disesuaikan dengan hasil pencarian &amp; filter aktif saat ini.
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  ) : null;
}
