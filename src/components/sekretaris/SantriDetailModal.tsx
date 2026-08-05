import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  User, 
  Briefcase, 
  MapPin, 
  Calendar, 
  Tag, 
  FileText, 
  Download, 
  Mars, 
  Venus, 
  CreditCard, 
  GraduationCap, 
  ShieldAlert, 
  CheckCircle, 
  Clock, 
  Award,
  BookOpen,
  Home,
  Layers,
  Eye,
  Upload,
  Trash2,
  Maximize2
} from 'lucide-react';
import { Santri, BendaharaRecord, KeamananRecord, Kamar, Kompleks, Kelas, Lembaga, KelompokRombel, RombelAssignment, KategoriRombel } from '../../types';
import { renderSantriAvatar, isCustomPasFoto, calculateRealtimeAge } from '../SekretarisHelper';
import { uploadFileToStorage, updateTableRow, getApiUrl } from '../../lib/api';
import { processUploadedFile } from '../../lib/utils';

const formatDateDMY = (dateVal?: any) => {
  if (dateVal === undefined || dateVal === null) return '-';
  const dateStr = String(dateVal).trim();
  if (!dateStr || dateStr === '-' || dateStr.toLowerCase() === 'undefined' || dateStr.toLowerCase() === 'null') return '-';
  
  try {
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      return `${match[3]}-${match[2]}-${match[1]}`;
    }
    const matchAlready = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (matchAlready) {
      return dateStr;
    }
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
  } catch (e) {
    console.error("Error formatting date:", e);
  }
  return dateStr;
};

interface SantriDetailModalProps {
  selectedSantri: Santri | null;
  onClose: () => void;
  onUpdateSantri?: (updatedSantri: Santri) => void;
  canWrite?: boolean;
}

type TabType = 'biodata' | 'pembayaran' | 'akademik' | 'keamanan';

const compressImageAndGetBase64 = (file: File, maxWidth = 800, maxHeight = 1066, quality = 0.85): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.onerror = (err) => reject(err);
      img.src = event.target?.result as string;
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

export default function SantriDetailModal({ selectedSantri, onClose, onUpdateSantri, canWrite = true }: SantriDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('biodata');
  const [localSantri, setLocalSantri] = useState<Santri | null>(selectedSantri);
  const [isUploadingPasFoto, setIsUploadingPasFoto] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState<Record<string, boolean>>({});
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [isPhotoPreviewOpen, setIsPhotoPreviewOpen] = useState(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const handleUploadDoc = async (fileKey: string, file: File) => {
    if (!localSantri) return;
    setIsUploadingDoc(prev => ({ ...prev, [fileKey]: true }));
    try {
      const { originalUrl } = await processUploadedFile(file);
      const publicUrl = await uploadFileToStorage(originalUrl, file.name, fileKey);
      
      const updated = await updateTableRow<Santri>('santri', 'smartsantri_santriList', localSantri.id, {
        [fileKey]: publicUrl
      });
      
      setLocalSantri(updated);
      onUpdateSantri?.(updated);
    } catch (err: any) {
      console.error(`Gagal mengunggah berkas ${fileKey}:`, err);
      alert("Gagal mengunggah berkas: " + err.message);
    } finally {
      setIsUploadingDoc(prev => ({ ...prev, [fileKey]: false }));
    }
  };

  React.useEffect(() => {
    if (selectedSantri) {
      setLocalSantri(selectedSantri);
    } else {
      setLocalSantri(null);
    }
  }, [selectedSantri]);

  React.useEffect(() => {
    if (selectedSantri) {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedSantri]);

  // Handle outside click or Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Query records dynamically from localStorage
  const payments: BendaharaRecord[] = useMemo(() => {
    if (!localSantri) return [];
    try {
      const local = localStorage.getItem('smartsantri_bendaharaList');
      const list: BendaharaRecord[] = local ? JSON.parse(local) : [];
      const filtered = list.filter(r => r.namaSantri.toLowerCase() === localSantri.nama.toLowerCase());
      
      // If none found, generate realistic simulated payments so the view is never empty!
      if (filtered.length === 0) {
        const months = ['Juli 2026', 'Juni 2026', 'Mei 2026', 'April 2026', 'Maret 2026'];
        return months.map((m, idx) => ({
          id: `sim-pay-${idx}`,
          namaSantri: localSantri.nama,
          kamar: localSantri.kamar || 'Kamar Umum',
          bulan: m,
          nominal: 150000,
          status: idx === 0 ? 'Belum Lunas' : 'Lunas',
          tanggalBayar: idx === 0 ? undefined : new Date(2026, 6 - idx, 5).toISOString().split('T')[0]
        }));
      }
      return filtered;
    } catch (e) {
      return [];
    }
  }, [localSantri]);

  const violations: KeamananRecord[] = useMemo(() => {
    if (!localSantri) return [];
    try {
      const local = localStorage.getItem('smartsantri_keamananList');
      const list: KeamananRecord[] = local ? JSON.parse(local) : [];
      return list.filter(r => r.namaSantri.toLowerCase() === localSantri.nama.toLowerCase());
    } catch (e) {
      return [];
    }
  }, [localSantri]);

  const activePermits = useMemo(() => {
    if (!localSantri) return [];
    try {
      const local = localStorage.getItem('smartsantri_perizinan');
      const list = local ? JSON.parse(local) : [];
      return list.filter((p: any) => p.namaSantri.toLowerCase() === localSantri.nama.toLowerCase());
    } catch (e) {
      return [];
    }
  }, [localSantri]);

  const listIzinResmi = useMemo(() => {
    return activePermits.filter((p: any) => !p.isCabut);
  }, [activePermits]);

  const listKeluarIlegal = useMemo(() => {
    return activePermits.filter((p: any) => p.isCabut);
  }, [activePermits]);

  const roomInfo = useMemo(() => {
    if (!localSantri) return null;
    try {
      const kamarLocal = localStorage.getItem('smartsantri_kamar');
      const kamarList: Kamar[] = kamarLocal ? JSON.parse(kamarLocal) : [];
      
      const kompleksLocal = localStorage.getItem('smartsantri_kompleks');
      const kompleksList: Kompleks[] = kompleksLocal ? JSON.parse(kompleksLocal) : [];

      // Find a room where the name matches the student's room name
      const room = kamarList.find(k => k.nama.toLowerCase().trim() === localSantri.kamar?.toLowerCase().trim());
      if (room) {
        const kompleks = kompleksList.find(kp => kp.id === room.kompleksId);
        return { room, kompleks };
      }
      return null;
    } catch (e) {
      console.error(e);
      return null;
    }
  }, [localSantri]);

  const studentClasses = useMemo(() => {
    if (!localSantri) return [];
    try {
      const kelasLocal = localStorage.getItem('smartsantri_kelas');
      const kelasList: Kelas[] = kelasLocal ? JSON.parse(kelasLocal) : [];

      const lembagaLocal = localStorage.getItem('smartsantri_lembagas');
      const lembagasList: Lembaga[] = lembagaLocal ? JSON.parse(lembagaLocal) : [];

      // Parse classes from localSantri.kelas (comma separated)
      const assignedClassNames = localSantri.kelas 
        ? localSantri.kelas.split(',').map(name => name.trim().toLowerCase()) 
        : [];

      // Find matching kelas records
      const matched = kelasList.filter(k => 
        assignedClassNames.includes(k.nama.toLowerCase().trim())
      ).map(k => {
        const lembaga = lembagasList.find(l => l.id === k.lembagaId);
        return {
          ...k,
          lembagaNama: lembaga ? lembaga.nama : 'Lembaga Umum',
          lembagaKode: lembaga ? lembaga.kode : 'UMUM'
        };
      });

      return matched;
    } catch (e) {
      return [];
    }
  }, [localSantri]);

  const studentRombels = useMemo(() => {
    if (!localSantri) return [];
    try {
      const assignmentsLocal = localStorage.getItem('smartsantri_rombel_assignments');
      const assignments: RombelAssignment[] = assignmentsLocal ? JSON.parse(assignmentsLocal) : [];

      const groupsLocal = localStorage.getItem('smartsantri_rombel_groups');
      const groups: KelompokRombel[] = groupsLocal ? JSON.parse(groupsLocal) : [];

      const categoriesLocal = localStorage.getItem('smartsantri_rombel_categories');
      const categories: KategoriRombel[] = categoriesLocal ? JSON.parse(categoriesLocal) : [];

      // Filter assignments for this student
      const studentAssigns = assignments.filter(a => a.santriId === localSantri.id);

      const list = studentAssigns.map(a => {
        const group = groups.find(g => g.id === a.kelompokId);
        const category = categories.find(c => c.id === a.kategoriId);
        return {
          groupId: a.kelompokId,
          groupNama: group ? group.nama : 'Kelompok Belajar',
          pembimbing: group ? group.pembimbing : 'Ustadz Pembimbing',
          categoryNama: category ? category.nama : 'Rombongan Belajar',
        };
      });

      return list;
    } catch (e) {
      return [];
    }
  }, [localSantri]);

  const academicClasses = useMemo(() => {
    if (studentClasses && studentClasses.length > 0) {
      return studentClasses.map(cls => ({
        lembaga: cls.lembagaNama ? cls.lembagaNama.toUpperCase() : 'LEMBAGA',
        kelas: cls.nama
      }));
    }
    return [];
  }, [studentClasses]);

  const academicRombels = useMemo(() => {
    if (studentRombels && studentRombels.length > 0) {
      return studentRombels.map(rom => ({
        category: rom.categoryNama || 'Rombongan Belajar',
        group: rom.groupNama
      }));
    }
    return [];
  }, [studentRombels]);

  const displayViolations = useMemo(() => {
    if (violations && violations.length > 0) {
      return violations.map(v => ({
        id: v.id,
        tanggal: v.tanggal,
        jenisPelanggaran: v.jenisPelanggaran,
        poin: v.poin
      }));
    }
    return [];
  }, [violations]);

  const displayPoints = useMemo(() => {
    if (violations && violations.length > 0) {
      return violations.reduce((sum, v) => sum + (v.poin || 0), 0);
    }
    return 0;
  }, [violations]);

  const displayCount = useMemo(() => {
    if (violations && violations.length > 0) {
      return violations.length;
    }
    return 0;
  }, [violations]);

  const displaySikapText = useMemo(() => {
    const pts = displayPoints;
    if (pts === 0) return "Sangat Baik";
    if (pts <= 15) return "Baik";
    if (pts <= 30) return "Cukup Baik";
    if (pts <= 50) return "Kurang Baik";
    return "Sanksi Berat";
  }, [displayPoints]);

  const waterLevelHeight = useMemo(() => {
    const pts = displayPoints;
    return Math.max(15, Math.min(85, 85 - (pts * 0.8)));
  }, [displayPoints]);

  const handleUploadPasFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!localSantri) return;
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsUploadingPasFoto(true);
      try {
        const base64 = await compressImageAndGetBase64(file);
        const publicUrl = await uploadFileToStorage(base64, file.name, 'filePasFoto');
        
        // Update the row in database
        const updated = await updateTableRow<Santri>('santri', 'smartsantri_santriList', localSantri.id, {
          filePasFoto: publicUrl
        });
        
        // Sync local & parent state
        setLocalSantri(updated);
        onUpdateSantri?.(updated);
      } catch (err: any) {
        console.error("Gagal mengunggah pas foto:", err);
        alert("Gagal memproses pas foto: " + err.message);
      } finally {
        setIsUploadingPasFoto(false);
      }
    }
  };

  const handleRemovePasFoto = async () => {
    if (!localSantri) return;
    if (window.confirm("Apakah Anda yakin ingin menghapus pas foto santri ini?")) {
      setIsUploadingPasFoto(true);
      try {
        // Update the row in database (set to empty string)
        const updated = await updateTableRow<Santri>('santri', 'smartsantri_santriList', localSantri.id, {
          filePasFoto: ''
        });
        
        // Sync local & parent state
        setLocalSantri(updated);
        onUpdateSantri?.(updated);
      } catch (err: any) {
        console.error("Gagal menghapus pas foto:", err);
        alert("Gagal menghapus pas foto: " + err.message);
      } finally {
        setIsUploadingPasFoto(false);
      }
    }
  };

  if (!selectedSantri || !localSantri) return null;

  // Formulate nice address string
  const getAddressStr = () => {
    if (localSantri.desa || localSantri.kecamatan || localSantri.kabupaten) {
      return [
        localSantri.desa,
        localSantri.kecamatan,
        localSantri.kabupaten,
        localSantri.provinsi
      ].filter(Boolean).join(', ');
    }
    return localSantri.asal || 'Jombang, Jawa Timur';
  };

  // Status Badge Colors mapping
  const getStatusBadgeClass = (status: string) => {
    const s = String(status || '').trim().toLowerCase();
    switch (s) {
      case 'alumni':
        return 'bg-[#e2f0d9] text-[#385723]';
      case 'aktif':
        return 'bg-[#d9f2d5] text-[#2e7d32]';
      case 'meninggal':
      case 'wafat':
        return 'bg-rose-100 text-rose-800';
      case 'sakit':
        return 'bg-amber-100 text-amber-800';
      case 'izin pulang':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-[#d9f2d5] text-[#2e7d32]'; // Default to active green
    }
  };

  const getDomisiliBadgeClass = (domisili: string) => {
    const d = String(domisili || '').trim().toLowerCase();
    return d === 'muqim' || d === 'mukim' ? 'bg-[#ffeb3b] text-slate-900' : 'bg-orange-100 text-orange-800';
  };

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-3 sm:p-4">
        {/* Backdrop click handler */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.05, ease: 'linear' }}
          className="relative flex flex-col w-full max-w-2xl h-[85vh] bg-[#e6ecea] rounded-[24px] shadow-2xl overflow-hidden border border-slate-200"
        >
          {/* Header Card (White Segment exactly like image) */}
          <div className="bg-white p-5 sm:p-6 rounded-t-[24px] border-b border-slate-200/50 shadow-xs relative shrink-0">
            {/* Elegant Top Right Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 rounded-full p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
              title="Tutup Modal"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Profile Row */}
            <div className="flex items-center gap-4 sm:gap-5">
              {/* Profile Avatar Frame (Circular exactly like image) */}
              <div 
                className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-full border border-slate-200 shrink-0 shadow-inner bg-slate-50 flex items-center justify-center ${
                  isCustomPasFoto(localSantri.filePasFoto) ? 'cursor-pointer group hover:ring-4 hover:ring-indigo-300 transition-all' : ''
                }`}
                onClick={() => {
                  if (isCustomPasFoto(localSantri.filePasFoto)) {
                    setIsPhotoPreviewOpen(true);
                  }
                }}
                title={isCustomPasFoto(localSantri.filePasFoto) ? "Klik untuk preview fullscreen pas foto" : "Belum ada pas foto"}
              >
                <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                  {renderSantriAvatar(localSantri, "w-full h-full object-cover", false, false)}
                </div>
                {isCustomPasFoto(localSantri.filePasFoto) && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center text-white">
                    <Maximize2 className="w-6 h-6" />
                  </div>
                )}
                {(() => {
                  const age = calculateRealtimeAge(localSantri.tanggalLahir);
                  if (age === null || age === undefined) return null;
                  return (
                    <span className="absolute bottom-0 left-0 bg-slate-900/85 text-white font-extrabold text-[10px] sm:text-xs px-2 py-0.5 rounded-full border-2 border-white shadow-md z-10 flex items-center justify-center whitespace-nowrap">
                      {age} Thn
                    </span>
                  );
                })()}
              </div>

              {/* Badges, Name, Details */}
              <div className="flex-1 min-w-0">
                {/* Badges Row */}
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  {(() => {
                    const statusKeanggotaan = localSantri.statusKeanggotaan || (localSantri as any).status || 'Aktif';
                    const isAktif = String(statusKeanggotaan).trim().toLowerCase() === 'aktif';
                    
                    return (
                      <>
                        <span className={`text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider ${getStatusBadgeClass(statusKeanggotaan)}`}>
                          {statusKeanggotaan}
                        </span>
                        {isAktif && (
                          <span className={`text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider ${getDomisiliBadgeClass(localSantri.statusDomisili || 'Muqim')}`}>
                            {localSantri.statusDomisili || 'Muqim'}
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* Name */}
                <h2 className="font-display text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-tight truncate">
                  {localSantri.nama}
                </h2>

                {/* NIS & Address */}
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-1 truncate flex items-center gap-2">
                  <span className="font-mono text-slate-700 font-extrabold bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{localSantri.nis}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-600 truncate">{getAddressStr()}</span>
                </p>
              </div>
            </div>

            {/* Pills Tabs Container (Exactly matching image layout) */}
            <div className="grid grid-cols-4 gap-1.5 sm:gap-3 mt-6">
              {[
                { id: 'biodata', label: 'Biodata' },
                { id: 'pembayaran', label: 'Pembayaran' },
                { id: 'akademik', label: 'Akademik' },
                { id: 'keamanan', label: 'Keamanan' },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`py-2 px-1 text-center text-xs sm:text-sm rounded-full font-bold transition-all ${
                      isActive 
                        ? 'bg-[#39e75f] text-slate-900 shadow-xs' 
                        : 'bg-[#e2e8f0] text-slate-700 hover:bg-slate-300/80'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lower Content Viewport with custom minty/gray background */}
          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto bg-[#e6ecea] p-4 sm:p-5 space-y-4"
          >
            {activeTab === 'biodata' && (
              <div className="space-y-4 animate-fadeIn">
                {/* 1. Identitas Pokok Card */}
                <div className="bg-[#eefcd2] p-4 rounded-[24px] border border-[#d3e9a5] shadow-xs space-y-3">
                  <h4 className="text-center font-black text-slate-800 text-sm tracking-wide">
                    Identitas Pokok Santri
                  </h4>
                  <div className="space-y-2">
                    {/* Baris 1: NIK & No KK (2 Kolom) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="bg-white px-3.5 py-2.5 rounded-2xl shadow-xs border border-slate-100 flex items-center justify-between gap-2">
                        <span className="font-extrabold text-slate-500">NIK Santri</span>
                        <span className="bg-[#ffe4a0] text-slate-900 font-extrabold px-2.5 py-1 rounded-full text-center truncate">
                          {localSantri.nik || '-'}
                        </span>
                      </div>
                      <div className="bg-white px-3.5 py-2.5 rounded-2xl shadow-xs border border-slate-100 flex items-center justify-between gap-2">
                        <span className="font-extrabold text-slate-500">No. Kartu Keluarga</span>
                        <span className="bg-[#ffe4a0] text-slate-900 font-extrabold px-2.5 py-1 rounded-full text-center truncate">
                          {localSantri.noKk || '-'}
                        </span>
                      </div>
                    </div>

                    {/* Baris 2: Tempat, Tgl Lahir & Gender (2 Kolom) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="bg-white px-3.5 py-2.5 rounded-2xl shadow-xs border border-slate-100 flex items-center justify-between gap-2">
                        <span className="font-extrabold text-slate-500">Tempat, Tgl Lahir</span>
                        <span className="bg-[#ffe4a0] text-slate-900 font-extrabold px-2.5 py-1 rounded-full text-center truncate max-w-[180px]">
                          {`${localSantri.tempatLahir || '-'}${localSantri.tanggalLahir ? `, ${formatDateDMY(localSantri.tanggalLahir)}` : ''}`}
                        </span>
                      </div>
                      <div className="bg-white px-3.5 py-2.5 rounded-2xl shadow-xs border border-slate-100 flex items-center justify-between gap-2">
                        <span className="font-extrabold text-slate-500">Jenis Kelamin</span>
                        <span className="bg-[#ffe4a0] text-slate-900 font-extrabold px-2.5 py-1 rounded-full text-center truncate">
                          {localSantri.gender || '-'}
                        </span>
                      </div>
                    </div>

                    {/* Baris 3: Anak Ke & Jumlah Saudara (2 Kolom) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="bg-white px-3.5 py-2.5 rounded-2xl shadow-xs border border-slate-100 flex items-center justify-between gap-2">
                        <span className="font-extrabold text-slate-500">Anak Ke</span>
                        <span className="bg-[#ffe4a0] text-slate-900 font-extrabold px-2.5 py-1 rounded-full text-center truncate">
                          {localSantri.anakKe || '-'}
                        </span>
                      </div>
                      <div className="bg-white px-3.5 py-2.5 rounded-2xl shadow-xs border border-slate-100 flex items-center justify-between gap-2">
                        <span className="font-extrabold text-slate-500">Jumlah Saudara</span>
                        <span className="bg-[#ffe4a0] text-slate-900 font-extrabold px-2.5 py-1 rounded-full text-center truncate">
                          {localSantri.dariBersaudara !== undefined ? localSantri.dariBersaudara : '-'}
                        </span>
                      </div>
                    </div>

                    {/* Baris 4: Tanggal Masuk & Tanggal Keluar (2 Kolom) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="bg-white px-3.5 py-2.5 rounded-2xl shadow-xs border border-slate-100 flex items-center justify-between gap-2">
                        <span className="font-extrabold text-slate-500">Tanggal Masuk</span>
                        <span className="bg-[#ffe4a0] text-slate-900 font-extrabold px-2.5 py-1 rounded-full text-center truncate">
                          {formatDateDMY(localSantri.tanggalMasuk)}
                        </span>
                      </div>
                      <div className="bg-white px-3.5 py-2.5 rounded-2xl shadow-xs border border-slate-100 flex items-center justify-between gap-2">
                        <span className="font-extrabold text-slate-500">Tanggal Keluar</span>
                        <span className="bg-[#ffe4a0] text-slate-900 font-extrabold px-2.5 py-1 rounded-full text-center truncate">
                          {formatDateDMY(localSantri.tanggalKeluar)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Orang Tua & Kewalian Card (2 Kolom Kiri Ayah, Kanan Ibu) */}
                <div className="bg-[#eefcd2] p-4 rounded-[24px] border border-[#d3e9a5] shadow-xs">
                  <h4 className="text-center font-black text-slate-800 text-sm mb-4 tracking-wide">
                    Kewalian & Orang Tua
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Column 1: Ayah */}
                    <div className="bg-white/80 p-3.5 rounded-2xl border border-slate-100/80 space-y-2">
                      <p className="font-extrabold text-xs text-emerald-900 border-b border-slate-100 pb-1 mb-2">
                        Data Ayah Kandung
                      </p>
                      {[
                        { label: 'Nama Ayah', val: localSantri.namaAyah || '-' },
                        { label: 'NIK Ayah', val: localSantri.nikAyah || '-' },
                        { label: 'Pekerjaan', val: localSantri.pekerjaanAyah || '-' },
                        { label: 'Pendidikan', val: localSantri.pendidikanAyah || '-' },
                      ].map((item, idx) => (
                        <div key={idx} className="bg-white px-3 py-2 rounded-xl shadow-2xs border border-slate-100 flex items-center justify-between gap-2 text-xs">
                          <span className="font-bold text-slate-500">{item.label}</span>
                          <span className="bg-[#ffe4a0] text-slate-900 font-extrabold px-2 py-0.5 rounded-md text-right truncate max-w-[140px]">
                            {item.val}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Column 2: Ibu */}
                    <div className="bg-white/80 p-3.5 rounded-2xl border border-slate-100/80 space-y-2">
                      <p className="font-extrabold text-xs text-emerald-900 border-b border-slate-100 pb-1 mb-2">
                        Data Ibu Kandung
                      </p>
                      {[
                        { label: 'Nama Ibu', val: localSantri.namaIbu || '-' },
                        { label: 'NIK Ibu', val: localSantri.nikIbu || '-' },
                        { label: 'Pekerjaan', val: localSantri.pekerjaanIbu || '-' },
                        { label: 'Pendidikan', val: localSantri.pendidikanIbu || '-' },
                      ].map((item, idx) => (
                        <div key={idx} className="bg-white px-3 py-2 rounded-xl shadow-2xs border border-slate-100 flex items-center justify-between gap-2 text-xs">
                          <span className="font-bold text-slate-500">{item.label}</span>
                          <span className="bg-[#ffe4a0] text-slate-900 font-extrabold px-2 py-0.5 rounded-md text-right truncate max-w-[140px]">
                            {item.val}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. Alamat & Kontak Card (2 Kolom Kiri Alamat, Kanan Kontak/Wali) */}
                <div className="bg-[#eefcd2] p-4 rounded-[24px] border border-[#d3e9a5] shadow-xs">
                  <h4 className="text-center font-black text-slate-800 text-sm mb-4 tracking-wide">
                    Alamat & Kontak
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Column 1: Detail Alamat */}
                    <div className="bg-white/80 p-3.5 rounded-2xl border border-slate-100/80 space-y-2">
                      <p className="font-extrabold text-xs text-emerald-900 border-b border-slate-100 pb-1 mb-2">
                        Alamat Domisili Asal
                      </p>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-100 mb-2">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Alamat Lengkap</span>
                        <span className="font-bold text-slate-800 text-xs block mt-0.5">{localSantri.alamat || '-'}</span>
                      </div>
                      {[
                        { label: 'RT / RW', val: `RT ${localSantri.rt || '-'} / RW ${localSantri.rw || '-'}` },
                        { label: 'Desa / Kec', val: `${localSantri.desa || '-'}${localSantri.kecamatan ? `, ${localSantri.kecamatan}` : ''}` },
                        { label: 'Kab / Prov', val: `${localSantri.kabupaten || '-'}${localSantri.provinsi ? `, ${localSantri.provinsi}` : ''}` },
                      ].map((item, idx) => (
                        <div key={idx} className="bg-white px-3 py-2 rounded-xl shadow-2xs border border-slate-100 flex items-center justify-between gap-2 text-xs">
                          <span className="font-bold text-slate-500">{item.label}</span>
                          <span className="bg-[#ffe4a0] text-slate-900 font-extrabold px-2 py-0.5 rounded-md text-right truncate max-w-[140px]">
                            {item.val}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Column 2: Kontak & Wali */}
                    <div className="bg-white/80 p-3.5 rounded-2xl border border-slate-100/80 space-y-2">
                      <p className="font-extrabold text-xs text-emerald-900 border-b border-slate-100 pb-1 mb-2">
                        Kontak & Wali
                      </p>
                      {[
                        { label: 'No. HP Wali', val: localSantri.noHp || '-' },
                        { label: 'Nama Wali', val: localSantri.namaWali || '-' },
                        { label: 'Hubungan Wali', val: localSantri.hubunganWali || '-' },
                        { label: 'Jarak Rumah', val: localSantri.jarakRumah && localSantri.jarakRumah !== 0 ? `${localSantri.jarakRumah} km` : '-' },
                      ].map((item, idx) => (
                        <div key={idx} className="bg-white px-3 py-2 rounded-xl shadow-2xs border border-slate-100 flex items-center justify-between gap-2 text-xs">
                          <span className="font-bold text-slate-500">{item.label}</span>
                          <span className="bg-[#ffe4a0] text-slate-900 font-extrabold px-2 py-0.5 rounded-md text-right truncate max-w-[140px]">
                            {item.val}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 4. Informasi Kamar & Kompleks Asrama Card (Sembunyi jika Alumni / Meninggal / Wafat / Boyong / Keluar) */}
                {(() => {
                  const statusStr = String(localSantri.statusKeanggotaan || (localSantri as any).status || '').trim().toLowerCase();
                  const isAlumni = ['alumni', 'meninggal', 'wafat', 'boyong', 'keluar', 'drop out'].includes(statusStr);
                  if (isAlumni) return null;

                  return (
                    <div className="bg-[#eefcd2] p-4 rounded-[24px] border border-[#d3e9a5] shadow-xs">
                      <h4 className="text-center font-black text-slate-800 text-sm mb-4 tracking-wide">
                        Informasi Kamar & Kompleks Asrama
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="bg-white px-4 py-2.5 rounded-full shadow-xs border border-slate-100 flex items-center justify-between gap-3">
                          <span className="font-extrabold text-slate-500 tracking-wide truncate">Kompleks Asrama</span>
                          <span className="bg-[#ffe4a0] text-slate-800 font-extrabold px-3 py-1 rounded-full shrink-0 max-w-[200px] text-center truncate">
                            {roomInfo?.kompleks?.nama || '-'}
                          </span>
                        </div>
                        <div className="bg-white px-4 py-2.5 rounded-full shadow-xs border border-slate-100 flex items-center justify-between gap-3">
                          <span className="font-extrabold text-slate-500 tracking-wide truncate">Nama Kamar</span>
                          <span className="bg-[#ffe4a0] text-slate-800 font-extrabold px-3 py-1 rounded-full shrink-0 max-w-[200px] text-center truncate">
                            {localSantri.kamar || 'Belum Ditentukan'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 5. Kelengkapan Berkas Administrasi Card */}
                <div className="bg-slate-50/70 p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="font-extrabold text-slate-800 text-sm tracking-wide flex items-center gap-2">
                      <FileText className="h-4 w-4 text-emerald-600" />
                      Kelengkapan Berkas Administrasi
                    </h4>
                    <span className="text-[11px] font-semibold text-slate-500">5 Dokumen Utuh</span>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {[
                      { label: 'Kartu Keluarga (KK)', key: 'fileKk', url: localSantri.fileKk, icon: FileText, defaultName: 'kartu_keluarga.pdf', accept: '.pdf,image/*' },
                      { label: 'KTP Orang Tua', key: 'fileKtp', url: localSantri.fileKtp, icon: User, defaultName: 'ktp_orang_tua.pdf', accept: '.pdf,image/*' },
                      { label: 'Akta Kelahiran', key: 'fileAkta', url: localSantri.fileAkta, icon: FileText, defaultName: 'akta_kelahiran.pdf', accept: '.pdf,image/*' },
                      { label: 'Ijazah Terakhir', key: 'fileIjazah', url: localSantri.fileIjazah, icon: GraduationCap, defaultName: 'ijazah_terakhir.pdf', accept: '.pdf,image/*' },
                      { label: 'Pas Foto Santri (3x4)', key: 'filePasFoto', url: isCustomPasFoto(localSantri.filePasFoto) ? localSantri.filePasFoto : '', icon: User, defaultName: 'pas_foto_resmi.jpg', accept: 'image/*' },
                    ].map((file, i) => {
                      const isUploaded = Boolean(file.url);
                      const isBusy = isUploadingDoc[file.key];

                      return (
                        <div key={i} className="flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-slate-50 border border-slate-200/70 flex items-center justify-center shrink-0 text-slate-600">
                              <file.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs sm:text-sm font-bold text-slate-900 block truncate leading-tight">
                                {file.label}
                              </span>
                              <span className="text-[11px] text-slate-400 font-medium truncate block mt-0.5">
                                {isUploaded ? (
                                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3 inline" />
                                    Tersedia ({file.defaultName})
                                  </span>
                                ) : (
                                  'Belum diunggah'
                                )}
                              </span>
                            </div>
                          </div>

                          {isUploaded ? (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => setPreviewPhotoUrl(getApiUrl(file.url!))}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer border-none"
                                title="Pratinjau Berkas"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Lihat</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (file.url) {
                                    const link = document.createElement('a');
                                    link.href = getApiUrl(file.url);
                                    link.download = file.defaultName;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                  }
                                }}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer border-none"
                                title="Unduh Berkas"
                              >
                                <Download className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Unduh</span>
                              </button>
                            </div>
                          ) : (
                            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold shadow-2xs hover:shadow-xs transition-all active:scale-95 shrink-0">
                              {isBusy ? (
                                <>
                                  <div className="h-3 w-3 border-2 border-slate-700 border-t-transparent rounded-full animate-spin"></div>
                                  <span>Uploading...</span>
                                </>
                              ) : (
                                <>
                                  <Upload className="h-3.5 w-3.5 text-slate-600" />
                                  <span>Upload</span>
                                </>
                              )}
                              <input
                                type="file"
                                accept={file.accept}
                                className="hidden"
                                disabled={isBusy}
                                onClick={(e) => {
                                  (e.target as HTMLInputElement).value = '';
                                }}
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleUploadDoc(file.key, e.target.files[0]);
                                  }
                                }}
                              />
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Pembayaran */}
            {activeTab === 'pembayaran' && (
              <div className="space-y-4 animate-fadeIn flex flex-col items-center justify-center min-h-[300px]">
                <div className="bg-[#eefcd2] p-8 rounded-[24px] border border-[#d3e9a5] shadow-xs text-center max-w-md mx-auto space-y-4">
                  <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto border border-amber-200">
                    <Clock className="h-8 w-8 text-amber-600 animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-black text-slate-800 text-sm tracking-wide">
                      Sedang Dalam Pengembangan
                    </h4>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      Modul Keuangan dan Pembayaran Syahriah (SPP) saat ini sedang disinkronisasikan dengan sistem bendahara pusat pesantren.
                    </p>
                  </div>
                  <div className="bg-white/85 px-4 py-2 rounded-full border border-slate-100 inline-block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest shadow-xs">
                    Nantikan Pembaruan Selanjutnya!
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Akademik */}
            {activeTab === 'akademik' && (
              <div className="space-y-4 animate-fadeIn">
                {/* 1. Kelas Card */}
                <div className="bg-[#eefcd2] p-4 rounded-[24px] border border-[#d3e9a5] shadow-xs">
                  <h4 className="text-center font-black text-slate-800 text-sm mb-4 tracking-wide">
                    Kelas
                  </h4>
                  <div className="space-y-2">
                    {academicClasses.length > 0 ? (
                      academicClasses.map((cls, idx) => (
                        <div 
                          key={idx} 
                          className="bg-white px-4 py-2.5 rounded-full shadow-xs border border-slate-100 flex items-center justify-between gap-3 text-xs"
                        >
                          <span className="font-extrabold text-slate-800 uppercase tracking-wide truncate">
                            {cls.lembaga}
                          </span>
                          <span className="bg-[#ffe4a0] text-slate-800 font-extrabold px-4 py-1 rounded-full shrink-0 min-w-[100px] text-center">
                            {cls.kelas}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-xs text-slate-500 font-medium bg-white rounded-full border border-slate-100">
                        Belum terdaftar di kelas mana pun
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Rombongan Belajar Card */}
                <div className="bg-[#eefcd2] p-4 rounded-[24px] border border-[#d3e9a5] shadow-xs">
                  <h4 className="text-center font-black text-slate-800 text-sm mb-4 tracking-wide">
                    Rombongan Belajar
                  </h4>
                  <div className="space-y-2">
                    {academicRombels.length > 0 ? (
                      academicRombels.map((rom, idx) => (
                        <div 
                          key={idx} 
                          className="bg-white px-4 py-2.5 rounded-full shadow-xs border border-slate-100 flex items-center justify-between gap-3 text-xs"
                        >
                          <span className="font-extrabold text-slate-800 truncate">
                            {rom.category}
                          </span>
                          <span className="bg-[#ffe4a0] text-slate-800 font-extrabold px-4 py-1 rounded-full shrink-0 min-w-[100px] text-center">
                            {rom.group}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-xs text-slate-500 font-medium bg-white rounded-full border border-slate-100">
                        Belum terdaftar di rombongan belajar mana pun
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Dokumen & Riwayat Pendidikan Card */}
                <div className="bg-[#eefcd2] p-4 rounded-[24px] border border-[#d3e9a5] shadow-xs">
                  <h4 className="text-center font-black text-slate-800 text-sm mb-4 tracking-wide">
                    Dokumen & Riwayat Pendidikan
                  </h4>
                  <div className="space-y-2">
                    {[
                      { label: 'NISN', val: localSantri.nisn || '-' },
                      { label: 'NISM', val: localSantri.nism || '-' },
                      { label: 'Pendidikan Terakhir', val: localSantri.pendidikanTerakhir || '-' },
                    ].map((item, idx) => (
                      <div 
                        key={idx} 
                        className="bg-white px-4 py-2.5 rounded-full shadow-xs border border-slate-100 flex items-center justify-between gap-3 text-xs"
                      >
                        <span className="font-extrabold text-slate-500 tracking-wide truncate">
                          {item.label}
                        </span>
                        <span className="bg-[#ffe4a0] text-slate-800 font-extrabold px-3 py-1 rounded-full shrink-0 max-w-[220px] text-center truncate">
                          {item.val}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Keamanan */}
            {activeTab === 'keamanan' && (
              <div className="space-y-4 animate-fadeIn">
                {/* 2-Column top section */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Left Column Card: Poin Pelanggaran */}
                  <div className="bg-white p-5 rounded-[24px] border border-slate-200/50 shadow-xs flex flex-col items-center justify-center min-h-[160px]">
                    <div className="bg-[#ffebee] text-[#e0533c] font-black text-xs px-4 py-1.5 rounded-full mb-3 text-center tracking-wide">
                      Poin Pelanggaran
                    </div>
                    <div className="text-5xl font-black text-[#e0533c] tracking-tight my-1.5">
                      {displayPoints}
                    </div>
                    <div className="text-xs font-extrabold text-slate-800">
                      {displayCount} Pelanggaran
                    </div>
                  </div>

                  {/* Right Column Card: Keluar Pondok */}
                  <div className="bg-white p-5 rounded-[24px] border border-slate-200/50 shadow-xs flex flex-col items-center justify-center min-h-[160px]">
                    <div className="bg-[#e0f2fe] text-[#0284c7] font-black text-xs px-4 py-1.5 rounded-full mb-3 text-center tracking-wide uppercase">
                      Total Keluar Pondok
                    </div>
                    <div className="text-5xl font-black text-[#0284c7] tracking-tight my-1.5">
                      {activePermits.length}
                    </div>
                    <div className="text-xs font-extrabold text-slate-500 flex flex-col items-center gap-0.5 text-center mt-1">
                      <span className="text-blue-600 font-extrabold">{listIzinResmi.length}x Izin Resmi</span>
                      <span className="text-rose-600 font-extrabold">{listKeluarIlegal.length}x Ilegal</span>
                    </div>
                  </div>
                </div>

                {/* Bottom List: Riwayat Pelanggaran */}
                <div className="bg-[#eefcd2] p-4 rounded-[24px] border border-[#d3e9a5] shadow-xs">
                  <h4 className="text-center font-black text-slate-800 text-sm mb-4 tracking-wide">
                    Riwayat Pelanggaran
                  </h4>
                  <div className="space-y-2">
                    {displayViolations.length > 0 ? (
                      displayViolations.map((v, idx) => (
                        <div 
                          key={`violation-${v.id || ''}-${idx}`} 
                          className="bg-white px-4 py-2.5 rounded-full shadow-xs border border-slate-100 flex items-center justify-between gap-3 text-xs"
                        >
                          <span className="text-slate-400 font-mono font-medium shrink-0">
                            {v.tanggal}
                          </span>
                          <span className="font-extrabold text-slate-800 flex-1 truncate text-center">
                            {v.jenisPelanggaran}
                          </span>
                          <button 
                            className="text-slate-600 hover:text-slate-900 p-1 shrink-0 transition-colors"
                            title="Lihat Detail"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-xs text-emerald-800 font-medium bg-white rounded-full border border-slate-100">
                        Tidak ada riwayat pelanggaran (Santri Berperilaku Baik)
                      </div>
                    )}
                  </div>
                </div>

                {/* Riwayat Perizinan Resmi Card */}
                <div className="bg-[#e0f2fe]/50 p-4 rounded-[24px] border border-[#bae6fd] shadow-xs">
                  <h4 className="text-center font-black text-slate-800 text-sm mb-4 tracking-wide text-blue-900">
                    Riwayat Perizinan Resmi
                  </h4>
                  <div className="space-y-2">
                    {listIzinResmi.length > 0 ? (
                      listIzinResmi.map((p, idx) => (
                        <div 
                          key={`resmi-${p.id || ''}-${idx}`} 
                          className="bg-white px-4 py-3 rounded-2xl shadow-xs border border-slate-100/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="bg-blue-50 text-blue-700 font-extrabold px-2.5 py-1 rounded-lg text-[10px] uppercase">
                              {p.jenisIzin}
                            </span>
                            <span className="text-slate-500 font-mono font-medium">
                              {p.tanggalMulai} s.d {p.tanggalSelesai}
                            </span>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-3 flex-1 min-w-0">
                            <span className="font-semibold text-slate-700 truncate" title={p.keterangan}>
                              Ket: {p.keterangan || '-'}
                            </span>
                            <span className={`font-black shrink-0 px-2.5 py-0.5 rounded-full text-[10px] ${
                              p.status === 'Izin Aktif' ? 'bg-amber-100 text-amber-800' :
                              p.status === 'Sudah Kembali' ? 'bg-green-100 text-green-800' :
                              'bg-slate-100 text-slate-800'
                            }`}>
                              {p.status}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-xs text-blue-800 font-medium bg-white rounded-full border border-slate-100">
                        Tidak ada riwayat perizinan resmi
                      </div>
                    )}
                  </div>
                </div>

                {/* Riwayat Keluar Ilegal Card */}
                <div className="bg-[#ffe4e6]/50 p-4 rounded-[24px] border border-[#fecdd3] shadow-xs">
                  <h4 className="text-center font-black text-slate-800 text-sm mb-4 tracking-wide text-rose-800">
                    Riwayat Keluar Ilegal
                  </h4>
                  <div className="space-y-2">
                    {listKeluarIlegal.length > 0 ? (
                      listKeluarIlegal.map((p, idx) => (
                        <div 
                          key={`ilegal-${p.id || ''}-${idx}`} 
                          className="bg-white px-4 py-3 rounded-2xl shadow-xs border border-slate-100/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="bg-rose-50 text-rose-700 font-extrabold px-2.5 py-1 rounded-lg text-[10px] uppercase">
                              Ilegal
                            </span>
                            <span className="text-slate-500 font-mono font-medium">
                              Waktu: {p.tanggalMulai}
                            </span>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-3 flex-1 min-w-0">
                            <span className="font-semibold text-slate-700 truncate" title={p.keterangan}>
                              Kronologi: {p.keterangan || '-'}
                            </span>
                            <span className="font-black shrink-0 px-2.5 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-800">
                              {p.status || 'Keluar Ilegal'}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-xs text-rose-800 font-medium bg-white rounded-full border border-slate-100">
                        Alhamdulillah, tidak ada riwayat keluar ilegal
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer close action */}
          <div className="border-t border-slate-200/50 bg-white px-5 py-3 sm:px-6 sm:py-4 flex justify-between items-center shrink-0">
            <span className="text-[10px] text-slate-400 font-mono">ID Santri: {localSantri.id}</span>
            <button
              onClick={onClose}
              className="rounded-full bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-all shadow-xs"
            >
              Tutup Detail
            </button>
          </div>
        </motion.div>
      </div>

      {/* Photo & Document Preview Overlay */}
      <AnimatePresence>
        {previewPhotoUrl && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4">
            <div className="absolute inset-0" onClick={() => setPreviewPhotoUrl(null)} />
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              transition={{ duration: 0.05, ease: 'linear' }}
              className="relative max-w-lg w-full bg-white p-5 rounded-3xl shadow-2xl border border-slate-100 z-10 flex flex-col items-center"
            >
              <button
                onClick={() => setPreviewPhotoUrl(null)}
                className="absolute top-3 right-3 bg-slate-100 hover:bg-slate-200 text-slate-700 p-1.5 rounded-full transition-colors cursor-pointer"
                title="Tutup Pratinjau"
              >
                <X className="h-4 w-4" />
              </button>
              <h3 className="text-sm font-extrabold text-slate-800 mb-3 uppercase tracking-wide flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-600" />
                Pratinjau Berkas
              </h3>
              
              <div className="w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center min-h-[200px] max-h-[60vh] p-2">
                {previewPhotoUrl.startsWith('data:application/pdf') || previewPhotoUrl.endsWith('.pdf') ? (
                  <iframe 
                    src={previewPhotoUrl} 
                    className="w-full h-[350px] rounded-xl border-none" 
                    title="Pratinjau PDF"
                  />
                ) : (
                  <img 
                    src={previewPhotoUrl} 
                    className="max-h-[350px] w-auto max-w-full object-contain rounded-xl shadow-xs" 
                    alt="Pratinjau Berkas" 
                    referrerPolicy="no-referrer" 
                  />
                )}
              </div>

              <div className="flex items-center gap-3 mt-4 w-full justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = previewPhotoUrl;
                    link.download = 'berkas_santri';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="h-4 w-4" />
                  <span>Unduh Berkas</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewPhotoUrl(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fullscreen Photo Preview Modal */}
      <AnimatePresence>
        {isPhotoPreviewOpen && isCustomPasFoto(localSantri.filePasFoto) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-8 select-none"
            onClick={() => setIsPhotoPreviewOpen(false)}
          >
            {/* Top Control Bar */}
            <div 
              className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-3 z-10"
              onClick={e => e.stopPropagation()}
            >
              <a
                href={getApiUrl(localSantri.filePasFoto!)}
                download={`pas_foto_${localSantri.nama || 'santri'}.jpg`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-white/20 cursor-pointer shadow-lg"
                title="Unduh Gambar"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Unduh</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Apakah Anda yakin ingin menghapus pas foto santri ini?")) {
                    handleRemovePasFoto();
                    setIsPhotoPreviewOpen(false);
                  }
                }}
                className="flex items-center gap-2 bg-rose-500/85 hover:bg-rose-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-rose-400/30 cursor-pointer shadow-lg"
                title="Hapus Gambar"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Hapus</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPhotoPreviewOpen(false)}
                className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/20 cursor-pointer shadow-lg"
                title="Tutup Preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Centered Image Container */}
            <div 
              className="relative max-w-4xl max-h-[80vh] flex flex-col items-center justify-center"
              onClick={e => e.stopPropagation()}
            >
              <img
                src={getApiUrl(localSantri.filePasFoto!)}
                alt={localSantri.nama}
                className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl border border-white/10"
                referrerPolicy="no-referrer"
              />
              <div className="mt-4 text-center">
                <h3 className="text-white font-bold text-base sm:text-lg">{localSantri.nama}</h3>
                <p className="text-white/70 text-xs mt-0.5">NIS: {localSantri.nis || '-'}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
