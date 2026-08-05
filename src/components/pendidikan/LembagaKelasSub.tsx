import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  School, Plus, Trash2, Edit, Users, BookOpen, ChevronRight, ChevronLeft,
  ArrowLeft, Search, GraduationCap, ArrowLeftRight, Check, CheckCircle2, CheckSquare, 
  UserCheck, AlertCircle, X, MoreVertical, Award, ShieldAlert, UserMinus, ArrowRightLeft,
  Folder, FolderOpen, User, ArrowUpDown, Pencil, Settings, UserPlus, ArrowUp, ArrowDown,
  ChevronDown, ChevronsUpDown, Printer, Sparkles, Home, Loader2, Upload
} from 'lucide-react';
import { Lembaga, Kelas, Santri, KategoriRombel, KelompokRombel, RombelAssignment, isDefaultClass, isEmisTerdaftar, getClsLembagaId, isGenderMatch } from '../../types';
import { demoteSantriToCalonPesertaDidik, compressImage, parseCatatanInvalid, formatCatatanWithInvalid } from '../../lib/utils';
import { uploadFileToStorage, getApiUrl } from '../../lib/api';
import SantriDetailModal from '../sekretaris/SantriDetailModal';
import { PUTRA_AVATAR, PUTRI_AVATAR, renderSantriAvatar, calculateRealtimeAge, getPesantrenProfile } from '../SekretarisHelper';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

interface LembagaKelasSubProps {
  lembagasList: Lembaga[];
  kelasList: Kelas[];
  santriList: Santri[];
  onAddLembaga: (newLem: Lembaga) => any;
  onUpdateLembaga: (upLem: Lembaga) => any;
  onDeleteLembaga: (id: string) => any;
  onAddKelas: (newKel: Kelas) => any;
  onUpdateKelas: (upKel: Kelas) => any;
  onDeleteKelas: (id: string) => any;
  onUpdateSantriClass: (santriId: string, classText: string, lembagaId?: string) => void;
  onUpdateSantriClassBatch?: (santriIds: string[], targetClassName: string, lembagaId?: string) => void;
  onUpdateSantri?: (s: Santri) => any;
  genderFilter?: 'Putra' | 'Putri';
  canViewPutra?: boolean;
  canViewPutri?: boolean;
  canWritePutra?: boolean;
  canWritePutri?: boolean;
  
  initialTab?: 'Formal' | 'Internal' | 'Rombel';
  onTabChange?: (tab: 'Formal' | 'Internal' | 'Rombel') => void;

  // Rombel props
  categoriesList?: KategoriRombel[];
  groupsList?: KelompokRombel[];
  assignmentsList?: RombelAssignment[];
  onAddCategory?: (cat: KategoriRombel) => any;
  onUpdateCategory?: (cat: KategoriRombel) => any;
  onDeleteCategory?: (id: string) => any;
  onAddGroup?: (grp: KelompokRombel) => any;
  onUpdateGroup?: (grp: KelompokRombel) => any;
  onDeleteGroup?: (id: string) => any;
  onAddAssignment?: (newAss: RombelAssignment) => any;
  onRemoveAssignment?: (santriId: string, kelompokId: string) => any;
  onResetAllClasses?: () => any;
}

const getLogoUrl = (url?: string): string => {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  return getApiUrl(trimmed.startsWith('/') ? trimmed : `/${trimmed}`);
};

export default function LembagaKelasSub({
  lembagasList,
  kelasList,
  santriList,
  onAddLembaga,
  onUpdateLembaga,
  onDeleteLembaga,
  onAddKelas,
  onUpdateKelas,
  onDeleteKelas,
  onUpdateSantriClass,
  onUpdateSantriClassBatch,
  onUpdateSantri,
  genderFilter = 'Putra',
  canViewPutra = true,
  canViewPutri = true,
  canWritePutra = true,
  canWritePutri = true,
  
  initialTab = 'Internal',
  onTabChange,
  
  // Rombel Props
  categoriesList = [],
  groupsList = [],
  assignmentsList = [],
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onAddGroup,
  onUpdateGroup,
  onDeleteGroup,
  onAddAssignment,
  onRemoveAssignment,
  onResetAllClasses
}: LembagaKelasSubProps) {

  // --- Core State ---
  const [selectedGender, setSelectedGender] = useState<'Putra' | 'Putri'>(genderFilter);
  const [activeTab, setActiveTab] = useState<'Formal' | 'Internal' | 'Rombel'>(initialTab || 'Formal');
  
  // selectedLembaga can represent either a real Lembaga (Formal/Internal) or a KategoriRombel (Rombel)
  const [selectedLembaga, setSelectedLembaga] = useState<any | null>(null);
  const [selectedKelas, setSelectedKelas] = useState<any | null>(null);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Semua');
  const [activeActionStudentId, setActiveActionStudentId] = useState<string | null>(null);
  const [activeEmisDropdownId, setActiveEmisDropdownId] = useState<string | null>(null);
  const [activeVervalDropdownId, setActiveVervalDropdownId] = useState<string | null>(null);
  const [emisDropdownPos, setEmisDropdownPos] = useState<{ top: number; left: number; isUpward?: boolean } | null>(null);
  const [vervalDropdownPos, setVervalDropdownPos] = useState<{ top: number; left: number; isUpward?: boolean } | null>(null);
  const [pendingEmis, setPendingEmis] = useState<{ [santriId: string]: 'Terdaftar' | 'Belum' | 'Invalid' }>({});
  const [pendingVerval, setPendingVerval] = useState<{ [santriId: string]: 'Sukses' | 'Proses' }>({});
  const [activeActionKelasId, setActiveActionKelasId] = useState<string | null>(null);
  const [kelasDropdownPos, setKelasDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const [studentDropdownPos, setStudentDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isBulkTransferOpen, setIsBulkTransferOpen] = useState(false);
  const [bulkTransferLembagaId, setBulkTransferLembagaId] = useState('');
  const [bulkDestClassId, setBulkDestClassId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Sorting states
  const [sortField, setSortField] = useState<'nama' | 'nik' | 'nis' | 'nisn' | 'nism' | 'statusKeanggotaan' | 'statusEmis' | 'statusVerval' | 'kamar' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Scroll & Table navigation states
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isScrollable, setIsScrollable] = useState(true);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const floatingHeaderRef = useRef<HTMLDivElement>(null);
  const floatingHeaderOuterRef = useRef<HTMLDivElement>(null);

  const [isScrolled, setIsScrolled] = useState(false);
  const [stickyTop, setStickyTop] = useState(64);
  const [floatingHeaderStyle, setFloatingHeaderStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });
  const [floatingTableWidth, setFloatingTableWidth] = useState<number>(0);
  const [colWidths, setColWidths] = useState<number[]>([]);

  const scrollSourceRef = useRef<'main' | 'floating' | null>(null);
  const scrollTimeoutRef = useRef<number | null>(null);

  const updateScrollButtons = () => {
    const container = tableContainerRef.current;
    if (container) {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      const hasHorizontalScroll = scrollWidth > clientWidth + 4;
      setIsScrollable(hasHorizontalScroll);
      setCanScrollLeft(hasHorizontalScroll && scrollLeft > 2);
      setCanScrollRight(hasHorizontalScroll && scrollLeft + clientWidth < scrollWidth - 2);
    }
  };

  const handleTableScroll = () => {
    updateScrollButtons();
    const container = tableContainerRef.current;
    if (!container) return;

    if (scrollSourceRef.current !== 'floating') {
      scrollSourceRef.current = 'main';
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = window.setTimeout(() => {
        scrollSourceRef.current = null;
      }, 150);

      if (floatingHeaderRef.current && floatingHeaderRef.current.scrollLeft !== container.scrollLeft) {
        floatingHeaderRef.current.scrollLeft = container.scrollLeft;
      }
    }

    const mainHeader = document.querySelector('header');
    const mainHeaderHeight = mainHeader ? (mainHeader as HTMLElement).offsetHeight : 64;
    const computedStickyTop = mainHeaderHeight;

    setStickyTop(computedStickyTop);

    const containerRect = container.getBoundingClientRect();
    const isHeaderFloating = 
      containerRect.top <= computedStickyTop && 
      containerRect.bottom > (computedStickyTop + 48);
    setIsScrolled(isHeaderFloating);

    setFloatingHeaderStyle({
      left: containerRect.left,
      width: containerRect.width,
    });

    const tableEl = container.querySelector('table');
    if (tableEl) {
      const fullW = Math.max(tableEl.scrollWidth, tableEl.getBoundingClientRect().width);
      if (fullW > 0) setFloatingTableWidth(fullW);

      const mainThs = tableEl.querySelectorAll('thead tr th');
      if (mainThs && mainThs.length > 0) {
        const widths = Array.from(mainThs).map(th => (th as HTMLElement).getBoundingClientRect().width);
        if (widths.some(w => w > 0)) {
          setColWidths(prev => {
            if (prev.length === widths.length && prev.every((w, i) => Math.abs(w - widths[i]) < 0.5)) {
              return prev;
            }
            return widths;
          });
        }
      }
    }
  };

  const scrollTable = (direction: 'left' | 'right') => {
    const container = tableContainerRef.current;
    if (container) {
      scrollSourceRef.current = 'main';
      const scrollAmount = 300;
      const targetScroll = direction === 'left' 
        ? container.scrollLeft - scrollAmount 
        : container.scrollLeft + scrollAmount;
      
      container.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    updateScrollButtons();
    const timer = setTimeout(() => {
      updateScrollButtons();
      handleTableScroll();
    }, 100);

    const handleResize = () => {
      updateScrollButtons();
      handleTableScroll();
    };

    const handleGlobalScroll = () => {
      handleTableScroll();
    };

    window.addEventListener('resize', handleResize, { passive: true });
    document.addEventListener('scroll', handleGlobalScroll, { capture: true, passive: true });

    let observer: ResizeObserver | null = null;
    const container = tableContainerRef.current;
    if (container) {
      observer = new ResizeObserver(() => {
        updateScrollButtons();
      });
      observer.observe(container);
      const table = container.querySelector('table');
      if (table) {
        observer.observe(table);
      }
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('scroll', handleGlobalScroll, { capture: true });
      if (observer) {
        observer.disconnect();
      }
    };
  }, []);

  // Class Delete Confirmation state
  const [classToDelete, setClassToDelete] = useState<{ id: string; name: string } | null>(null);

  // Batas Usia states for Calon Pelajar
  const [kelBatasUsiaHari, setKelBatasUsiaHari] = useState<number>(1);
  const [kelBatasUsiaBulan, setKelBatasUsiaBulan] = useState<number>(7);
  const [kelBatasUsiaUmurMin, setKelBatasUsiaUmurMin] = useState<number>(0);
  const [kelBatasUsiaUmurMax, setKelBatasUsiaUmurMax] = useState<number>(99);

  const getMonthName = (monthNum: number): string => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return months[monthNum - 1] || '';
  };

  const calculateAgeAsOfReference = (birthDateStr?: string, refDay?: number, refMonth?: number): number | null => {
    if (!birthDateStr) return null;
    let birthDate: Date;
    try {
      if (birthDateStr.includes('-')) {
        const parts = birthDateStr.split('-');
        if (parts[0].length === 4) {
          birthDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } else {
          birthDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
      } else {
        birthDate = new Date(birthDateStr);
      }
      if (isNaN(birthDate.getTime())) return null;
      const currentYear = new Date().getFullYear();
      const targetDay = refDay || 1;
      const targetMonth = (refMonth || 7) - 1;
      const referenceDate = new Date(currentYear, targetMonth, targetDay);
      let age = referenceDate.getFullYear() - birthDate.getFullYear();
      const m = referenceDate.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && referenceDate.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    } catch (e) {
      return null;
    }
  };

  const handleSort = (field: 'nama' | 'nik' | 'nis' | 'nisn' | 'nism' | 'statusKeanggotaan' | 'statusEmis' | 'statusVerval' | 'kamar') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortableHeader = (label: string, field: 'nama' | 'nik' | 'nis' | 'nisn' | 'nism' | 'statusKeanggotaan' | 'statusEmis' | 'statusVerval' | 'kamar', extraClass: string, justify: string = 'justify-start', styleOverride?: React.CSSProperties) => {
    const isSorted = sortField === field;
    return (
      <th 
        onClick={() => handleSort(field)} 
        style={styleOverride}
        className={`${extraClass} cursor-pointer hover:bg-slate-200 transition-colors select-none text-left`}
      >
        <div className={`flex items-center gap-1.5 ${justify}`}>
          <span className="text-slate-600">{label}</span>
          {isSorted ? (
            sortDirection === 'asc' ? (
              <ArrowUp className="h-3 w-3 text-[#00693E] font-bold shrink-0" />
            ) : (
              <ArrowDown className="h-3 w-3 text-[#00693E] font-bold shrink-0" />
            )
          ) : (
            <ArrowUpDown className="h-3 w-3 text-slate-400 hover:text-slate-600 shrink-0" />
          )}

          {/* Scroll Left Button placed exactly on the right border line of 'nama' header column */}
          {field === 'nama' && canScrollLeft && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                scrollTable('left');
              }}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-[40] flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all cursor-pointer opacity-100"
              title="Gulir Kiri"
            >
              <ChevronLeft className="h-4 w-4 stroke-[2.5] -translate-x-[0.5px]" />
            </button>
          )}
        </div>
      </th>
    );
  };

  const renderTableHeadContents = (isFloatingHeader: boolean = false) => {
    let colIdx = 0;
    const isAllSelected = filteredStudents.length > 0 && filteredStudents.every(s => selectedStudentIds.includes(s.id));
    const isSomeSelected = filteredStudents.some(s => selectedStudentIds.includes(s.id));
    const getStyle = () => {
      const idx = colIdx++;
      if (!isFloatingHeader || !colWidths || !colWidths[idx]) return undefined;
      const w = colWidths[idx];
      return { width: `${w}px`, minWidth: `${w}px`, maxWidth: `${w}px`, boxSizing: 'border-box' as const };
    };

    return (
      <tr className="text-[11px] font-black uppercase tracking-wider text-slate-600 border-b border-slate-200 bg-slate-100 select-none">
        <th style={getStyle()} className="sticky left-0 z-20 w-[42px] min-w-[42px] max-w-[42px] pl-2 pr-1 py-4 bg-slate-100 border-r border-slate-200 text-center font-black text-slate-600">
          {isSelectionMode ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isAllSelected) {
                  const filteredIdsSet = new Set(filteredStudents.map(s => s.id));
                  setSelectedStudentIds(prev => prev.filter(id => !filteredIdsSet.has(id)));
                } else {
                  const newIds = new Set([...selectedStudentIds, ...filteredStudents.map(s => s.id)]);
                  setSelectedStudentIds(Array.from(newIds));
                }
              }}
              className={`h-4 w-4 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                isAllSelected 
                  ? 'bg-[#00693E] border-[#00693E] text-white' 
                  : isSomeSelected 
                    ? 'bg-[#00693E]/20 border-[#00693E] text-[#00693E]' 
                    : 'border-slate-300 bg-white hover:border-slate-400'
              }`}
              title={isAllSelected ? "Batal Pilih Semua" : "Pilih Semua Santri"}
            >
              {isAllSelected && <Check className="h-3 w-3 stroke-[3]" />}
              {!isAllSelected && isSomeSelected && <div className="h-2 w-2 bg-[#00693E] rounded-xs" />}
            </button>
          ) : (
            "No"
          )}
        </th>
        {renderSortableHeader('Profil Santri', 'nama', 'sticky left-[42px] z-20 w-[200px] min-w-[200px] max-w-[200px] pl-2 py-4 bg-slate-100 border-r border-slate-200 relative', 'justify-start', getStyle())}
        {activeTab === 'Formal' && renderSortableHeader('NIK', 'nik', 'w-[130px] min-w-[130px] pl-1 py-4 bg-slate-100', 'justify-start', getStyle())}
        {renderSortableHeader('NISN', 'nisn', 'w-[110px] min-w-[110px] pl-1 py-4 bg-slate-100', 'justify-start', getStyle())}
        {renderSortableHeader('NISM', 'nism', 'w-[110px] min-w-[110px] pl-1 py-4 bg-slate-100', 'justify-start', getStyle())}
        {activeTab !== 'Formal' && renderSortableHeader('Status', 'statusKeanggotaan', 'w-[100px] min-w-[100px] pl-1 py-4 bg-slate-100', 'justify-start', getStyle())}
        {activeTab === 'Formal' ? (
          <>
            {isCalonPelajarPage && renderSortableHeader('EMIS', 'statusEmis', 'w-[100px] min-w-[100px] pl-3 py-4 bg-slate-100 border-r border-slate-200', 'justify-start', getStyle())}
            {!isCalonPelajarPage && renderSortableHeader('Verval', 'statusVerval', 'w-[100px] min-w-[100px] pl-3 py-4 bg-slate-100 border-r border-slate-200', 'justify-start', getStyle())}
          </>
        ) : (
          renderSortableHeader('Kamar', 'kamar', 'w-[110px] min-w-[110px] pl-3 py-4 bg-slate-100 border-r border-slate-200', 'justify-start', getStyle())
        )}
        <th style={getStyle()} className="sticky right-0 z-20 w-[56px] min-w-[56px] max-w-[56px] px-2 py-4 bg-slate-100 border-l border-slate-200 font-black text-slate-600 text-center shadow-[-2px_0_5px_rgba(0,0,0,0.03)]">
          <span>Aksi</span>
        </th>
      </tr>
    );
  };

  const renderScrollButtons = (isFloating: boolean = false) => {
    if (!canScrollRight) return null;
    return (
      <button
        id={isFloating ? "table-scroll-right-btn-floating" : "table-scroll-right-btn"}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          scrollTable('right');
        }}
        className={`absolute right-0 translate-x-1/2 ${
          isFloating ? 'top-1/2 -translate-y-1/2' : 'top-[26px] -translate-y-1/2'
        } z-[100] flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all cursor-pointer opacity-100`}
        title="Gulir Kanan"
      >
        <ChevronRight className="h-4 w-4 stroke-[2.5] translate-x-[0.5px]" />
      </button>
    );
  };
  
  // Modal Trigger States
  const [selectedSantriForDetail, setSelectedSantriForDetail] = useState<Santri | null>(null);
  const [transferStudent, setTransferStudent] = useState<Santri | null>(null);
  const [transferLembagaId, setTransferLembagaId] = useState<string>('');
  const [destClassId, setDestClassId] = useState<string>('');
  
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [addMemberSearch, setAddMemberSearch] = useState('');
  const [addMemberGroupFilter, setAddMemberGroupFilter] = useState<string>('Semua');
  const [selectedModalStudentIds, setSelectedModalStudentIds] = useState<string[]>([]);
  const [collapsedModalSections, setCollapsedModalSections] = useState<Record<string, boolean>>({});

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Dropdowns
  const [activeMenuLembagaId, setActiveMenuLembagaId] = useState<string | null>(null);
  const [activeMenuKelasId, setActiveMenuKelasId] = useState<string | null>(null);
  
  // Create / Edit Lembaga (or Kategori Rombel) Modal States
  const [isLembagaModalOpen, setIsLembagaModalOpen] = useState(false);
  const [editingLembaga, setEditingLembaga] = useState<any | null>(null);
  const [lemNama, setLemNama] = useState('');
  const [lemKode, setLemKode] = useState('');
  const [lemLogo, setLemLogo] = useState('');
  const [logoError, setLogoError] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [lemDeskripsi, setLemDeskripsi] = useState('');
  const [taMulaiTanggal, setTaMulaiTanggal] = useState<number>(1);
  const [taMulaiBulan, setTaMulaiBulan] = useState<number>(7);
  const [taSelesaiTanggal, setTaSelesaiTanggal] = useState<number>(30);
  const [taSelesaiBulan, setTaSelesaiBulan] = useState<number>(6);

  // Create / Edit Kelas (or Kelompok Rombel) Modal States
  const [isKelasModalOpen, setIsKelasModalOpen] = useState(false);
  const [editingKelas, setEditingKelas] = useState<any | null>(null);
  const [kelNama, setKelNama] = useState('');
  const [kelWali, setKelWali] = useState('');
  const [kelTingkat, setKelTingkat] = useState<'Ula' | 'Wustho' | 'Ulya' | 'Lainnya'>('Lainnya');
  const [kelKapasitas, setKelKapasitas] = useState<number>(40);

  // Confirmation states for removing student(s) from class/group
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [confirmRemoveData, setConfirmRemoveData] = useState<{
    type: 'single' | 'bulk';
    studentName?: string;
    studentId?: string;
    count?: number;
    label: string;
    className: string;
    onConfirm: () => void;
  } | null>(null);

  // Sync gender filter prop
  useEffect(() => {
    if (genderFilter) {
      setSelectedGender(genderFilter);
      setSelectedLembaga(null);
      setSelectedKelas(null);
    }
  }, [genderFilter]);

  // Lock background body scroll when any modal is open
  useEffect(() => {
    const isModalOpen = isAddMemberModalOpen || isLembagaModalOpen || isKelasModalOpen || confirmRemoveOpen || !!selectedSantriForDetail || !!transferStudent;
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isAddMemberModalOpen, isLembagaModalOpen, isKelasModalOpen, confirmRemoveOpen, selectedSantriForDetail, transferStudent]);

  useEffect(() => {
    setLogoError(false);
  }, [lemLogo]);

  // Sync initialTab prop changes
  useEffect(() => {
    if (initialTab) {
      const targetTab = initialTab;
      if (targetTab !== activeTab) {
        setActiveTab(targetTab);
        setSelectedLembaga(null);
        setSelectedKelas(null);
      }
    }
  }, [initialTab]);

  // Auto-switch tab on initial view if activeTab has no lembagas (disabled so user can access empty Pendidikan Formal tab)
  /* 
  useEffect(() => {
    if (selectedLembaga) return;
    if (lembagasList && lembagasList.length > 0 && activeTab !== 'Rombel') {
      const currentTabCount = lembagasList.filter(l => {
        const isJenisMatch = getLembagaJenis(l) === activeTab;
        const isGenderMatch = !l.gender || l.gender === selectedGender || (l.gender as string) === 'Campuran' || (l.gender as string) === 'Semua';
        return isJenisMatch && isGenderMatch;
      }).length;

      if (currentTabCount === 0 && activeTab === 'Formal') {
        const hasInternal = lembagasList.some(l => getLembagaJenis(l) === 'Internal');
        if (hasInternal) setActiveTab('Internal');
      }
    }
  }, [lembagasList, selectedGender, activeTab, selectedLembaga]);
  */

  // Sync scroll buttons status on data or view change
  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    // Direct initial update
    updateScrollButtons();

    // Use ResizeObserver to detect layout shifts (e.g., when transitioning/opening/expanding or fullscreen toggles)
    const resizeObserver = new ResizeObserver(() => {
      updateScrollButtons();
    });
    resizeObserver.observe(container);

    // Use MutationObserver to detect content modifications (such as changing columns or list size)
    const mutationObserver = new MutationObserver(() => {
      updateScrollButtons();
    });
    mutationObserver.observe(container, { childList: true, subtree: true, characterData: true });

    // Also attach scroll listener
    container.addEventListener('scroll', handleTableScroll);

    window.addEventListener('resize', updateScrollButtons);

    // Schedule several staggered timeouts to cover delayed rendering
    const timeouts = [100, 300, 500, 1000].map(delay => 
      setTimeout(updateScrollButtons, delay)
    );

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      container.removeEventListener('scroll', handleTableScroll);
      window.removeEventListener('resize', updateScrollButtons);
      timeouts.forEach(clearTimeout);
    };
  }, [selectedKelas, selectedLembaga, currentPage, searchQuery, isSelectionMode, santriList]);

  // Close fixed floating dropdowns on scroll, resize or click anywhere outside
  useEffect(() => {
    const handleCloseDropdowns = (e?: Event) => {
      if (e && e.target) {
        const target = e.target as HTMLElement;
        if (target.closest && target.closest('.dropdown-container-box')) {
          return;
        }
      }
      setActiveActionKelasId(null);
      setKelasDropdownPos(null);
      setActiveActionStudentId(null);
      setStudentDropdownPos(null);
      setActiveEmisDropdownId(null);
      setActiveVervalDropdownId(null);
    };

    window.addEventListener('scroll', handleCloseDropdowns, true);
    window.addEventListener('resize', handleCloseDropdowns, true);
    window.addEventListener('click', handleCloseDropdowns, true);
    return () => {
      window.removeEventListener('scroll', handleCloseDropdowns, true);
      window.removeEventListener('resize', handleCloseDropdowns, true);
      window.removeEventListener('click', handleCloseDropdowns, true);
    };
  }, []);

  // Sync tab change
  const handleTabChange = (tab: 'Formal' | 'Internal' | 'Rombel') => {
    setActiveTab(tab);
    setSelectedLembaga(null);
    setSelectedKelas(null);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  // Helper: Resolve Lembaga type
  const getLembagaJenis = (l: Lembaga): 'Formal' | 'Internal' => {
    if (l.jenis && (l.jenis === 'Formal' || l.jenis === 'Internal')) return l.jenis;
    const lower = (l.nama || '').toLowerCase();
    const kode = (l.kode || '').toLowerCase();
    if (
      lower.includes('madin') || 
      lower.includes('diniyah') || 
      lower.includes('tpq') || 
      lower.includes('tahfidz') || 
      lower.includes('pondok') || 
      lower.includes('kitab') || 
      lower.includes('internal') ||
      kode.includes('madin') ||
      kode.includes('tahf')
    ) {
      return 'Internal';
    }
    return 'Formal';
  };

  // Filtered Lembaga
  const filteredLembagas = lembagasList.filter(l => {
    const isJenisMatch = getLembagaJenis(l) === activeTab;
    const isGenderMatchResult = isGenderMatch(l.gender, selectedGender);
    return isJenisMatch && isGenderMatchResult;
  });

  // Helper: Determine if a student belongs to a given institution
  const isStudentInLembaga = (s: Santri, l: Lembaga): boolean => {
    if (!s || !l) return false;
    if (s.statusKeanggotaan === 'Meninggal') return false;
    
    const norm = (str?: string | null) => (str || '').trim().toLowerCase().replace(/[-_]/g, ' ');

    const targetId = norm(l.id);
    const targetNama = norm(l.nama);
    const targetKode = norm(l.kode);

    const jenisLembaga = getLembagaJenis(l);

    if (jenisLembaga === 'Formal') {
      if (!s.pendidikanFormal || s.pendidikanFormal.trim() === '' || s.pendidikanFormal === 'TIDAK TERDAFTAR' || s.pendidikanFormal === 'Belum / Non-Formal') {
        return false;
      }
      const formalParts = s.pendidikanFormal.split(',').map(x => norm(x)).filter(Boolean);
      return formalParts.some(pf => {
        if (pf === targetId) return true;
        if (targetNama && (pf === targetNama || pf.includes(targetNama) || targetNama.includes(pf))) return true;
        if (targetKode) {
          const normKode = norm(targetKode);
          if (normKode) {
            const words = pf.split(/[\s-]+/);
            if (words.includes(normKode) || pf === normKode || pf.startsWith(normKode + ' ') || pf.startsWith(normKode + '-')) return true;
          }
        }
        return false;
      });
    }

    // 1. Check s.pendidikanInternal
    if (s.pendidikanInternal) {
      const internalParts = s.pendidikanInternal.split(',').map(x => norm(x)).filter(Boolean);
      const matchInternal = internalParts.some(pi => 
        pi === targetId ||
        (targetNama && pi === targetNama) ||
        (targetKode && pi === targetKode) ||
        (targetNama && targetNama.length > 2 && (pi.includes(targetNama) || targetNama.includes(pi))) ||
        (targetKode && targetKode.length > 2 && (pi.includes(targetKode) || targetKode.includes(pi)))
      );
      if (matchInternal) return true;
    }

    // 2. Check s.pendidikanFormal
    if (s.pendidikanFormal) {
      const formalParts = s.pendidikanFormal.split(',').map(x => norm(x)).filter(Boolean);
      const matchFormal = formalParts.some(pf => 
        pf === targetId ||
        (targetNama && pf === targetNama) ||
        (targetKode && pf === targetKode) ||
        (targetNama && targetNama.length > 2 && (pf.includes(targetNama) || targetNama.includes(pf))) ||
        (targetKode && targetKode.length > 2 && (pf.includes(targetKode) || targetKode.includes(pf)))
      );
      if (matchFormal) return true;
    }

    // 3. Check if s.kelas matches any class defined for this internal lembaga in kelasList
    if (s.kelas) {
      const sClasses = s.kelas.split(',').map(x => norm(x)).filter(Boolean);
      const classesOfL = kelasList.filter(k => norm(getClsLembagaId(k)) === targetId);
      const matchClass = classesOfL.some(k => k.nama && sClasses.includes(norm(k.nama)));
      if (matchClass) return true;
    }

    return false;
  };

  // Helper: Get classes for a specific institution
  const getClassesOfLembaga = (lembagaId: string) => {
    const list = kelasList.filter(k => getClsLembagaId(k) === String(lembagaId));
    const hasDefault = list.some(k => isDefaultClass(k));
    if (!hasDefault) {
      const defaultCls: Kelas = {
        id: `calon-${lembagaId}`,
        lembagaId: String(lembagaId),
        nama: 'Calon Peserta Didik',
        waliKelas: '-',
        tingkatan: 'Lainnya',
        isDefault: true
      };
      return [defaultCls, ...list];
    }
    return list;
  };

  // Helper: Get students belonging to a specific class in an institution
  const getStudentsInClass = (c: Kelas, l: Lembaga) => {
    return santriList.filter(s => {
      if (!isGenderMatch(s.gender, selectedGender)) return false;

      const inLembaga = isStudentInLembaga(s, l);
      if (!inLembaga) return false;

      const norm = (str?: string | null) => (str || '').trim().toLowerCase().replace(/[-_]/g, ' ');
      const sClasses = s.kelas ? s.kelas.split(',').map(x => norm(x)).filter(Boolean) : [];
      
      // Extract specific class text from pendidikanFormal or pendidikanInternal if available
      let specificClassText = '';
      if (s.pendidikanFormal) {
        const parts = s.pendidikanFormal.split('-');
        if (parts.length > 1) {
          const lemPart = norm(parts[0]);
          const normNama = norm(l.nama);
          const normKode = norm(l.kode);
          const isLemMatch = lemPart === normNama || 
            (normKode && (lemPart === normKode || lemPart.startsWith(normKode) || normNama.includes(lemPart) || lemPart.includes(normNama))) ||
            (normNama && (normNama.includes(lemPart) || lemPart.includes(normNama)));
          if (isLemMatch) {
            specificClassText = norm(parts.slice(1).join('-'));
          }
        } else {
          const normFormal = norm(s.pendidikanFormal);
          if (normFormal.includes('calon')) {
            specificClassText = 'calon peserta didik';
          }
        }
      }

      if (!specificClassText && s.pendidikanInternal) {
        const parts = s.pendidikanInternal.split('-');
        if (parts.length > 1) {
          const lemPart = norm(parts[0]);
          const normNama = norm(l.nama);
          const normKode = norm(l.kode);
          const isLemMatch = lemPart === normNama || 
            (normKode && (lemPart === normKode || lemPart.startsWith(normKode) || normNama.includes(lemPart) || lemPart.includes(normNama))) ||
            (normNama && (normNama.includes(lemPart) || lemPart.includes(normNama)));
          if (isLemMatch) {
            specificClassText = norm(parts.slice(1).join('-'));
          }
        }
      }

      const matchNonDefaultClass = (targetClass: Kelas): boolean => {
        if (isDefaultClass(targetClass)) return false;
        const targetNorm = norm(targetClass.nama);
        if (!targetNorm) return false;

        const cleanClassStr = (str?: string | null) => {
          if (!str) return '';
          return str.trim().toLowerCase()
            .replace(/[-_]/g, ' ')
            .replace(/^(kelas|kls)\s+/, '')
            .replace(/\s+/g, ' ')
            .trim();
        };

        const cleanedTarget = cleanClassStr(targetNorm);

        // 1. Direct match in sClasses (exact norm or cleaned match)
        if (sClasses.some(sc => sc === targetNorm || cleanClassStr(sc) === cleanedTarget)) {
          return true;
        }

        // 2. Direct match in specificClassText (exact norm or cleaned match)
        if (specificClassText) {
          const cleanedSpecific = cleanClassStr(specificClassText);
          if (specificClassText === targetNorm || cleanedSpecific === cleanedTarget) {
            return true;
          }
        }

        return false;
      };

      if (isDefaultClass(c)) {
        if (specificClassText && (specificClassText.includes('calon') || specificClassText.includes('tanpa'))) {
          return true;
        }
        const otherClassesOfL = getClassesOfLembaga(l.id).filter(x => !isDefaultClass(x));
        const inOtherClass = otherClassesOfL.some(oc => matchNonDefaultClass(oc));
        return !inOtherClass;
      } else {
        return matchNonDefaultClass(c);
      }
    });
  };

  // Helper: Get total students following an institution
  const getLembagaStudentCount = (l: Lembaga) => {
    return santriList.filter(s => {
      if (!isGenderMatch(s.gender, selectedGender)) return false;
      return isStudentInLembaga(s, l);
    }).length;
  };

  // --- Dynamic Unified Institutions Builder ---
  const institutions = useMemo(() => {
    if (activeTab === 'Rombel') {
      return categoriesList.map(c => {
        const groups = groupsList.filter(g => g.kategoriId === c.id);
        const studentCount = groups.reduce((sum, g) => {
          const assignedIds = assignmentsList
            .filter(a => a.kelompokId === g.id)
            .map(a => a.santriId);
          const members = santriList.filter(s => assignedIds.includes(s.id) && s.gender === selectedGender);
          return sum + members.length;
        }, 0);

        return {
          id: c.id,
          nama: c.nama,
          kode: 'ROMBEL',
          deskripsi: c.deskripsi || 'Kategori Rombongan Belajar',
          logo: '',
          gender: selectedGender,
          jenis: 'Rombel',
          classesCount: groups.length,
          studentsCount: studentCount
        };
      });
    } else {
      return filteredLembagas.map(l => {
        const classes = getClassesOfLembaga(l.id);
        const studentsCount = getLembagaStudentCount(l);
        return {
          id: l.id,
          nama: l.nama,
          kode: l.kode,
          deskripsi: l.deskripsi || '',
          logo: l.logo || '',
          gender: l.gender,
          jenis: getLembagaJenis(l),
          classesCount: classes.length,
          studentsCount: studentsCount,
          taMulaiTanggal: l.taMulaiTanggal,
          taMulaiBulan: l.taMulaiBulan,
          taSelesaiTanggal: l.taSelesaiTanggal,
          taSelesaiBulan: l.taSelesaiBulan
        };
      });
    }
  }, [activeTab, categoriesList, groupsList, assignmentsList, santriList, selectedGender, filteredLembagas, kelasList]);

  // --- Dynamic Unified Classes Builder ---
  const subClasses = useMemo(() => {
    if (!selectedLembaga) return [];
    if (activeTab === 'Rombel') {
      return groupsList
        .filter(g => g.kategoriId === selectedLembaga.id)
        .map(g => ({
          id: g.id,
          nama: g.nama,
          waliKelas: g.pembimbing,
          tingkatan: 'Lainnya',
          kapasitas: g.kuota || 20,
          lembagaId: selectedLembaga.id
        }));
    } else {
      return getClassesOfLembaga(selectedLembaga.id);
    }
  }, [selectedLembaga, activeTab, groupsList, kelasList]);

  // --- Dynamic Unified Students Getter ---
  const currentClassStudents = useMemo(() => {
    if (!selectedKelas) return [];
    if (activeTab === 'Rombel') {
      const assignedIds = assignmentsList
        .filter(a => a.kelompokId === selectedKelas.id)
        .map(a => a.santriId);
      return santriList.filter(s => assignedIds.includes(s.id) && s.gender === selectedGender);
    } else {
      return getStudentsInClass(selectedKelas, selectedLembaga);
    }
  }, [selectedKelas, selectedLembaga, activeTab, assignmentsList, santriList, selectedGender, kelasList]);

  // Filtered students by search query and status filter
  const searchedStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return currentClassStudents.filter(s => {
      const matchesSearch = !q || (
        (s.nama || '').toLowerCase().includes(q) ||
        (s.nik && s.nik.toLowerCase().includes(q)) ||
        (s.nis && s.nis.toLowerCase().includes(q)) ||
        (s.nisn && s.nisn.toLowerCase().includes(q)) ||
        (s.nism && s.nism.toLowerCase().includes(q))
      );

      if (!matchesSearch) return false;

      // Apply status filter
      if (statusFilter && statusFilter !== 'Semua') {
        const isCP = !!(selectedKelas && isDefaultClass(selectedKelas));
        if (isCP) {
          // Status EMIS filter: 'Terdaftar' or 'Belum'
          const isTerdaftar = isEmisTerdaftar(s.statusEmis);
          if (statusFilter === 'Terdaftar') {
            return isTerdaftar;
          } else if (statusFilter === 'Belum') {
            return !isTerdaftar;
          }
        } else {
          // Status Verval filter: 'Sukses' or 'Proses'
          const currentVerval = s.statusVerval || (s.nisn && s.nisn.trim() !== '' ? 'Sukses' : 'Proses');
          if (statusFilter === 'Sukses') {
            return currentVerval === 'Sukses';
          } else if (statusFilter === 'Proses') {
            return currentVerval === 'Proses';
          }
        }
      }

      return true;
    });
  }, [currentClassStudents, searchQuery, statusFilter, selectedKelas]);

  // Sort and filter students
  const filteredStudents = useMemo(() => {
    return [...searchedStudents].sort((a, b) => {
      if (!sortField) return 0;
      
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';
      
      if (sortField === 'nik') {
        valA = a.nik || '';
        valB = b.nik || '';
      } else if (sortField === 'statusKeanggotaan') {
        valA = a.statusKeanggotaan || '';
        valB = b.statusKeanggotaan || '';
      } else if (sortField === 'statusEmis') {
        valA = a.statusEmis || 'Belum';
        valB = b.statusEmis || 'Belum';
      } else if (sortField === 'statusVerval') {
        const isNisnValidA = !!(a.nisn && a.nisn.trim() !== '');
        const isNisnValidB = !!(b.nisn && b.nisn.trim() !== '');
        valA = a.statusVerval || (isNisnValidA ? 'Sukses' : 'Proses');
        valB = b.statusVerval || (isNisnValidB ? 'Sukses' : 'Proses');
      } else if (sortField === 'kamar') {
        valA = a.kamar || '-';
        valB = b.kamar || '-';
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc'
          ? valA.localeCompare(valB, 'id', { sensitivity: 'base', numeric: true })
          : valB.localeCompare(valA, 'id', { sensitivity: 'base', numeric: true });
      }
      
      return 0;
    });
  }, [searchedStudents, sortField, sortDirection]);

  // --- Automatical Selection of Topmost Class ---
  useEffect(() => {
    if (selectedLembaga) {
      const classes = subClasses;
      if (classes.length > 0) {
        // Find if selectedKelas is already in this new list, otherwise fallback to the first
        const stillExists = classes.find(c => c.id === selectedKelas?.id);
        if (!stillExists) {
          setSelectedKelas(classes[0]);
        }
      } else {
        setSelectedKelas(null);
      }
    } else {
      setSelectedKelas(null);
    }
    setSearchQuery('');
    setActiveActionStudentId(null);
  }, [selectedLembaga, activeTab]);

  useEffect(() => {
    setCurrentPage(1);
    setSortField(null);
    setSortDirection('asc');
    setStatusFilter('Semua');
  }, [selectedKelas]);

  // --- CRUD Handlers ---
  const generate4LetterKode = (name: string): string => {
    const clean = name.replace(/[^a-zA-Z0-9 ]/g, '').trim();
    if (!clean) return 'LEMB';
    const words = clean.split(/\s+/).filter(Boolean);
    let code = '';
    if (words.length >= 4) {
      code = words.slice(0, 4).map(w => w[0]).join('');
    } else if (words.length === 3) {
      code = (words[0][0] + words[1][0] + words[2].slice(0, 2));
    } else if (words.length === 2) {
      code = (words[0].slice(0, 2) + words[1].slice(0, 2));
    } else {
      code = clean.slice(0, 4);
    }
    return code.toUpperCase().padEnd(4, 'X').slice(0, 4);
  };

  const handleOpenLembagaModal = (lem: any = null) => {
    setIsUploadingLogo(false);
    setLogoError(false);
    if (lem) {
      setEditingLembaga(lem);
      setLemNama(lem.nama);
      setLemKode((lem.kode || '').toUpperCase().slice(0, 4));
      setLemLogo(lem.logo || '');
      setLemDeskripsi(lem.deskripsi || '');
      setTaMulaiTanggal(lem.taMulaiTanggal || 1);
      setTaMulaiBulan(lem.taMulaiBulan || 7);
      setTaSelesaiTanggal(lem.taSelesaiTanggal || 30);
      setTaSelesaiBulan(lem.taSelesaiBulan || 6);
    } else {
      setEditingLembaga(null);
      setLemNama('');
      setLemKode('');
      setLemLogo('');
      setLemDeskripsi('');
      setTaMulaiTanggal(1);
      setTaMulaiBulan(7);
      setTaSelesaiTanggal(30);
      setTaSelesaiBulan(6);
    }
    setIsLembagaModalOpen(true);
  };

  const handleSaveLembaga = async () => {
    if (!lemNama.trim()) return;

    if (activeTab === 'Rombel') {
      if (editingLembaga) {
        if (onUpdateCategory) {
          await onUpdateCategory({
            id: editingLembaga.id,
            nama: lemNama.trim(),
            deskripsi: lemDeskripsi.trim()
          });
          showToast('Kategori rombel berhasil diperbarui.');
          // Update selectedLembaga reference if active
          if (selectedLembaga?.id === editingLembaga.id) {
            setSelectedLembaga({
              ...selectedLembaga,
              nama: lemNama.trim(),
              deskripsi: lemDeskripsi.trim()
            });
          }
        }
      } else {
        if (onAddCategory) {
          const newId = 'R-' + Date.now();
          await onAddCategory({
            id: newId,
            nama: lemNama.trim(),
            deskripsi: lemDeskripsi.trim()
          });
          showToast('Kategori rombel baru berhasil dibuat.');
        }
      }
    } else {
      let finalKode = lemKode.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4);
      if (!finalKode) {
        finalKode = generate4LetterKode(lemNama);
      }

      // Unique kode validation (cannot have duplicate kode across lembagas)
      const isDuplicateKode = lembagasList.some(l => {
        if (editingLembaga && String(l.id) === String(editingLembaga.id)) return false;
        return (l.kode || '').trim().toUpperCase() === finalKode;
      });

      if (isDuplicateKode) {
        showToast(`Kode singkatan "${finalKode}" sudah digunakan oleh lembaga lain. Gunakan kode yang berbeda.`, 'error');
        return;
      }

      if (editingLembaga) {
        const { classesCount, studentsCount, ...cleanLembaga } = editingLembaga;
        await onUpdateLembaga({
          ...cleanLembaga,
          nama: lemNama.trim(),
          kode: finalKode,
          logo: lemLogo || undefined,
          deskripsi: lemDeskripsi.trim(),
          taMulaiTanggal,
          taMulaiBulan,
          taSelesaiTanggal,
          taSelesaiBulan
        });
        showToast('Lembaga berhasil diperbarui.');
        if (selectedLembaga?.id === editingLembaga.id) {
          setSelectedLembaga({
            ...selectedLembaga,
            nama: lemNama.trim(),
            kode: finalKode,
            logo: lemLogo || undefined,
            deskripsi: lemDeskripsi.trim(),
            taMulaiTanggal,
            taMulaiBulan,
            taSelesaiTanggal,
            taSelesaiBulan
          });
        }
      } else {
        const newLembagaId = 'L-' + Date.now();

        const savedLem = await onAddLembaga({
          id: newLembagaId,
          nama: lemNama.trim(),
          kode: finalKode,
          gender: selectedGender,
          jenis: activeTab,
          logo: lemLogo || undefined,
          deskripsi: lemDeskripsi.trim(),
          taMulaiTanggal,
          taMulaiBulan,
          taSelesaiTanggal,
          taSelesaiBulan
        });

        const actualLembagaId = savedLem?.id || newLembagaId;

        // Automatically create a default class named "Calon Peserta Didik"
        await onAddKelas({
          id: 'K-' + Date.now() + '-default',
          lembagaId: actualLembagaId,
          nama: 'Calon Peserta Didik',
          waliKelas: '-',
          tingkatan: 'Lainnya',
          kapasitas: 999
        });

        showToast('Lembaga baru berhasil dibuat beserta kelas default.');
      }
    }

    setIsLembagaModalOpen(false);
  };

  const handleDeleteLembagaClick = (id: string, name: string) => {
    const isRombel = activeTab === 'Rombel';
    const typeLabel = isRombel ? 'kategori rombel' : 'lembaga';
    if (confirm(`Apakah Anda yakin ingin menghapus ${typeLabel} "${name}" beserta seluruh kelas/kelompok di dalamnya?`)) {
      if (isRombel) {
        if (onDeleteCategory) {
          onDeleteCategory(id);
          showToast('Kategori rombel berhasil dihapus.');
        }
      } else {
        onDeleteLembaga(id);
        showToast('Lembaga berhasil dihapus.');
      }
      if (selectedLembaga?.id === id) {
        setSelectedLembaga(null);
        setSelectedKelas(null);
      }
    }
  };

  const handleOpenKelasModal = (kel: any = null) => {
    if (!selectedLembaga) return;
    if (kel) {
      setEditingKelas(kel);
      setKelNama(kel.nama);
      setKelWali(kel.waliKelas || '');
      setKelTingkat(kel.tingkatan as any || 'Lainnya');
      setKelKapasitas(kel.kapasitas || 40);
      setKelBatasUsiaHari(kel.batasUsiaHari !== undefined ? kel.batasUsiaHari : 1);
      setKelBatasUsiaBulan(kel.batasUsiaBulan !== undefined ? kel.batasUsiaBulan : 7);
      setKelBatasUsiaUmurMin(kel.batasUsiaUmurMin !== undefined ? kel.batasUsiaUmurMin : 0);
      setKelBatasUsiaUmurMax(kel.batasUsiaUmurMax !== undefined ? kel.batasUsiaUmurMax : 99);
    } else {
      setEditingKelas(null);
      setKelNama('');
      setKelWali('');
      setKelTingkat('Lainnya');
      setKelKapasitas(40);
      setKelBatasUsiaHari(1);
      setKelBatasUsiaBulan(7);
      setKelBatasUsiaUmurMin(0);
      setKelBatasUsiaUmurMax(99);
    }
    setIsKelasModalOpen(true);
  };

  const handleSaveKelas = () => {
    const isLembagaFormal = false;
    const isCalonPelajar = Boolean(isLembagaFormal && editingKelas && isDefaultClass(editingKelas));
    const targetNama = kelNama.trim();
    if (!selectedLembaga || !targetNama) return;

    if (activeTab === 'Rombel') {
      if (editingKelas) {
        if (onUpdateGroup) {
          onUpdateGroup({
            id: editingKelas.id,
            kategoriId: selectedLembaga.id,
            nama: kelNama.trim(),
            pembimbing: kelWali.trim() || '-',
            kuota: Number(kelKapasitas)
          });
          showToast('Kelompok rombel berhasil diperbarui.');
          if (selectedKelas?.id === editingKelas.id) {
            setSelectedKelas({
              ...selectedKelas,
              nama: kelNama.trim(),
              waliKelas: kelWali.trim() || '-',
              kapasitas: Number(kelKapasitas)
            });
          }
        }
      } else {
        if (onAddGroup) {
          onAddGroup({
            id: 'G-' + Date.now(),
            kategoriId: selectedLembaga.id,
            nama: kelNama.trim(),
            pembimbing: kelWali.trim() || '-',
            kuota: Number(kelKapasitas)
          });
          showToast('Kelompok rombel baru berhasil ditambahkan.');
        }
      }
    } else {
      if (editingKelas) {
        onUpdateKelas({
          ...editingKelas,
          nama: targetNama,
          waliKelas: kelWali.trim() || '-',
          tingkatan: kelTingkat,
          kapasitas: Number(kelKapasitas),
          batasUsiaHari: Number(kelBatasUsiaHari),
          batasUsiaBulan: Number(kelBatasUsiaBulan),
          batasUsiaUmurMin: Number(kelBatasUsiaUmurMin),
          batasUsiaUmurMax: Number(kelBatasUsiaUmurMax)
        });
        showToast('Kelas berhasil diperbarui.');
        if (selectedKelas?.id === editingKelas.id) {
          setSelectedKelas({
            ...selectedKelas,
            nama: targetNama,
            waliKelas: kelWali.trim() || '-',
            tingkatan: kelTingkat,
            kapasitas: Number(kelKapasitas),
            batasUsiaHari: Number(kelBatasUsiaHari),
            batasUsiaBulan: Number(kelBatasUsiaBulan),
            batasUsiaUmurMin: Number(kelBatasUsiaUmurMin),
            batasUsiaUmurMax: Number(kelBatasUsiaUmurMax)
          });
        }
      } else {
        onAddKelas({
          id: 'K-' + Date.now(),
          lembagaId: selectedLembaga.id,
          nama: kelNama.trim(),
          waliKelas: kelWali.trim() || '-',
          tingkatan: kelTingkat,
          kapasitas: Number(kelKapasitas)
        });
        showToast('Kelas baru berhasil ditambahkan.');
      }
    }

    setIsKelasModalOpen(false);
  };

  const handleDeleteKelasClick = (id: string, name: string) => {
    if (activeTab !== 'Rombel' && isDefaultClass({ id, nama: name })) {
      alert('Kelas ini adalah kelas wajib bawaan lembaga dan tidak dapat dihapus.');
      return;
    }
    setClassToDelete({ id, name });
  };

  // --- Student Assignment Actions ---
  const handleRemoveStudentFromClass = (student: Santri) => {
    if (!selectedKelas) return;
    const label = activeTab === 'Rombel' ? 'kelompok' : 'kelas';
    setConfirmRemoveData({
      type: 'single',
      studentName: student.nama,
      studentId: student.id,
      label,
      className: selectedKelas.nama,
      onConfirm: () => {
        if (activeTab === 'Rombel') {
          if (onRemoveAssignment) {
            onRemoveAssignment(student.id, selectedKelas.id);
            showToast(`${student.nama} dikeluarkan dari kelompok.`);
          }
        } else {
          const isCalonPelajar = selectedKelas && isDefaultClass(selectedKelas);
          onUpdateSantriClass(student.id, 'Tanpa Kelas', selectedLembaga.id);
          if (isCalonPelajar) {
            showToast(`${student.nama} berhasil dikeluarkan dari lembaga.`);
          } else {
            showToast(`${student.nama} berhasil dikeluarkan dari kelas.`);
          }
        }
      }
    });
    setConfirmRemoveOpen(true);
  };

  const handleBulkRemoveStudentsFromClass = () => {
    if (!selectedKelas || selectedStudentIds.length === 0) return;
    const label = activeTab === 'Rombel' ? 'kelompok' : 'kelas';
    const count = selectedStudentIds.length;
    setConfirmRemoveData({
      type: 'bulk',
      count,
      label,
      className: selectedKelas.nama,
      onConfirm: () => {
        if (activeTab === 'Rombel') {
          if (onRemoveAssignment) {
            selectedStudentIds.forEach(studentId => {
              onRemoveAssignment(studentId, selectedKelas.id);
            });
            showToast(`${count} santri berhasil dikeluarkan dari kelompok.`);
          }
        } else {
          const isCalonPelajar = selectedKelas && isDefaultClass(selectedKelas);
          onUpdateSantriClassBatch(selectedStudentIds, 'Tanpa Kelas', selectedLembaga.id);
          if (isCalonPelajar) {
            showToast(`${count} santri berhasil dikeluarkan dari lembaga.`);
          } else {
            showToast(`${count} santri berhasil dikeluarkan dari kelas.`);
          }
        }
        setSelectedStudentIds([]);
        setIsSelectionMode(false);
      }
    });
    setConfirmRemoveOpen(true);
  };

  const handleExecuteTransfer = () => {
    if (!transferStudent || !destClassId || !selectedKelas) return;
    const targetLemId = transferLembagaId || selectedLembaga.id;

    if (activeTab === 'Rombel') {
      if (onRemoveAssignment && onAddAssignment) {
        // Remove from current
        onRemoveAssignment(transferStudent.id, selectedKelas.id);
        // Add to dest
        onAddAssignment({
          id: 'RA-' + Date.now(),
          santriId: transferStudent.id,
          kelompokId: destClassId,
          kategoriId: targetLemId
        });
        showToast(`${transferStudent.nama} berhasil dipindahkan.`);
      }
    } else {
      let destClassObj = kelasList.find(c => c.id === destClassId);
      if (!destClassObj && destClassId.startsWith('default-')) {
        destClassObj = {
          id: destClassId,
          lembagaId: String(targetLemId),
          nama: 'Calon Peserta Didik',
          waliKelas: '-',
          tingkatan: 'Lainnya',
          isDefault: true
        };
      }
      if (destClassObj) {
        onUpdateSantriClass(transferStudent.id, destClassObj.nama, targetLemId);
        const targetLemObj = lembagasList.find(l => l.id === targetLemId);
        showToast(`${transferStudent.nama} dipindahkan ke ${targetLemObj?.nama || ''} - kelas ${destClassObj.nama}.`);
      }
    }
    setTransferStudent(null);
    setDestClassId('');
    setTransferLembagaId('');
  };

  // Get active students eligible to be added to this Class/Group
  const getEligibleStudentsForAdd = () => {
    if (!selectedKelas) return [];

    const isAktif = (s: Santri) => (s.statusKeanggotaan || 'Aktif') === 'Aktif';

    let currentClassStudentIds: string[] = [];
    if (activeTab === 'Rombel') {
      currentClassStudentIds = assignmentsList
        .filter(a => a.kelompokId === selectedKelas.id)
        .map(a => a.santriId);
    } else {
      currentClassStudentIds = selectedLembaga ? getStudentsInClass(selectedKelas, selectedLembaga).map(s => s.id) : [];
    }

    const isFormalLembaga = selectedLembaga ? getLembagaJenis(selectedLembaga) === 'Formal' : activeTab === 'Formal';
    const isCalonClass = isDefaultClass(selectedKelas);

    return santriList.filter(s => {
      if (!isGenderMatch(s.gender, selectedGender)) return false;
      
      // Khusus pendidikan formal: bisa memasukkan santri aktif dan alumni, TETAPI TIDAK BISA yang meninggal.
      // Untuk non-formal / internal / rombel: hanya santri aktif.
      if (isFormalLembaga) {
        if (s.statusKeanggotaan === 'Meninggal') return false;
      } else {
        if (!isAktif(s)) return false;
      }

      if (currentClassStudentIds.includes(s.id)) return false;

      // Khusus pada modal tambah anggota yang dibuka di kelas lembaga formal (kecuali calon peserta didik):
      // buat daftar yang ditampilkan hanya yang EMIS sudah terdaftar.
      if (activeTab !== 'Rombel' && isFormalLembaga && !isCalonClass) {
        if (!isEmisTerdaftar(s.statusEmis)) {
          return false;
        }
      }

      return true;
    });
  };

  // Helper: Get formal institution and class section for a student
  const getFormalSectionForStudent = (s: Santri): { key: string; label: string } => {
    const matchingLembagas = lembagasList.filter(l => getLembagaJenis(l) === 'Formal' && isGenderMatch(l.gender, selectedGender));
    
    const getKodeBadge = (lem: Lembaga) => {
      const k = (lem.kode || generate4LetterKode(lem.nama)).toUpperCase().slice(0, 4);
      return `[${k}]`;
    };

    const l = matchingLembagas.find(lem => isStudentInLembaga(s, lem));
    if (!l) {
      return { key: 'Belum', label: 'Belum Tergabung' };
    }

    const classes = getClassesOfLembaga(l.id);
    const c = classes.find(cls => {
      const students = getStudentsInClass(cls, l);
      return students.some(st => st.id === s.id);
    });

    if (c) {
      return { key: `${l.id}:${c.id}`, label: `${getKodeBadge(l)} ${c.nama}` };
    }

    const defaultC = classes.find(isDefaultClass) || classes[0];
    if (defaultC) {
      return { key: `${l.id}:${defaultC.id}`, label: `${getKodeBadge(l)} ${defaultC.nama}` };
    }

    return { key: 'Belum', label: 'Belum Tergabung' };
  };

  const isAktif = (s: Santri) => (s.statusKeanggotaan || 'Aktif') === 'Aktif';

  const formalSectionsMap = useMemo<{ [key: string]: string }>(() => {
    if (!isAddMemberModalOpen || activeTab === 'Rombel' || activeTab === 'Internal') return {};
    const map: { [key: string]: string } = {};
    const matchingLembagas = lembagasList.filter(l => getLembagaJenis(l) === 'Formal' && isGenderMatch(l.gender, selectedGender));
    matchingLembagas.forEach(l => {
      const classes = getClassesOfLembaga(l.id);
      const kodeBadge = `[${(l.kode || generate4LetterKode(l.nama)).toUpperCase().slice(0, 4)}]`;
      classes.forEach(c => {
        if (selectedLembaga && selectedKelas && String(l.id) === String(selectedLembaga.id) && String(c.id) === String(selectedKelas.id)) {
          return; // Exclude target class being added to
        }
        const key = `${l.id}:${c.id}`;
        const label = `${kodeBadge} ${c.nama}`;
        map[key] = label;
      });
    });
    return map;
  }, [isAddMemberModalOpen, activeTab, lembagasList, selectedGender, selectedLembaga, selectedKelas, kelasList]);

  // Fast precomputed map for formal section lookup when modal is open
  const studentFormalSectionMap = useMemo(() => {
    if (!isAddMemberModalOpen || activeTab === 'Rombel' || activeTab === 'Internal') return new Map<string, { key: string; label: string }>();
    
    const map = new Map<string, { key: string; label: string }>();
    const matchingLembagas = lembagasList.filter(l => getLembagaJenis(l) === 'Formal' && isGenderMatch(l.gender, selectedGender));
    
    santriList.forEach(s => {
      if (!isGenderMatch(s.gender, selectedGender)) return;
      const l = matchingLembagas.find(lem => isStudentInLembaga(s, lem));
      if (!l) {
        map.set(s.id, { key: 'Belum', label: 'Belum Tergabung' });
        return;
      }

      const classes = getClassesOfLembaga(l.id);
      const getKodeBadge = (lem: Lembaga) => `[${(lem.kode || generate4LetterKode(lem.nama)).toUpperCase().slice(0, 4)}]`;

      const c = classes.find(cls => {
        const students = getStudentsInClass(cls, l);
        return students.some(st => st.id === s.id);
      });

      if (c) {
        map.set(s.id, { key: `${l.id}:${c.id}`, label: `${getKodeBadge(l)} ${c.nama}` });
      } else {
        const defaultC = classes.find(isDefaultClass) || classes[0];
        if (defaultC) {
          map.set(s.id, { key: `${l.id}:${defaultC.id}`, label: `${getKodeBadge(l)} ${defaultC.nama}` });
        } else {
          map.set(s.id, { key: 'Belum', label: 'Belum Tergabung' });
        }
      }
    });

    return map;
  }, [isAddMemberModalOpen, activeTab, lembagasList, selectedGender, kelasList, santriList]);

  const eligibleStudents = useMemo(() => {
    if (!isAddMemberModalOpen || !selectedKelas) return [];

    let currentClassStudentIds: string[] = [];
    if (activeTab === 'Rombel') {
      currentClassStudentIds = assignmentsList
        .filter(a => a.kelompokId === selectedKelas.id)
        .map(a => a.santriId);
    } else {
      currentClassStudentIds = selectedLembaga ? getStudentsInClass(selectedKelas, selectedLembaga).map(s => s.id) : [];
    }

    const currentClassSet = new Set(currentClassStudentIds);
    const isFormalLembaga = selectedLembaga ? getLembagaJenis(selectedLembaga) === 'Formal' : activeTab === 'Formal';
    const isCalonClass = isDefaultClass(selectedKelas);

    return santriList.filter(s => {
      if (!isGenderMatch(s.gender, selectedGender)) return false;
      
      if (isFormalLembaga) {
        if (s.statusKeanggotaan === 'Meninggal') return false;
      } else {
        if (!isAktif(s)) return false;
      }

      if (currentClassSet.has(s.id)) return false;

      if (activeTab !== 'Rombel' && isFormalLembaga && !isCalonClass) {
        if (!isEmisTerdaftar(s.statusEmis)) {
          return false;
        }
      }

      return true;
    });
  }, [isAddMemberModalOpen, selectedKelas, selectedLembaga, activeTab, selectedGender, assignmentsList, santriList, lembagasList, kelasList]);

  // Unselected eligible students (for left column)
  const unselectedEligibleStudents = useMemo(() => {
    if (!isAddMemberModalOpen) return [];
    const selectedSet = new Set(selectedModalStudentIds);
    return eligibleStudents.filter(s => !selectedSet.has(s.id));
  }, [isAddMemberModalOpen, eligibleStudents, selectedModalStudentIds]);

  const targetLembagaClasses = useMemo(() => {
    if (!isAddMemberModalOpen || !selectedLembaga) return [];
    return getClassesOfLembaga(selectedLembaga.id).filter(c => c.id !== selectedKelas?.id);
  }, [isAddMemberModalOpen, selectedLembaga, kelasList, selectedKelas]);

  const classStudentSets = useMemo<{ [classId: string]: Set<string> }>(() => {
    if (!isAddMemberModalOpen || !selectedLembaga || activeTab === 'Rombel') return {};
    const sets: { [classId: string]: Set<string> } = {};
    targetLembagaClasses.forEach(c => {
      sets[c.id] = new Set(getStudentsInClass(c, selectedLembaga).map(s => s.id));
    });
    return sets;
  }, [isAddMemberModalOpen, selectedLembaga, activeTab, targetLembagaClasses, santriList, selectedGender]);

  const searchedEligibleStudents = useMemo(() => {
    if (!isAddMemberModalOpen) return [];
    const q = addMemberSearch.trim().toLowerCase();
    
    return unselectedEligibleStudents.filter(s => {
      let belongingName = '';
      if (activeTab === 'Rombel') {
        const catId = selectedLembaga?.id || (selectedKelas ? groupsList.find(g => g.id === selectedKelas.id)?.kategoriId : undefined);
        const ass = assignmentsList.find(a => 
          a.santriId === s.id && 
          (
            (catId && a.kategoriId === catId) || 
            groupsList.some(g => g.id === a.kelompokId && g.kategoriId === catId)
          )
        );
        belongingName = ass ? (groupsList.find(g => g.id === ass.kelompokId)?.nama || '') : '';
      } else if (activeTab === 'Internal') {
        const foundClass = targetLembagaClasses.find(c => classStudentSets[c.id]?.has(s.id));
        belongingName = foundClass ? foundClass.nama : '';
      } else {
        const secInfo = studentFormalSectionMap.get(s.id) || getFormalSectionForStudent(s);
        belongingName = secInfo.label;
      }

      if (q) {
        const matchesSearch = (
          (s.nama || '').toLowerCase().includes(q) ||
          (s.desa && s.desa.toLowerCase().includes(q)) ||
          (s.kecamatan && s.kecamatan.toLowerCase().includes(q)) ||
          (s.kabupaten && s.kabupaten.toLowerCase().includes(q)) ||
          (s.alamat && s.alamat.toLowerCase().includes(q)) ||
          (s.asal && s.asal.toLowerCase().includes(q)) ||
          (belongingName && belongingName.toLowerCase().includes(q))
        );
        if (!matchesSearch) return false;
      }

      if (addMemberGroupFilter && addMemberGroupFilter !== 'Semua') {
        if (activeTab === 'Rombel') {
          const catId = selectedLembaga?.id || (selectedKelas ? groupsList.find(g => g.id === selectedKelas.id)?.kategoriId : undefined);
          const ass = assignmentsList.find(a => 
            a.santriId === s.id && 
            (
              (catId && a.kategoriId === catId) || 
              groupsList.some(g => g.id === a.kelompokId && g.kategoriId === catId)
            )
          );
          if (addMemberGroupFilter === 'Belum') {
            if (ass) return false;
          } else {
            if (!ass || ass.kelompokId !== addMemberGroupFilter) return false;
          }
        } else if (activeTab === 'Internal') {
          const foundClass = targetLembagaClasses.find(c => classStudentSets[c.id]?.has(s.id));
          if (addMemberGroupFilter === 'Belum') {
            if (foundClass) return false;
          } else {
            if (!foundClass || foundClass.id !== addMemberGroupFilter) return false;
          }
        } else {
          const secInfo = studentFormalSectionMap.get(s.id) || getFormalSectionForStudent(s);
          if (addMemberGroupFilter === 'Belum') {
            if (secInfo.key !== 'Belum') return false;
          } else {
            if (secInfo.key !== addMemberGroupFilter) return false;
          }
        }
      }

      return true;
    });
  }, [isAddMemberModalOpen, unselectedEligibleStudents, addMemberSearch, addMemberGroupFilter, activeTab, selectedLembaga, selectedKelas, groupsList, assignmentsList, targetLembagaClasses, classStudentSets, studentFormalSectionMap]);

  // Selected students in modal (for right column)
  const selectedStudentsForModal = useMemo(() => {
    if (!isAddMemberModalOpen) return [];
    const selectedSet = new Set(selectedModalStudentIds);
    return santriList.filter(s => selectedSet.has(s.id));
  }, [isAddMemberModalOpen, selectedModalStudentIds, santriList]);

  const handleConfirmAddMembers = () => {
    if (!selectedKelas || selectedModalStudentIds.length === 0) return;

    if (activeTab === 'Rombel') {
      if (onAddAssignment) {
        selectedModalStudentIds.forEach((id, idx) => {
          onAddAssignment({
            id: 'RA-' + Date.now() + '-' + idx + '-' + Math.random().toString(36).substring(2, 6),
            santriId: id,
            kelompokId: selectedKelas.id,
            kategoriId: selectedLembaga.id
          });
        });
      }
    } else {
      if (onUpdateSantriClassBatch) {
        onUpdateSantriClassBatch(selectedModalStudentIds, selectedKelas.nama, selectedLembaga.id);
      } else {
        selectedModalStudentIds.forEach(id => {
          onUpdateSantriClass(id, selectedKelas.nama, selectedLembaga.id);
        });
      }
    }

    showToast(`${selectedModalStudentIds.length} santri berhasil ditambahkan ke kelas ${selectedKelas.nama}.`);
    setSelectedModalStudentIds([]);
    setAddMemberSearch('');
    setIsAddMemberModalOpen(false);
  };

  // Render Student table avatars safely
  const renderStudentAvatar = (s: Santri) => {
    return renderSantriAvatar(s, "w-10 h-10 shrink-0 rounded-full border border-slate-100 shadow-xs");
  };

  const canWriteCurrent = selectedGender === 'Putra' ? canWritePutra : canWritePutri;

  // Compute Verval stats
  const totalStudents = currentClassStudents.length;
  const vervalSuksesCount = currentClassStudents.filter(s => (s.statusVerval || (s.nisn && s.nisn.trim() !== '' ? 'Sukses' : 'Proses')) === 'Sukses').length;
  const vervalProsesCount = totalStudents - vervalSuksesCount;
  const vervalSuksesPercent = totalStudents > 0 ? (vervalSuksesCount / totalStudents) * 100 : 0;
  const vervalProsesPercent = totalStudents > 0 ? (vervalProsesCount / totalStudents) * 100 : 0;
  
  const verifiedCount = vervalSuksesCount;
  const pendingCount = vervalProsesCount;
  const verifiedPercent = totalStudents > 0 ? Math.round((verifiedCount / totalStudents) * 100) : 0;
  const pendingPercent = totalStudents > 0 ? 100 - verifiedPercent : 0;

  // Compute EMIS stats (3 status: Terdaftar, Invalid, Belum)
  const emisTerdaftarCount = currentClassStudents.filter(s => s.statusEmis === 'Terdaftar').length;
  const emisInvalidCount = currentClassStudents.filter(s => s.statusEmis === 'Invalid').length;
  const emisBelumCount = currentClassStudents.filter(s => !s.statusEmis || s.statusEmis === 'Belum' || (s.statusEmis !== 'Terdaftar' && s.statusEmis !== 'Invalid')).length;
  const emisRegisteredCount = emisTerdaftarCount;
  
  const emisTerdaftarPercent = totalStudents > 0 ? (emisTerdaftarCount / totalStudents) * 100 : 0;
  const emisInvalidPercent = totalStudents > 0 ? (emisInvalidCount / totalStudents) * 100 : 0;
  const emisBelumPercent = totalStudents > 0 ? (emisBelumCount / totalStudents) * 100 : 0;

  // Pagination & Students logic calculated at component root for consistent sharing
  const itemsPerPage = 50;
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = (activePage - 1) * itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage);

  const isCalonPelajarPage = !!(selectedKelas && isDefaultClass(selectedKelas));
  const gridColsClass = 'grid-cols-[55px_240px_110px_110px_100px_100px_50px]';

  // Toggle selection for individual student
  const handleToggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds(prev => {
      const isSelected = prev.includes(studentId);
      const newSelected = isSelected
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId];
      if (newSelected.length === 0) {
        setIsSelectionMode(false);
      }
      return newSelected;
    });
  };

  const handleRowClick = (e: React.MouseEvent, s: Santri) => {
    if (!isSelectionMode) return;

    const target = e.target as HTMLElement;
    if (
      target.closest('button') || 
      target.closest('input') || 
      target.closest('select') || 
      target.closest('a') ||
      target.closest('.relative.inline-block') ||
      (target.classList.contains('cursor-pointer') && target.tagName === 'SPAN')
    ) {
      return;
    }

    handleToggleStudentSelection(s.id);
  };

  // Bulk remove students handler
  const handleBulkRemoveStudents = () => {
    if (selectedStudentIds.length === 0) {
      alert("Silakan pilih minimal 1 santri.");
      return;
    }
    if (!selectedKelas) return;
    const count = selectedStudentIds.length;
    const label = activeTab === 'Rombel' ? 'kelompok rombel' : 'kelas';
    setConfirmRemoveData({
      type: 'bulk',
      count,
      label,
      className: selectedKelas.nama,
      onConfirm: () => {
        if (activeTab === 'Rombel') {
          if (onRemoveAssignment && selectedKelas) {
            selectedStudentIds.forEach(id => {
              onRemoveAssignment(id, selectedKelas.id);
            });
            showToast(`${count} santri berhasil dikeluarkan dari kelompok.`);
          }
        } else {
          const isCalonPelajar = selectedKelas && isDefaultClass(selectedKelas);
          if (onUpdateSantriClassBatch) {
            onUpdateSantriClassBatch(selectedStudentIds, 'Tanpa Kelas', selectedLembaga.id);
          } else {
            selectedStudentIds.forEach(id => {
              onUpdateSantriClass(id, 'Tanpa Kelas', selectedLembaga.id);
            });
          }
          if (isCalonPelajar) {
            showToast(`${count} santri berhasil dikeluarkan dari lembaga.`);
          } else {
            showToast(`${count} santri berhasil dikeluarkan dari kelas.`);
          }
        }
        setSelectedStudentIds([]);
        setIsSelectionMode(false);
      }
    });
    setConfirmRemoveOpen(true);
  };

  // Bulk transfer student execution
  const handleExecuteBulkTransfer = () => {
    if (!bulkDestClassId || !selectedKelas) return;
    const targetLemId = bulkTransferLembagaId || selectedLembaga.id;

    const selectedStudents = santriList.filter(s => selectedStudentIds.includes(s.id));
    
    if (activeTab === 'Rombel') {
      if (onRemoveAssignment && onAddAssignment) {
        selectedStudents.forEach(s => {
          onRemoveAssignment(s.id, selectedKelas.id);
          onAddAssignment({
            id: 'RA-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
            santriId: s.id,
            kelompokId: bulkDestClassId,
            kategoriId: targetLemId
          });
        });
        showToast(`${selectedStudents.length} santri berhasil dipindahkan.`);
      }
    } else {
      let destClassObj = kelasList.find(c => c.id === bulkDestClassId);
      if (!destClassObj && bulkDestClassId.startsWith('default-')) {
        destClassObj = {
          id: bulkDestClassId,
          lembagaId: String(targetLemId),
          nama: 'Calon Peserta Didik',
          waliKelas: '-',
          tingkatan: 'Lainnya',
          isDefault: true
        };
      }
      if (destClassObj) {
        if (onUpdateSantriClassBatch) {
          onUpdateSantriClassBatch(selectedStudents.map(s => s.id), destClassObj.nama, targetLemId);
        } else {
          selectedStudents.forEach(s => {
            onUpdateSantriClass(s.id, destClassObj.nama, targetLemId);
          });
        }
        const targetLemObj = lembagasList.find(l => l.id === targetLemId);
        showToast(`${selectedStudents.length} santri berhasil dipindahkan ke ${targetLemObj?.nama || ''} - kelas ${destClassObj.nama}.`);
      }
    }
    
    setSelectedStudentIds([]);
    setIsSelectionMode(false);
    setIsBulkTransferOpen(false);
    setBulkDestClassId('');
    setBulkTransferLembagaId('');
  };

  // Handle printing PDF / document for the selected institution (Lembaga)
  const handlePrintLembagaPDF = () => {
    if (!selectedLembaga) return;
    const profile = getPesantrenProfile();
    
    // Get all students for this institution
    const lembagaStudents = santriList.filter(s => {
      if (s.gender !== selectedGender) return false;
      return s.pendidikanInternal ? s.pendidikanInternal.split(',').map(x => x.trim()).includes(selectedLembaga.id) : false;
    });

    if (lembagaStudents.length === 0) {
      alert(`Tidak ada data santri pada ${selectedLembaga.nama}.`);
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Gagal membuka jendela cetak. Pastikan pop-up dibolehkan di peramban Anda.');
      return;
    }

    const dateStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const rowsHtml = lembagaStudents.map((s, idx) => `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td>${s.nis || '-'}</td>
        <td><strong>${s.nama}</strong></td>
        <td>${s.gender || '-'}</td>
        <td>${s.kelas || 'Calon Peserta Didik'}</td>
        <td style="text-align: center;">${s.statusKeanggotaan || 'Aktif'}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>DAFTAR SANTRI - ${selectedLembaga.nama.toUpperCase()}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: sans-serif; color: #1e293b; margin: 0; padding: 10px; font-size: 11px; }
          .header { text-align: center; border-bottom: 2px solid #00693E; padding-bottom: 10px; margin-bottom: 15px; }
          .header h1 { margin: 0; font-size: 18px; color: #00693E; font-weight: bold; }
          .header p { margin: 3px 0 0; font-size: 11px; color: #64748b; }
          .title { text-align: center; font-size: 14px; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; }
          .info { margin-bottom: 12px; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 10px; text-align: left; }
          th { background-color: #f1f5f9; font-weight: bold; color: #334155; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .footer { margin-top: 25px; text-align: right; font-size: 10px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${profile.namaPesantren || 'PONDOK PESANTREN'}</h1>
          <p>${profile.alamat || ''} ${(profile as any).kota ? ' - ' + (profile as any).kota : ''}</p>
        </div>
        <div class="title">DAFTAR SANTRI - ${selectedLembaga.nama}</div>
        <div class="info">
          <strong>Gender:</strong> Santri ${selectedGender} | <strong>Total Santri:</strong> ${lembagaStudents.length} Santri
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">No</th>
              <th style="width: 90px;">NIS</th>
              <th>Nama Santri</th>
              <th style="width: 60px;">Gender</th>
              <th style="width: 120px;">Kelas</th>
              <th style="width: 70px; text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <div class="footer">
          Dicetak pada: ${dateStr}
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Handle printing PDF / document for the selected class (Kelas)
  const handlePrintKelasPDF = () => {
    if (!selectedKelas || !selectedLembaga) return;
    const profile = getPesantrenProfile();
    
    const studentsInClass = currentClassStudents;

    if (studentsInClass.length === 0) {
      alert(`Tidak ada data santri pada kelas ${selectedKelas.nama}.`);
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Gagal membuka jendela cetak. Pastikan pop-up dibolehkan di peramban Anda.');
      return;
    }

    const dateStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const isFormal = activeTab === 'Formal';

    const rowsHtml = studentsInClass.map((s, idx) => `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td>${s.nis || '-'}</td>
        <td><strong>${s.nama}</strong></td>
        ${isFormal ? `
          <td>${s.statusEmis || '-'}</td>
          <td>${s.statusVerval || '-'}</td>
        ` : `
          <td>${s.kamar || '-'}</td>
        `}
        <td style="text-align: center;">${s.statusKeanggotaan || 'Aktif'}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>DAFTAR SANTRI KELAS ${selectedKelas.nama.toUpperCase()} - ${selectedLembaga.nama.toUpperCase()}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: sans-serif; color: #1e293b; margin: 0; padding: 10px; font-size: 11px; }
          .header { text-align: center; border-bottom: 2px solid #00693E; padding-bottom: 10px; margin-bottom: 15px; }
          .header h1 { margin: 0; font-size: 18px; color: #00693E; font-weight: bold; }
          .header p { margin: 3px 0 0; font-size: 11px; color: #64748b; }
          .title { text-align: center; font-size: 14px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; }
          .subtitle { text-align: center; font-size: 12px; font-weight: bold; color: #00693E; margin-bottom: 15px; }
          .info { margin-bottom: 12px; font-size: 11px; display: flex; justify-content: space-between; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 10px; text-align: left; }
          th { background-color: #f1f5f9; font-weight: bold; color: #334155; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .footer { margin-top: 25px; text-align: right; font-size: 10px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${profile.namaPesantren || 'PONDOK PESANTREN'}</h1>
          <p>${profile.alamat || ''} ${(profile as any).kota ? ' - ' + (profile as any).kota : ''}</p>
        </div>
        <div class="title">DAFTAR SANTRI KELAS: ${selectedKelas.nama}</div>
        <div class="subtitle">${selectedLembaga.nama} (${selectedGender})</div>
        <div class="info">
          <span><strong>Wali Kelas / Pembimbing:</strong> ${selectedKelas.waliKelas || '-'}</span>
          <span><strong>Total Santri:</strong> ${studentsInClass.length} Santri</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">No</th>
              <th style="width: 90px;">NIS</th>
              <th>Nama Santri</th>
              ${isFormal ? `
                <th style="width: 90px;">Status EMIS</th>
                <th style="width: 90px;">Status Verval</th>
              ` : `
                <th style="width: 100px;">Kamar</th>
              `}
              <th style="width: 70px; text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <div class="footer">
          Dicetak pada: ${dateStr}
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      
      {/* LOCAL TOAST NOTIFICATION POPUP */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div className={`px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 border ${
              toast.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {toast.type === 'success' ? (
                <div className="h-5 w-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">✓</div>
              ) : (
                <div className="h-5 w-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs font-bold">!</div>
              )}
              <span className="text-xs font-bold">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Header with Title & Gender Toggle Switcher (HIDDEN WHEN IN split-view) */}
      {!selectedLembaga && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl flex flex-wrap items-center gap-x-2">
              <span>Aktivitas Akademik</span>
              <span 
                onClick={() => {
                  setSelectedGender(selectedGender === 'Putra' ? 'Putri' : 'Putra');
                  setSelectedLembaga(null);
                  setSelectedKelas(null);
                }}
                className={`inline-flex items-center gap-1.5 transition-all duration-200 select-none cursor-pointer active:scale-95 ${
                  selectedGender === 'Putra' 
                    ? 'text-indigo-600 hover:text-indigo-700' 
                    : 'text-rose-600 hover:text-rose-700'
                }`}
                title="Klik untuk mengubah filter gender (Putra ⇄ Putri)"
              >
                <span>
                  {selectedGender === 'Putra' ? 'Santri Putra' : 'Santri Putri'}
                </span>
                <ArrowLeftRight className="h-5 w-5 mt-0.5 shrink-0" />
              </span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {activeTab === 'Formal'
                ? 'Pengelolaan Satuan Pendidikan Formal, Lembaga, dan Kelas Santri secara terpadu.'
                : activeTab === 'Rombel'
                ? 'Pengelolaan Kategori Rombel, Kelompok Belajar, dan Penugasan Santri secara terpadu.'
                : 'Pengelolaan Satuan Pendidikan Internal Pondok dan Rombongan Belajar Santri secara terpadu.'}
            </p>
          </div>
        </div>
      )}

      {/* 2. Full Width Horizontal Tab Bar (HIDDEN WHEN IN split-view) */}
      {!selectedLembaga && (
        <div className="w-full border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
          <div className="flex space-x-8">
            <button
              onClick={() => handleTabChange('Formal')}
              className={`pb-4 text-sm font-bold tracking-tight border-b-2 transition-all cursor-pointer ${
                activeTab === 'Formal'
                  ? 'border-emerald-600 text-emerald-600 font-extrabold'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Pendidikan Formal
            </button>
            <button
              onClick={() => handleTabChange('Internal')}
              className={`pb-4 text-sm font-bold tracking-tight border-b-2 transition-all cursor-pointer ${
                activeTab === 'Internal'
                  ? 'border-emerald-600 text-emerald-600 font-extrabold'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Pendidikan Internal Pondok
            </button>
            <button
              onClick={() => handleTabChange('Rombel')}
              className={`pb-4 text-sm font-bold tracking-tight border-b-2 transition-all cursor-pointer ${
                activeTab === 'Rombel'
                  ? 'border-emerald-600 text-emerald-600 font-extrabold'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Rombongan Belajar
            </button>
          </div>

          {canWriteCurrent && (
            <button
              onClick={() => handleOpenLembagaModal()}
              className="mb-3 sm:mb-0 inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>{activeTab === 'Rombel' ? 'Buat Kategori Rombel' : 'Buat Lembaga'}</span>
            </button>
          )}
        </div>
      )}

      {/* MAIN VIEWPORT */}
      <AnimatePresence mode="wait">
        
        {/* GRID OF CARDS (Formal, Internal, Rombel categories) when no institution/category selected */}
        {!selectedLembaga ? (
          <motion.div
            key="lembaga-grid-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {institutions.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
                <School className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-700">Belum Ada Satuan Data</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Belum ada data terdaftar untuk gender {selectedGender}. Silakan buat data baru untuk memulai penataan kelas.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {institutions.map((l: any) => {
                  return (
                    <div
                      key={l.id}
                      onClick={() => setSelectedLembaga(l)}
                      className="group relative bg-white border border-slate-100 rounded-2xl cursor-pointer transition-all hover:border-slate-300 hover:shadow-md flex h-32 overflow-hidden"
                    >
                      {/* Logo or placeholder icon on the left */}
                      <div className="w-32 bg-slate-50 flex items-center justify-center shrink-0 border-r border-slate-100 relative overflow-hidden">
                        {l.logo ? (
                          <div className="w-full h-full relative">
                            <img
                              src={getLogoUrl(l.logo)}
                              alt={l.nama}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const sibling = e.currentTarget.nextElementSibling;
                                if (sibling) (sibling as HTMLElement).classList.remove('hidden');
                              }}
                            />
                            <div className="hidden w-full h-full flex flex-col items-center justify-center p-2 text-slate-300 text-center bg-slate-50">
                              {activeTab === 'Rombel' ? (
                                <Award className="h-8 w-8 text-slate-300" />
                              ) : (
                                <School className="h-8 w-8 text-slate-300" />
                              )}
                              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 mt-1">
                                {l.kode.slice(0, 5).toUpperCase()}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center p-2 text-slate-300 text-center">
                            {activeTab === 'Rombel' ? (
                              <Award className="h-8 w-8 text-slate-300" />
                            ) : (
                              <School className="h-8 w-8 text-slate-300" />
                            )}
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 mt-1">
                              {l.kode.slice(0, 5).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Card Content on the right */}
                      <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="text-base font-black text-slate-800 leading-tight group-hover:text-emerald-700 transition-colors truncate">
                                {l.nama}
                              </h3>
                              {l.deskripsi && (
                                <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                                  {l.deskripsi}
                                </p>
                              )}
                            </div>

                            {/* Three-dot Dropdown */}
                            {canWriteCurrent && (
                              <div className="relative shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuLembagaId(activeMenuLembagaId === l.id ? null : l.id);
                                  }}
                                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
                                  title="Menu"
                                >
                                  <MoreVertical className="h-4.5 w-4.5" />
                                </button>
                                {activeMenuLembagaId === l.id && (
                                  <>
                                    <div 
                                      className="fixed inset-0 z-10" 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveMenuLembagaId(null);
                                      }}
                                    />
                                    <div className="absolute right-0 mt-1 w-28 bg-white border border-slate-200 rounded-xl shadow-lg z-25 py-1 text-xs font-bold text-slate-700">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveMenuLembagaId(null);
                                          handleOpenLembagaModal(l);
                                        }}
                                        className="w-full text-left px-3 py-1.5 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveMenuLembagaId(null);
                                          handleDeleteLembagaClick(l.id, l.nama);
                                        }}
                                        className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
                                      >
                                        Hapus
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Stats counters */}
                        <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <BookOpen className="h-4 w-4 text-slate-400 shrink-0" />
                            <span>{l.classesCount} {activeTab === 'Rombel' ? 'Kelompok' : 'Kelas'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Users className="h-4 w-4 text-slate-400 shrink-0" />
                            <span>{l.studentsCount} Santri</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
                  /* 3. WIDESCREEN 30/70 SPLIT LAYOUT (Halaman tampilan luas yang memanfaatkan seluruh lebar layar) */
          <motion.div
            key="split-view-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-slate-50/50 rounded-2xl p-0 border-none shadow-none animate-fade-in"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
              
              {/* LEFT COLUMN (30% Width - col-span-4) - Styled as a beautiful high-contrast card with fixed desktop height */}
              <div className="lg:col-span-4 bg-white border border-slate-100 rounded-2xl px-5 py-6 flex flex-col relative lg:h-[680px] min-h-[500px] shadow-xs overflow-hidden">
                
                {/* Top Header Bar inside Left Column (Back Button & Centered Keterangan aligned vertically) */}
                <div className="relative flex items-center justify-center w-full min-h-[36px] mb-3 shrink-0">
                  <button
                    disabled={isSelectionMode}
                    onClick={() => {
                      if (isSelectionMode) return;
                      setSelectedLembaga(null);
                      setSelectedKelas(null);
                    }}
                    className={`absolute left-0 w-9 h-9 rounded-full border border-slate-100 flex items-center justify-center bg-white transition-all shrink-0 z-10 ${
                      isSelectionMode 
                        ? 'opacity-40 cursor-not-allowed text-slate-300' 
                        : 'hover:bg-slate-50 cursor-pointer text-slate-500 shadow-3xs'
                    }`}
                    title="Kembali ke Daftar Unit"
                  >
                    <ArrowLeft className="h-4.5 w-4.5 text-slate-500" />
                  </button>

                  <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest text-center px-10 leading-none">
                    {activeTab === 'Formal'
                      ? 'Pendidikan Formal'
                      : activeTab === 'Rombel'
                      ? 'Rombongan Belajar'
                      : 'Pendidikan Internal Pondok'}
                  </span>
                </div>

                {/* Center Logo & Name Header */}
                <div className="flex flex-col items-center text-center mt-2 mb-5 shrink-0">
                  {/* Circle Logo (No Outline) */}
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-50 flex items-center justify-center mb-4 shadow-3xs">
                    {selectedLembaga.logo ? (
                      <div className="w-full h-full relative flex items-center justify-center">
                        <img 
                          src={getLogoUrl(selectedLembaga.logo)} 
                          alt={selectedLembaga.nama} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer" 
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const sibling = e.currentTarget.nextElementSibling;
                            if (sibling) (sibling as HTMLElement).classList.remove('hidden');
                          }}
                        />
                        <div className="hidden flex items-center justify-center w-full h-full">
                          {activeTab === 'Rombel' ? (
                            <Award className="h-10 w-10 text-emerald-600" />
                          ) : (
                            <School className="h-10 w-10 text-emerald-600" />
                          )}
                        </div>
                      </div>
                    ) : activeTab === 'Rombel' ? (
                      <Award className="h-10 w-10 text-emerald-600" />
                    ) : (
                      <School className="h-10 w-10 text-emerald-600" />
                    )}
                  </div>

                  {/* Institution Name & 4-letter Kode Badge */}
                  <div className="flex items-center justify-center gap-2 max-w-full px-2">
                    <h2 className="text-xl font-black text-slate-800 tracking-tight leading-tight uppercase truncate">
                      {selectedLembaga.nama}
                    </h2>
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider border border-emerald-200/80 shrink-0 shadow-2xs">
                      {(selectedLembaga.kode || generate4LetterKode(selectedLembaga.nama)).toUpperCase().slice(0, 4)}
                    </span>
                  </div>
                  
                  {/* Stats */}
                  <p className="text-[11px] font-extrabold text-slate-400 mt-1 uppercase tracking-wider">
                    {subClasses.length} {activeTab === 'Rombel' ? 'Kelompok' : 'Kelas'} &bull; {institutions.find(x => x.id === selectedLembaga.id)?.studentsCount || 0} Santri
                  </p>

                  {/* Action Buttons: Print & Edit Pencil */}
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <button
                      disabled={isSelectionMode}
                      onClick={handlePrintLembagaPDF}
                      className="inline-flex items-center justify-center bg-white border border-slate-200 h-8 w-8 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-3xs active:scale-95 transition-all disabled:opacity-40"
                      title="Cetak Data Lembaga"
                    >
                      <Printer className="h-4 w-4 text-slate-600" />
                    </button>
                    {canWriteCurrent && (
                      <>
                        <button
                          disabled={isSelectionMode}
                          onClick={() => handleOpenLembagaModal(selectedLembaga)}
                          className="inline-flex items-center justify-center bg-white border border-slate-200 h-8 w-8 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-3xs active:scale-95 transition-all disabled:opacity-40"
                          title="Edit Lembaga"
                        >
                          <Pencil className="h-4 w-4 text-slate-600" />
                        </button>
                        <button
                          disabled={isSelectionMode}
                          onClick={() => {
                            if (isSelectionMode) return;
                            handleDeleteLembagaClick(selectedLembaga.id, selectedLembaga.nama);
                          }}
                          className={`inline-flex items-center justify-center border h-8 w-8 rounded-xl text-xs font-bold transition-all shrink-0 ${
                            isSelectionMode 
                              ? 'bg-rose-50/50 border-rose-50/50 opacity-40 cursor-not-allowed text-rose-350' 
                              : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-150 cursor-pointer shadow-3xs active:scale-95'
                          }`}
                          title={activeTab === 'Rombel' ? 'Hapus Kategori Rombel' : 'Hapus Lembaga'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Thin horizontal divider line */}
                <div className="border-t border-slate-100/80 my-4 w-full shrink-0" />

                {/* Daftar Kelas Panel */}
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  {/* Centered Title with Plus button */}
                  <div className="flex items-center justify-between mb-4.5 px-1 shrink-0">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                      Daftar {activeTab === 'Rombel' ? 'Rombel' : 'Kelas'}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {canWriteCurrent && (
                        <button
                          disabled={isSelectionMode}
                          onClick={() => {
                            if (isSelectionMode) return;
                            handleOpenKelasModal();
                          }}
                          className={`w-8 h-8 rounded-lg bg-[#00693E] text-white flex items-center justify-center transition-all shrink-0 ${
                            isSelectionMode 
                              ? 'opacity-40 cursor-not-allowed' 
                              : 'hover:bg-emerald-800 hover:scale-105 cursor-pointer shadow-xs'
                          }`}
                          title={activeTab === 'Rombel' ? 'Tambah Kelompok Rombel' : 'Tambah Kelas'}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Scrollable list */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                    {subClasses.length === 0 ? (
                      <div className="text-center py-10 text-slate-400 text-xs font-medium italic">
                        Belum ada {activeTab === 'Rombel' ? 'kelompok' : 'kelas'} terdaftar.
                      </div>
                    ) : (
                      subClasses.map((c: any) => {
                        const isSelected = selectedKelas?.id === c.id;
                        const isDefault = activeTab !== 'Rombel' && isDefaultClass(c);
                        
                        return (
                          <div
                            key={c.id}
                            onClick={() => {
                              if (isSelectionMode) return;
                              setSelectedKelas(c);
                            }}
                            className={`group p-4 rounded-2xl transition-all flex items-center justify-between relative select-none ${
                              isSelectionMode
                                ? 'opacity-50 cursor-not-allowed'
                                : 'cursor-pointer'
                            } ${
                              isSelected 
                                ? 'bg-[#00693E] text-white shadow-sm' 
                                : 'bg-[#EFEFEF]/80 text-slate-700 hover:bg-[#EFEFEF]'
                            }`}
                          >
                            <div className="flex items-center gap-3 truncate">
                              {isSelected ? (
                                <FolderOpen className="h-5 w-5 text-white shrink-0" />
                              ) : (
                                <Folder className="h-5 w-5 text-slate-400 shrink-0" />
                              )}
                              <span className="text-xs font-black truncate uppercase tracking-wider">
                                {c.nama}
                              </span>
                            </div>

                            {/* Titik 3 Action Button with Dropdown (No icons, text only as requested) */}
                            {canWriteCurrent && (
                              <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                                <button
                                  disabled={isSelectionMode}
                                  onClick={(e) => {
                                    if (isSelectionMode) return;
                                    if (activeActionKelasId === c.id) {
                                      setActiveActionKelasId(null);
                                      setKelasDropdownPos(null);
                                    } else {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      const dropdownWidth = 112;
                                      const dropdownHeight = 80;
                                      let top = rect.bottom;
                                      if (top + dropdownHeight > window.innerHeight) {
                                        top = rect.top - dropdownHeight;
                                      }
                                      let left = rect.right - dropdownWidth;
                                      if (left < 8) left = 8;
                                      if (left + dropdownWidth > window.innerWidth - 8) {
                                        left = window.innerWidth - dropdownWidth - 8;
                                      }
                                      setKelasDropdownPos({ top, left });
                                      setActiveActionKelasId(c.id);
                                    }
                                  }}
                                  className={`p-1 rounded-md transition-colors ${
                                    isSelectionMode 
                                      ? 'opacity-30 cursor-not-allowed text-slate-350' 
                                      : 'cursor-pointer'
                                  } ${
                                    isSelected 
                                      ? 'hover:bg-emerald-800 text-emerald-100' 
                                      : 'hover:bg-slate-200 text-slate-400 hover:text-slate-750'
                                  }`}
                                  title="Opsi Aksi"
                                >
                                  <MoreVertical className="h-4 w-4 text-current" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN (70% Width - col-span-8) - Styled as a beautiful high-contrast card with fixed desktop height */}
              <div className="lg:col-span-8 bg-white border border-slate-100 rounded-2xl px-5 py-6 flex flex-col relative lg:h-[680px] min-h-[500px] shadow-xs">
                
                {!selectedKelas ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center h-full p-12">
                    <GraduationCap className="h-16 w-16 text-slate-300 mb-4 animate-pulse" />
                    <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Silakan Pilih Kelas</h3>
                    <p className="text-xs text-slate-400 max-w-xs mt-2 font-medium">
                      Pilih salah satu kelas di bawah naungan {selectedLembaga.nama} pada panel kiri untuk melihat daftar anggotanya.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                    
                    {/* 1. Detail Kelas Card Top Section */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 shrink-0">
                      <div className="flex items-center gap-3">
                        <button
                          disabled={isSelectionMode}
                          onClick={() => {
                            if (isSelectionMode) return;
                            setSelectedKelas(null);
                          }}
                          className={`p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all cursor-pointer shadow-3xs shrink-0 ${
                            isSelectionMode ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'
                          }`}
                          title="Kembali ke Daftar Kelas"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </button>
                        <div>
                          <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Detail Kelas</span>
                          <h2 className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight leading-none uppercase mt-0.5">
                            {selectedKelas.nama}
                          </h2>
                        </div>
                      </div>

                      {/* Class Action Buttons directly visible */}
                      <div className="flex items-center gap-1.5 self-start sm:self-auto">
                        <button
                          disabled={isSelectionMode}
                          onClick={handlePrintKelasPDF}
                          className="inline-flex items-center justify-center bg-white border border-slate-200 h-8 w-8 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-3xs active:scale-95 transition-all disabled:opacity-40 shrink-0"
                          title="Cetak Data Kelas"
                        >
                          <Printer className="h-4 w-4 text-slate-600" />
                        </button>
                        {canWriteCurrent && (() => {
                          const isRombelTab = (activeTab as string) === 'Rombel';
                          const isSelectedKelasDefault = !isRombelTab && isDefaultClass(selectedKelas);
                          return (
                            <>
                              <button
                                disabled={isSelectionMode}
                                onClick={() => {
                                  if (isSelectionMode) return;
                                  handleOpenKelasModal(selectedKelas);
                                }}
                                className={`inline-flex items-center justify-center bg-white border border-slate-200 h-8 w-8 rounded-xl text-xs font-bold transition-all shrink-0 ${
                                  isSelectionMode 
                                    ? 'opacity-40 cursor-not-allowed text-slate-350' 
                                    : 'hover:bg-slate-50 cursor-pointer text-slate-700 shadow-3xs active:scale-95'
                                }`}
                                title="Edit Kelas"
                              >
                                <Pencil className="h-4 w-4 text-slate-500" />
                              </button>
                            
                              <button
                                disabled={isSelectionMode}
                                onClick={() => {
                                  if (isSelectionMode) return;
                                  setAddMemberSearch('');
                                  setAddMemberGroupFilter('Semua');
                                  setIsAddMemberModalOpen(true);
                                }}
                                className={`inline-flex items-center justify-center gap-1.5 px-3 border h-8 rounded-xl text-xs font-bold transition-all shrink-0 ${
                                  isSelectionMode 
                                    ? 'bg-emerald-50/55 border-emerald-50/55 opacity-40 cursor-not-allowed text-emerald-350' 
                                    : 'bg-emerald-50 hover:bg-emerald-100/80 text-[#00693E] border border-emerald-100 cursor-pointer shadow-3xs active:scale-95'
                                }`}
                                title={isRombelTab ? 'Tambah Anggota Rombel' : 'Tambah Santri'}
                              >
                                <UserPlus className="h-4 w-4" />
                                <span className="hidden sm:inline">
                                  {isRombelTab ? 'Tambah Anggota' : 'Tambah Santri'}
                                </span>
                              </button>

                              {!isSelectedKelasDefault && (
                                <button
                                  disabled={isSelectionMode}
                                  onClick={() => {
                                    if (isSelectionMode) return;
                                    handleDeleteKelasClick(selectedKelas.id, selectedKelas.nama);
                                  }}
                                  className={`inline-flex items-center justify-center border h-8 w-8 rounded-xl text-xs font-bold transition-all shrink-0 ${
                                    isSelectionMode 
                                      ? 'bg-rose-50/50 border-rose-50/50 opacity-40 cursor-not-allowed text-rose-350' 
                                      : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-150 cursor-pointer shadow-3xs active:scale-95'
                                  }`}
                                  title="Hapus Kelas"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* 2. BENTO STATS CARDS */}
                    <div className={`grid grid-cols-1 ${
                      activeTab === 'Formal' 
                        ? (isCalonPelajarPage ? 'sm:grid-cols-2' : 'sm:grid-cols-3') 
                        : (isCalonPelajarPage ? 'sm:grid-cols-1' : 'sm:grid-cols-2')
                    } gap-5 mb-6 shrink-0`}>
                      
                       {/* Card 1: Wali Kelas / Pembimbing */}
                       {!isCalonPelajarPage && (
                         <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-2xs flex flex-col justify-between">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2.5">
                             {activeTab === 'Rombel' ? 'PEMBIMBING' : 'WALI KELAS'}
                           </span>
                           <div className="flex items-center gap-3">
                             <div className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                               <User className="h-4.5 w-4.5 text-[#046A38]" />
                             </div>
                             <span className="text-sm font-extrabold text-slate-800 truncate" title={selectedKelas.waliKelas || selectedKelas.pembimbing || '-'}>
                               {selectedKelas.waliKelas || selectedKelas.pembimbing || '-'}
                             </span>
                           </div>
                         </div>
                       )}

                      {/* Card 2: Jumlah Santri */}
                      <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-2xs flex flex-col justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2.5">JUMLAH SANTRI</span>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-emerald-50 text-[#046A38] flex items-center justify-center shrink-0">
                            <Users className="h-4 w-4" />
                          </div>
                          <span className="text-sm font-black text-[#046A38]">
                            {totalStudents} Santri
                          </span>
                        </div>
                      </div>

                      {/* Card 3: Verval / EMIS Status Bar Chart - Hanya untuk Pendidikan Formal */}
                      {activeTab === 'Formal' && (
                        isCalonPelajarPage ? (
                          <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-2xs flex flex-col justify-between min-h-[105px]">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">STATUS EMIS</span>
                            </div>
                            <div className="flex flex-col gap-2">
                              {/* Stacked Progress Bar (3 Warna: Hijau Terdaftar, Merah Invalid, Abu-abu Belum) */}
                              <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden flex shadow-2xs my-0.5">
                                {emisTerdaftarPercent > 0 && (
                                  <div 
                                    className="bg-emerald-500 h-full transition-all duration-500" 
                                    style={{ width: `${emisTerdaftarPercent}%` }} 
                                    title={`Terdaftar: ${emisTerdaftarCount}`}
                                  />
                                )}
                                {emisInvalidPercent > 0 && (
                                  <div 
                                    className="bg-rose-500 h-full transition-all duration-500" 
                                    style={{ width: `${emisInvalidPercent}%` }} 
                                    title={`Invalid: ${emisInvalidCount}`}
                                  />
                                )}
                                {emisBelumPercent > 0 && (
                                  <div 
                                    className="bg-slate-300 h-full transition-all duration-500" 
                                    style={{ width: `${emisBelumPercent}%` }} 
                                    title={`Belum: ${emisBelumCount}`}
                                  />
                                )}
                              </div>

                              {/* Keterangan jumlah masing-masing di bawah bar */}
                              <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 pt-0.5">
                                <div className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0"></span>
                                  <span>Terdaftar: <strong className="font-black text-slate-800">{emisTerdaftarCount}</strong></span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block shrink-0"></span>
                                  <span>Invalid: <strong className="font-black text-slate-800">{emisInvalidCount}</strong></span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-slate-400 inline-block shrink-0"></span>
                                  <span>Belum: <strong className="font-black text-slate-800">{emisBelumCount}</strong></span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-2xs flex flex-col justify-between min-h-[105px]">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">STATUS VERVAL</span>
                            </div>
                            <div className="flex flex-col gap-2">
                              {/* Stacked Progress Bar (2 Warna: Hijau Sukses, Merah Proses) */}
                              <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden flex shadow-2xs my-0.5">
                                {vervalSuksesPercent > 0 && (
                                  <div 
                                    className="bg-emerald-500 h-full transition-all duration-500" 
                                    style={{ width: `${vervalSuksesPercent}%` }} 
                                    title={`Sukses: ${vervalSuksesCount}`}
                                  />
                                )}
                                {vervalProsesPercent > 0 && (
                                  <div 
                                    className="bg-rose-500 h-full transition-all duration-500" 
                                    style={{ width: `${vervalProsesPercent}%` }} 
                                    title={`Proses: ${vervalProsesCount}`}
                                  />
                                )}
                              </div>

                              {/* Keterangan jumlah masing-masing di bawah bar */}
                              <div className="flex items-center justify-start gap-6 text-[10px] font-bold text-slate-600 pt-0.5">
                                <div className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0"></span>
                                  <span>Sukses: <strong className="font-black text-slate-800">{vervalSuksesCount}</strong></span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block shrink-0"></span>
                                  <span>Proses: <strong className="font-black text-slate-800">{vervalProsesCount}</strong></span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      )}

                    </div>

                    {/* 2.5 SEARCH BOX & FILTER ABOVE THE TABLE */}
                    <div className="mb-4 shrink-0 flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                          }}
                          placeholder="Cari berdasarkan nama, NIK, NIS, NISN, atau NISM..."
                          className="w-full h-11 pl-11 pr-10 bg-slate-50 border border-slate-100/80 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-450 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-600/20 focus:border-[#00693E] transition-all shadow-3xs"
                        />
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                          <Search className="h-4.5 w-4.5 text-slate-400" />
                        </div>
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery('');
                              setCurrentPage(1);
                            }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer rounded-full hover:bg-slate-100 transition-all flex items-center justify-center"
                            title="Bersihkan Pencarian"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Status Filter Select (Hanya untuk Pendidikan Formal) */}
                      {activeTab === 'Formal' && (
                        <div className="w-full sm:w-48 shrink-0 relative">
                          <select
                            value={statusFilter}
                            onChange={(e) => {
                              setStatusFilter(e.target.value);
                              setCurrentPage(1);
                            }}
                            className="w-full h-11 pl-4 pr-10 bg-slate-50 border border-slate-100/80 rounded-2xl text-xs font-bold text-slate-750 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-600/20 focus:border-[#00693E] appearance-none transition-all shadow-3xs cursor-pointer"
                          >
                            {isCalonPelajarPage ? (
                              <>
                                <option value="Semua">Semua EMIS</option>
                                <option value="Terdaftar">Terdaftar</option>
                                <option value="Belum">Belum Terdaftar</option>
                              </>
                            ) : (
                              <>
                                <option value="Semua">Semua Verval</option>
                              <option value="Sukses">Sukses</option>
                              <option value="Proses">Proses</option>
                            </>
                          )}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 flex items-center">
                          <ChevronDown className="h-4 w-4" />
                        </div>
                      </div>
                      )}

                    </div>



                    {/* Data Table */}
                    {(() => {
                      const isAllSelected = filteredStudents.length > 0 && filteredStudents.every(s => selectedStudentIds.includes(s.id));
                      const isSomeSelected = filteredStudents.length > 0 && filteredStudents.some(s => selectedStudentIds.includes(s.id));

                      return (
                        <div className="relative bg-white rounded-3xl border border-slate-100 shadow-2xs overflow-visible">
                          {/* Scroll Right Button floating over the right end edge of header */}
                          {renderScrollButtons(false)}

                          {/* Viewport-sticky floating header portal */}
                          {typeof document !== 'undefined' && createPortal(
                            <div
                              ref={floatingHeaderOuterRef}
                              className="fixed z-[45] bg-slate-100 border border-slate-200 shadow-md rounded-t-2xl overflow-visible"
                              style={{
                                top: `${stickyTop}px`,
                                left: `${floatingHeaderStyle.left}px`,
                                width: `${floatingHeaderStyle.width}px`,
                                display: isScrolled ? 'block' : 'none',
                              }}
                            >
                              <div
                                ref={floatingHeaderRef}
                                onScroll={(e) => {
                                  const floating = e.currentTarget;
                                  if (scrollSourceRef.current !== 'main') {
                                    scrollSourceRef.current = 'floating';
                                    if (scrollTimeoutRef.current) {
                                      window.clearTimeout(scrollTimeoutRef.current);
                                    }
                                    scrollTimeoutRef.current = window.setTimeout(() => {
                                      scrollSourceRef.current = null;
                                    }, 150);

                                    if (tableContainerRef.current && tableContainerRef.current.scrollLeft !== floating.scrollLeft) {
                                      tableContainerRef.current.scrollLeft = floating.scrollLeft;
                                    }
                                  }
                                }}
                                className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                              >
                                <table 
                                  className="w-full text-left border-collapse min-w-[1050px]"
                                  style={{
                                    width: floatingTableWidth ? `${floatingTableWidth}px` : '100%',
                                    minWidth: floatingTableWidth ? `${floatingTableWidth}px` : '100%',
                                    tableLayout: colWidths.length > 0 ? 'fixed' : 'auto',
                                  }}
                                >
                                  <thead>
                                    {renderTableHeadContents(true)}
                                  </thead>
                                </table>
                              </div>
                              {renderScrollButtons(true)}
                            </div>,
                            document.body
                          )}

                          <div 
                            ref={tableContainerRef}
                            onScroll={handleTableScroll}
                            className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                          >
                            <table className="w-full text-left border-collapse min-w-[1050px]">
                              {/* Table Header - 100% Solid Background */}
                              <thead>
                                {renderTableHeadContents(false)}
                              </thead>

                              {/* Table Body */}
                              <tbody className="divide-y divide-slate-100">
                                {filteredStudents.length === 0 ? (
                                  <tr>
                                    <td colSpan={7} className="py-16 text-center text-slate-400 font-medium text-xs">
                                      <div className="flex flex-col items-center justify-center gap-2.5">
                                        <p className="italic">Belum ada santri terdaftar di kelas/kelompok ini.</p>
                                        {canWriteCurrent && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (isSelectionMode) return;
                                              setAddMemberSearch('');
                                              setAddMemberGroupFilter('Semua');
                                              setIsAddMemberModalOpen(true);
                                            }}
                                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 text-[#00693E] hover:bg-emerald-100 border border-emerald-100 text-xs font-bold cursor-pointer transition-all shadow-3xs active:scale-95"
                                          >
                                            <UserPlus className="h-4 w-4" />
                                            <span>Tambah Santri ke {selectedKelas.nama}</span>
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                ) : (
                                  filteredStudents.map((s, idx) => {
                                const isNisnValid = s.nisn && s.nisn.trim() !== '';
                                const isSelected = selectedStudentIds.includes(s.id);
                                
                                const stickyBg = isSelectionMode && isSelected
                                  ? 'bg-[#eaf7f0] group-hover/row:bg-[#dff3e8]'
                                  : 'bg-white group-hover/row:bg-slate-50';
                                
                                const rowBgClass = isSelectionMode && isSelected
                                  ? 'bg-[#eaf7f0]/60 hover:bg-[#dff3e8]/70'
                                  : 'hover:bg-slate-50/30';
                                
                                return (
                                  <tr 
                                    key={`${s.id}-${idx}`} 
                                    onClick={(e) => handleRowClick(e, s)}
                                    className={`text-xs transition-colors group/row text-slate-700 ${
                                      isSelectionMode ? 'cursor-pointer' : ''
                                    } ${rowBgClass}`}
                                  >
                                    {/* No or Checkbox Column */}
                                    <td className={`sticky left-0 z-10 w-[42px] min-w-[42px] max-w-[42px] text-center pl-2 pr-1 py-4.5 select-none transition-colors ${stickyBg}`}>
                                      {isSelectionMode ? (
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onClick={(e) => e.stopPropagation()}
                                          onChange={() => handleToggleStudentSelection(s.id)}
                                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer h-3.5 w-3.5"
                                        />
                                      ) : (
                                        <span className="font-sans text-slate-400 text-xs font-extrabold">{idx + 1}</span>
                                      )}
                                    </td>

                                    {/* Nama Lengkap with Avatar & NIS (Profil) */}
                                    <td className={`sticky left-[42px] z-10 w-[200px] min-w-[200px] max-w-[200px] pl-2 py-3.5 transition-colors border-r border-slate-100 ${stickyBg}`}>
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        {renderStudentAvatar(s)}
                                        <div className="min-w-0 flex-1">
                                          {/* Baris 1: Nama */}
                                          <div className="truncate">
                                            <span
                                              onClick={(e) => {
                                                if (isSelectionMode) return;
                                                e.stopPropagation();
                                                setSelectedSantriForDetail(s);
                                              }}
                                              className={`font-extrabold text-slate-800 transition-colors truncate block ${
                                                isSelectionMode 
                                                  ? 'pointer-events-none' 
                                                  : 'hover:text-emerald-700 hover:underline cursor-pointer'
                                              }`}
                                              title={isSelectionMode ? undefined : s.nama}
                                            >
                                              {s.nama}
                                            </span>
                                          </div>

                                          {/* Baris 2: NIS & Status */}
                                          <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                                            <span className="text-[10px] text-slate-400 font-mono font-medium truncate">
                                              {s.nis || '-'}
                                            </span>
                                            {activeTab === 'Formal' && (
                                              <span className={`inline-flex items-center px-1.5 py-0.2 rounded-full text-[8px] font-black uppercase tracking-wide shrink-0 ${
                                                (s.statusKeanggotaan || 'Aktif') === 'Aktif'
                                                  ? 'bg-[#E6F4EA] text-[#137333]'
                                                  : s.statusKeanggotaan === 'Alumni'
                                                    ? 'bg-purple-100 text-purple-800 border border-purple-200/80'
                                                    : 'bg-slate-100 text-slate-500'
                                              }`}>
                                                {s.statusKeanggotaan || 'Aktif'}
                                              </span>
                                            )}
                                          </div>

                                          {/* Baris 3: Alamat */}
                                          {(s.desa || s.kecamatan || s.kabupaten) && (
                                            <div 
                                              className="text-[9px] text-slate-400 font-extrabold uppercase truncate mt-0.5" 
                                              title={[s.desa, s.kecamatan, s.kabupaten].filter(Boolean).join(', ')}
                                            >
                                              {[s.desa, s.kecamatan, s.kabupaten].filter(Boolean).join(', ')}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </td>

                                    {/* NIK (Khusus Pendidikan Formal) */}
                                    {activeTab === 'Formal' && (
                                      <td className="w-[130px] min-w-[130px] font-mono font-bold text-slate-600 truncate pl-1 py-4.5">
                                        {s.nik || <span className="text-slate-300">-</span>}
                                      </td>
                                    )}

                                    {/* NISN */}
                                    <td className="w-[110px] min-w-[110px] font-mono font-bold text-slate-600 truncate pl-1 py-4.5">
                                      {s.nisn || <span className="text-slate-300">-</span>}
                                    </td>

                                    {/* NISM */}
                                    <td className="w-[110px] min-w-[110px] font-mono font-bold text-slate-400 truncate pl-1 py-4.5">
                                      {s.nism || <span className="text-slate-300">-</span>}
                                    </td>

                                    {/* Status (Non-Formal) */}
                                    {activeTab !== 'Formal' && (
                                      <td className="w-[100px] min-w-[100px] font-semibold pl-1 py-4.5">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide ${
                                          s.statusKeanggotaan === 'Aktif'
                                            ? 'bg-[#E6F4EA] text-[#137333]'
                                            : 'bg-slate-100 text-slate-500'
                                        }`}>
                                          {s.statusKeanggotaan || 'Aktif'}
                                        </span>
                                      </td>
                                    )}

                                    {/* EMIS / Verval / Kamar Column */}
                                    {activeTab === 'Formal' ? (
                                      <>
                                        {/* EMIS Column */}
                                        {isCalonPelajarPage && (
                                      <td className="w-[100px] min-w-[100px] pl-1 py-4.5 relative">
                                        <div className="relative inline-block text-left">
                                          <button
                                            disabled={!canWriteCurrent}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (activeEmisDropdownId === s.id) {
                                                setActiveEmisDropdownId(null);
                                                setEmisDropdownPos(null);
                                              } else {
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                const spaceBelow = window.innerHeight - rect.bottom;
                                                const spaceAbove = rect.top;
                                                const isUpward = spaceBelow < 180 && spaceAbove > spaceBelow;

                                                setEmisDropdownPos({
                                                  top: isUpward ? rect.top - 6 : rect.bottom + 6,
                                                  left: Math.max(10, Math.min(window.innerWidth - 150, rect.left)),
                                                  isUpward
                                                });
                                                setActiveEmisDropdownId(s.id);
                                                setActiveVervalDropdownId(null);
                                                setVervalDropdownPos(null);
                                              }
                                            }}
                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide transition-colors cursor-pointer shadow-2xs ${
  s.statusEmis === 'Terdaftar'
    ? 'bg-[#E6F4EA] text-[#137333] hover:bg-emerald-100'
    : s.statusEmis === 'Invalid'
    ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
}`}
                                          >
                                            <span>{s.statusEmis || 'Belum'}</span>
                                            <ChevronsUpDown className="h-3 w-3 opacity-60 shrink-0" />
                                          </button>
                                        </div>
                                      </td>
                                    )}

                                    {/* Verval Column */}
                                    {!isCalonPelajarPage && (
                                      <td className="w-[100px] min-w-[100px] pl-1 py-4.5 relative">
                                        <div className="relative inline-block text-left">
                                          <button
                                            disabled={!canWriteCurrent}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (activeVervalDropdownId === s.id) {
                                                setActiveVervalDropdownId(null);
                                                setVervalDropdownPos(null);
                                              } else {
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                const spaceBelow = window.innerHeight - rect.bottom;
                                                const spaceAbove = rect.top;
                                                const isUpward = spaceBelow < 180 && spaceAbove > spaceBelow;

                                                setVervalDropdownPos({
                                                  top: isUpward ? rect.top - 6 : rect.bottom + 6,
                                                  left: Math.max(10, Math.min(window.innerWidth - 140, rect.left)),
                                                  isUpward
                                                });
                                                setActiveVervalDropdownId(s.id);
                                                setActiveEmisDropdownId(null);
                                                setEmisDropdownPos(null);
                                              }
                                            }}
                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide transition-colors cursor-pointer shadow-2xs ${
                                              (s.statusVerval || (isNisnValid ? 'Sukses' : 'Proses')) === 'Sukses'
                                                ? 'bg-[#E6F4EA] text-[#137333] hover:bg-emerald-200'
                                                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                            }`}
                                          >
                                            <span>{s.statusVerval || (isNisnValid ? 'Sukses' : 'Proses')}</span>
                                            <ChevronsUpDown className="h-3 w-3 opacity-60 shrink-0" />
                                          </button>
                                        </div>
                                      </td>
                                    )}
                                  </>
                                ) : (
                                  /* Kamar Column */
                                  <td className="w-[110px] min-w-[110px] pl-3 py-4.5 font-bold text-slate-700 truncate">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/80 text-slate-700 text-xs font-bold border border-slate-200/60">
                                      <Home className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                      <span className="truncate">{s.kamar || '-'}</span>
                                    </span>
                                  </td>
                                )}

                                {/* Aksi Column (Sticky Right) */}
                                    <td className={`sticky right-0 z-10 w-[56px] min-w-[56px] max-w-[56px] text-center px-2 py-4.5 transition-colors border-l border-slate-200 shadow-[-2px_0_5px_rgba(0,0,0,0.03)] ${stickyBg}`}>
                                      <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
                                        <button
                                          disabled={isSelectionMode}
                                          onClick={(e) => {
                                            if (isSelectionMode) return;
                                            if (activeActionStudentId === s.id) {
                                              setActiveActionStudentId(null);
                                              setStudentDropdownPos(null);
                                            } else {
                                              const rect = e.currentTarget.getBoundingClientRect();
                                              const dropdownWidth = 128;
                                              const dropdownHeight = 160;
                                              let top = rect.bottom;
                                              if (top + dropdownHeight > window.innerHeight) {
                                                top = rect.top - dropdownHeight;
                                              }
                                              let left = rect.right - dropdownWidth;
                                              if (left < 8) left = 8;
                                              if (left + dropdownWidth > window.innerWidth - 8) {
                                                left = window.innerWidth - dropdownWidth - 8;
                                              }
                                              setStudentDropdownPos({ top, left });
                                              setActiveActionStudentId(s.id);
                                            }
                                          }}
                                          className={`p-1 rounded-md transition-colors ${
                                            isSelectionMode 
                                              ? 'opacity-30 cursor-not-allowed text-slate-300' 
                                              : 'hover:bg-slate-100 text-slate-400 hover:text-slate-800 cursor-pointer'
                                          }`}
                                          title="Opsi Aksi"
                                        >
                                          <MoreVertical className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </td>

                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          4. MODALS (Popups)
          ========================================================================= */}

      {/* A. LEMBAGA / KATEGORI CREATE / EDIT MODAL */}
      <AnimatePresence>
        {isLembagaModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-xl max-w-md w-full overflow-hidden"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                  {activeTab === 'Rombel' 
                    ? (editingLembaga ? 'Edit Kategori Rombel' : 'Buat Kategori Rombel Baru')
                    : (editingLembaga ? 'Edit Lembaga' : 'Buat Lembaga Baru')
                  }
                </h3>
                <button
                  onClick={() => setIsLembagaModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                    {activeTab === 'Rombel' ? 'Nama Kategori Rombel' : 'Nama Lembaga'}
                  </label>
                  <input
                    type="text"
                    value={lemNama}
                    onChange={(e) => setLemNama(e.target.value)}
                    placeholder={activeTab === 'Rombel' ? "Contoh: Halaqah Tahfidz Qur'an" : "Contoh: Madrasah Aliyah"}
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-emerald-500 outline-none font-semibold text-slate-700"
                  />
                </div>

                {activeTab !== 'Rombel' && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Kode Singkatan Lembaga (Maksimal 4 Huruf)</span>
                      <span className="text-[9px] text-slate-400 font-medium">Harus Unik (Contoh: SPMU, MAAT)</span>
                    </label>
                    <input
                      type="text"
                      value={lemKode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4);
                        setLemKode(val);
                      }}
                      maxLength={4}
                      placeholder="Contoh: SPMU"
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-emerald-500 outline-none font-black tracking-widest uppercase text-slate-800"
                    />
                  </div>
                )}

                {activeTab === 'Rombel' ? (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                      Deskripsi Kategori
                    </label>
                    <textarea
                      value={lemDeskripsi}
                      onChange={(e) => setLemDeskripsi(e.target.value)}
                      placeholder="Tuliskan deskripsi singkat tujuan kelompok rombel ini..."
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-emerald-500 outline-none font-medium text-slate-750"
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                        Deskripsi Lembaga (Opsional)
                      </label>
                      <input
                        type="text"
                        value={lemDeskripsi}
                        onChange={(e) => setLemDeskripsi(e.target.value)}
                        placeholder="Contoh: Unit Satuan Pendidikan Menengah Formal"
                        className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-emerald-500 outline-none font-semibold text-slate-700"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                        Logo Lembaga (Opsional)
                      </label>
                      <div className="flex flex-col gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-4">
                          {isUploadingLogo ? (
                            <div className="w-16 h-16 rounded-2xl border border-slate-200 flex flex-col items-center justify-center bg-white text-emerald-600 shrink-0 shadow-2xs">
                              <Loader2 className="h-5 w-5 animate-spin mb-1" />
                              <span className="text-[8px] font-bold">UNGGAH...</span>
                            </div>
                          ) : lemLogo && !logoError ? (
                            <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-slate-200 shrink-0 shadow-xs bg-white group flex items-center justify-center">
                              <img
                                src={getLogoUrl(lemLogo)}
                                alt="Logo"
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                                onError={() => setLogoError(true)}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setLemLogo('');
                                  setLogoError(false);
                                }}
                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[9px] font-black tracking-wider cursor-pointer"
                                title="Hapus Logo"
                              >
                                <Trash2 className="h-4 w-4 mb-0.5" />
                                <span>HAPUS</span>
                              </button>
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center bg-white text-slate-300 shrink-0">
                              <School className="h-6 w-6 text-slate-300" />
                              {logoError && <span className="text-[8px] font-bold text-rose-400 mt-0.5">Gagal Muat</span>}
                            </div>
                          )}

                          <div className="flex-1">
                            <input
                              type="file"
                              accept="image/*"
                              disabled={isUploadingLogo}
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;

                                setIsUploadingLogo(true);
                                setLogoError(false);
                                try {
                                  const compressedBase64 = await compressImage(file, 400, 400, 0.85);
                                  let finalUrl = compressedBase64;
                                  try {
                                    const uploadedUrl = await uploadFileToStorage(compressedBase64, file.name, 'logo_lembaga');
                                    if (uploadedUrl) {
                                      finalUrl = uploadedUrl;
                                    }
                                  } catch (upErr) {
                                    console.warn("Storage upload fallback to base64:", upErr);
                                  }
                                  setLemLogo(finalUrl);
                                  showToast('Logo berhasil diproses.');
                                } catch (err: any) {
                                  console.error("Gagal mengunggah logo:", err);
                                  showToast('Gagal memproses gambar logo.');
                                } finally {
                                  setIsUploadingLogo(false);
                                  e.target.value = '';
                                }
                              }}
                              className="hidden"
                              id="logo-upload-input"
                            />
                            <div className="flex items-center gap-2 flex-wrap">
                              <label
                                htmlFor="logo-upload-input"
                                className={`inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl text-[10px] font-extrabold cursor-pointer transition-colors border border-slate-200 shadow-xs ${isUploadingLogo ? 'opacity-50 pointer-events-none' : ''}`}
                              >
                                <Upload className="h-3 w-3 text-slate-500" />
                                <span>{isUploadingLogo ? 'MENGUNGGAH...' : lemLogo ? 'GANTI GAMBAR' : 'PILIH GAMBAR'}</span>
                              </label>

                              {lemLogo && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setLemLogo('');
                                    setLogoError(false);
                                  }}
                                  className="inline-flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 px-2.5 py-1.5 rounded-xl text-[10px] font-extrabold cursor-pointer transition-colors border border-rose-200"
                                  title="Hapus Logo"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  <span>HAPUS LOGO</span>
                                </button>
                              )}
                            </div>
                            <p className="text-[9px] text-slate-400 mt-1 font-medium">PNG, JPG (disimpan otomatis)</p>
                          </div>
                        </div>

                        {lemLogo && !isUploadingLogo && !logoError && (
                          <div className="mt-1 px-2.5 py-1.5 bg-emerald-50/80 border border-emerald-200/60 rounded-xl flex items-center gap-2">
                            <span className="text-[9px] font-bold text-emerald-800 shrink-0 uppercase tracking-wide">Path File:</span>
                            <code className="text-[10px] font-mono font-semibold text-emerald-900 truncate select-all">{getLogoUrl(lemLogo)}</code>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsLembagaModalOpen(false)}
                  disabled={isUploadingLogo}
                  className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-100 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  BATAL
                </button>
                <button
                  type="button"
                  onClick={handleSaveLembaga}
                  disabled={!lemNama.trim() || isUploadingLogo}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer flex items-center gap-2"
                >
                  {isUploadingLogo ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>MENGUNGGAH LOGO...</span>
                    </>
                  ) : (
                    <span>SIMPAN</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* B. KELAS / KELOMPOK CREATE / EDIT MODAL */}
      <AnimatePresence>
        {isKelasModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-xl max-w-md w-full overflow-hidden"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                  {(() => {
                    const isLembagaFormal = false;
                    const isCalonPelajar = isLembagaFormal && editingKelas && isDefaultClass(editingKelas);
                    if (isCalonPelajar) return 'Edit Kelas';
                    return activeTab === 'Rombel'
                      ? (editingKelas ? 'Edit Kelompok Rombel' : 'Tambah Kelompok Rombel Baru')
                      : (editingKelas ? 'Edit Kelas' : 'Tambah Kelas Baru');
                  })()}
                </h3>
                <button
                  onClick={() => setIsKelasModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {(() => {
                  const isLembagaFormal = false;
                  const isCalonPelajar = isLembagaFormal && editingKelas && isDefaultClass(editingKelas);
                  return (
                    <>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                          {activeTab === 'Rombel' ? 'Nama Kelompok / Folder' : 'Nama Kelas'}
                        </label>
                        <input
                          type="text"
                          value={kelNama}
                          onChange={(e) => setKelNama(e.target.value)}
                          placeholder="Nama"
                          className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-emerald-500 outline-none font-semibold text-slate-700"
                        />
                      </div>

                      {!isCalonPelajar && (
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                            {activeTab === 'Rombel' ? 'Nama Pembimbing / Guru (Opsional)' : 'Nama Wali Kelas (Opsional)'}
                          </label>
                          <input
                            type="text"
                            value={kelWali}
                            onChange={(e) => setKelWali(e.target.value)}
                            placeholder="Nama lengkap (Opsional)"
                            className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-emerald-500 outline-none font-semibold text-slate-700"
                          />
                        </div>
                      )}


                    </>
                  );
                })()}
              </div>

              <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsKelasModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-100 rounded-xl text-xs font-bold cursor-pointer"
                >
                  BATAL
                </button>
                <button
                  type="button"
                  onClick={handleSaveKelas}
                  disabled={!kelNama.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
                >
                  SIMPAN
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* C. PINDAH KELAS / TRANSFER STUDENT MODAL */}
      <AnimatePresence>
        {transferStudent && selectedKelas && (() => {
          const studentGender = transferStudent.gender || selectedGender;
          const targetKind = activeTab === 'Rombel' ? 'Internal' : 'Formal';
          const eligibleLembagas = lembagasList.filter(l => 
            getLembagaJenis(l) === targetKind && isGenderMatch(l.gender, studentGender)
          );
          const activeLemId = transferLembagaId || selectedLembaga.id;
          const currentLemObj = lembagasList.find(l => l.id === activeLemId) || selectedLembaga;
          const isFormalTarget = (currentLemObj?.jenis === 'Formal' || targetKind === 'Formal');
          const isStudentEmis = isEmisTerdaftar(transferStudent.statusEmis);

          let targetClasses = kelasList.filter(k => {
            const lemId = getClsLembagaId(k);
            return lemId === String(activeLemId);
          }).filter(c => {
            if (activeLemId === selectedLembaga.id) {
              return c.id !== selectedKelas.id;
            }
            return true;
          });

          if (isFormalTarget && !isStudentEmis) {
            targetClasses = targetClasses.filter(c => isDefaultClass(c) || c.nama.trim().toLowerCase() === 'calon peserta didik');
            // If targetClasses is empty (no explicit default class in DB for activeLemId), provide synthetic default class
            if (targetClasses.length === 0) {
              targetClasses = [{
                id: 'default-' + activeLemId,
                lembagaId: String(activeLemId),
                nama: 'Calon Peserta Didik',
                waliKelas: '-',
                tingkatan: 'Lainnya',
                isDefault: true
              }];
            }
          }

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 animate-fade-in">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl border border-slate-100 shadow-xl max-w-sm w-full overflow-hidden"
              >
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                    Pindahkan Santri
                  </h3>
                  <button onClick={() => { setTransferStudent(null); setTransferLembagaId(''); setDestClassId(''); }} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-5 space-y-4 text-xs font-medium text-slate-600">
                  <p className="leading-relaxed">
                    Pindahkan <strong className="text-slate-800 font-extrabold">{transferStudent.nama}</strong> ({studentGender}) dari <strong className="text-emerald-700 font-extrabold">{selectedLembaga.nama} - "{selectedKelas.nama}"</strong> ke:
                  </p>

                  {/* Kotak 1: Pilih Lembaga */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                      1. Pilih Lembaga Tujuan ({targetKind})
                    </label>
                    <select
                      value={activeLemId}
                      onChange={(e) => {
                        setTransferLembagaId(e.target.value);
                        setDestClassId('');
                      }}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none transition-all shadow-2xs cursor-pointer"
                    >
                      {eligibleLembagas.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.nama}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Kotak 2: Pilih Kelas */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                      2. Pilih Kelas Tujuan
                    </label>
                    {targetClasses.length === 0 ? (
                      <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 font-medium leading-relaxed">
                        <span className="font-extrabold block mb-0.5">⚠️ Tidak ada kelas tujuan</span>
                        Lembaga <strong>{currentLemObj.nama}</strong> belum memiliki kelas tujuan yang dapat dipilih.
                      </div>
                    ) : (
                      <select
                        value={destClassId}
                        onChange={(e) => setDestClassId(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none transition-all shadow-2xs cursor-pointer"
                      >
                        <option value="">-- Pilih Kelas --</option>
                        {targetClasses.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.nama} {c.waliKelas && c.waliKelas !== '-' ? `(${c.waliKelas})` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2">
                  <button
                    onClick={() => { setTransferStudent(null); setTransferLembagaId(''); setDestClassId(''); }}
                    className="px-3 py-1.5 border border-slate-250 text-slate-500 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    BATAL
                  </button>
                  <button
                    onClick={handleExecuteTransfer}
                    disabled={!destClassId}
                    className="px-4.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold disabled:opacity-50 hover:bg-emerald-700 shadow-xs cursor-pointer"
                  >
                    PINDAHKAN
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* C2. PINDAH KELAS MASAL / BULK TRANSFER STUDENT MODAL */}
      <AnimatePresence>
        {isBulkTransferOpen && selectedKelas && (() => {
          const targetKind = activeTab === 'Rombel' ? 'Internal' : 'Formal';
          const eligibleBulkLembagas = lembagasList.filter(l => 
            getLembagaJenis(l) === targetKind && isGenderMatch(l.gender, selectedGender)
          );
          const activeBulkLemId = bulkTransferLembagaId || selectedLembaga.id;
          const currentBulkLemObj = lembagasList.find(l => l.id === activeBulkLemId) || selectedLembaga;
          const isFormalTarget = (currentBulkLemObj?.jenis === 'Formal' || targetKind === 'Formal');

          const selectedStudents = santriList.filter(s => selectedStudentIds.includes(s.id));
          const hasUnregisteredEmis = selectedStudents.some(s => !isEmisTerdaftar(s.statusEmis));

          let targetBulkClasses = kelasList.filter(k => {
            const lemId = getClsLembagaId(k);
            return lemId === String(activeBulkLemId);
          }).filter(c => {
            if (activeBulkLemId === selectedLembaga.id) {
              return c.id !== selectedKelas.id;
            }
            return true;
          });

          if (isFormalTarget && hasUnregisteredEmis) {
            targetBulkClasses = targetBulkClasses.filter(c => isDefaultClass(c) || c.nama.trim().toLowerCase() === 'calon peserta didik');
            if (targetBulkClasses.length === 0) {
              targetBulkClasses = [{
                id: 'default-' + activeBulkLemId,
                lembagaId: String(activeBulkLemId),
                nama: 'Calon Peserta Didik',
                waliKelas: '-',
                tingkatan: 'Lainnya',
                isDefault: true
              }];
            }
          }

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 animate-fade-in">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl border border-slate-100 shadow-xl max-w-sm w-full overflow-hidden"
              >
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                    Pindahkan Santri Masal
                  </h3>
                  <button 
                    onClick={() => {
                      setIsBulkTransferOpen(false);
                      setBulkTransferLembagaId('');
                      setBulkDestClassId('');
                    }} 
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-5 space-y-4 text-xs font-medium text-slate-600">
                  <p className="leading-relaxed">
                    Pindahkan <strong className="text-slate-800 font-extrabold">{selectedStudentIds.length} santri terpilih</strong> ({selectedGender}) dari <strong className="text-emerald-700 font-extrabold">{selectedLembaga.nama} - "{selectedKelas.nama}"</strong> ke:
                  </p>

                  {/* Kotak 1: Pilih Lembaga */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                      1. Pilih Lembaga Tujuan ({targetKind})
                    </label>
                    <select
                      value={activeBulkLemId}
                      onChange={(e) => {
                        setBulkTransferLembagaId(e.target.value);
                        setBulkDestClassId('');
                      }}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none transition-all shadow-2xs cursor-pointer"
                    >
                      {eligibleBulkLembagas.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.nama}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Kotak 2: Pilih Kelas */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                      2. Pilih Kelas Tujuan
                    </label>
                    {targetBulkClasses.length === 0 ? (
                      <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 font-medium leading-relaxed">
                        <span className="font-extrabold block mb-0.5">⚠️ Tidak ada kelas tujuan</span>
                        Lembaga <strong>{currentBulkLemObj.nama}</strong> belum memiliki kelas tujuan yang dapat dipilih.
                      </div>
                    ) : (
                      <select
                        value={bulkDestClassId}
                        onChange={(e) => setBulkDestClassId(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none transition-all shadow-2xs cursor-pointer"
                      >
                        <option value="">-- Pilih Kelas --</option>
                        {targetBulkClasses.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.nama} {c.waliKelas && c.waliKelas !== '-' ? `(${c.waliKelas})` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {isFormalTarget && hasUnregisteredEmis && (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 font-medium leading-relaxed">
                      ⚠️ Terdapat santri yang <strong>belum terdaftar EMIS</strong> di antara data yang dipilih. Pada pendidikan formal, kelas tujuan dibatasi hanya ke <strong>"Calon Peserta Didik"</strong>.
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      setIsBulkTransferOpen(false);
                      setBulkTransferLembagaId('');
                      setBulkDestClassId('');
                    }}
                    className="px-3 py-1.5 border border-slate-250 text-slate-500 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    BATAL
                  </button>
                  <button
                    onClick={handleExecuteBulkTransfer}
                    disabled={!bulkDestClassId}
                    className="px-4.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold disabled:opacity-50 hover:bg-emerald-700 shadow-xs cursor-pointer"
                  >
                    PINDAHKAN MASAL
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* D. TAMBAH ANGGOTA / MULTI ADD MEMBER MODAL */}
      <AnimatePresence>
        {isAddMemberModalOpen && selectedKelas && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3 sm:p-4 backdrop-blur-xs animate-fade-in overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh] my-auto min-h-0"
            >
              {/* Header */}
              <div className="px-5 sm:px-6 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <UserPlus className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-800">
                        {activeTab === 'Rombel' ? 'Tambah Anggota Rombel' : 'Tambah Anggota Kelas'}
                      </h3>
                      {activeTab !== 'Rombel' && selectedLembaga && getLembagaJenis(selectedLembaga) === 'Formal' && !isDefaultClass(selectedKelas) && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10px] font-bold">
                          Khusus EMIS Terdaftar
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium">{selectedLembaga.nama} &bull; <span className="text-emerald-700 font-semibold">{selectedKelas.nama}</span></p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setIsAddMemberModalOpen(false);
                    setSelectedModalStudentIds([]);
                  }} 
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Content: Split into 2 columns */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 min-h-[380px] max-h-[520px] min-h-0 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-100">
                
                {/* LEFT COLUMN: ELIGIBLE SANTRI */}
                <div className="flex flex-col h-full min-h-0 overflow-hidden bg-white">
                  {/* Left Header & Search */}
                  <div className="px-3 py-2 border-b border-slate-100 space-y-2 bg-slate-50/30 shrink-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        Santri Tersedia
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
                          {unselectedEligibleStudents.length}
                        </span>
                      </span>
                      {searchedEligibleStudents.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newIds = Array.from(new Set([...selectedModalStudentIds, ...searchedEligibleStudents.map(s => s.id)]));
                            setSelectedModalStudentIds(newIds);
                          }}
                          className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer hover:underline"
                        >
                          Pilih Semua ({searchedEligibleStudents.length})
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Cari nama atau alamat..."
                          value={addMemberSearch}
                          onChange={(e) => setAddMemberSearch(e.target.value)}
                          className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all font-medium"
                        />
                        {addMemberSearch && (
                          <button 
                            type="button"
                            onClick={() => setAddMemberSearch('')} 
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <div className="w-full sm:w-52 relative shrink-0">
                        <select
                          value={addMemberGroupFilter}
                          onChange={(e) => setAddMemberGroupFilter(e.target.value)}
                          className="w-full py-1.5 pl-2.5 pr-7 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 font-bold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none appearance-none cursor-pointer truncate"
                        >
                          <option value="Semua">
                            {activeTab === 'Rombel' ? 'Semua Kelompok' : 'Semua Lembaga & Kelas'}
                          </option>
                          <option value="Belum">Belum Tergabung</option>
                          {activeTab === 'Rombel' ? (
                            groupsList
                              .filter(g => {
                                const catId = selectedLembaga?.id || (selectedKelas ? groupsList.find(x => x.id === selectedKelas.id)?.kategoriId : undefined);
                                return g.kategoriId === catId && g.id !== selectedKelas?.id;
                              })
                              .map(g => (
                                <option key={g.id} value={g.id}>{g.nama}</option>
                              ))
                          ) : activeTab === 'Internal' ? (
                            targetLembagaClasses.map(c => (
                              <option key={c.id} value={c.id}>{c.nama}</option>
                            ))
                          ) : (
                            Object.entries(formalSectionsMap).map(([secKey, secLabel]) => (
                              <option key={secKey} value={secKey}>{secLabel}</option>
                            ))
                          )}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Left Scroll List */}
                  <div className="flex-1 overflow-y-auto px-2.5 py-1.5 space-y-1.5">
                    {(() => {
                      if (searchedEligibleStudents.length === 0) {
                        return (
                          <div className="h-full flex flex-col items-center justify-center py-12 text-center text-slate-400 text-xs">
                            <User className="h-8 w-8 text-slate-300 mb-2 stroke-[1.5]" />
                            <p className="font-medium">
                              {addMemberSearch 
                                ? 'Tidak ada santri yang cocok' 
                                : (activeTab !== 'Rombel' && selectedLembaga && getLembagaJenis(selectedLembaga) === 'Formal' && !isDefaultClass(selectedKelas))
                                  ? 'Tidak ada santri dengan status EMIS Terdaftar yang tersedia'
                                  : 'Tidak ada santri tersedia'}
                            </p>
                          </div>
                        );
                      }

                      const sectionsMap: { [key: string]: { label: string; students: Santri[] } } = {};

                      if (activeTab === 'Rombel') {
                        sectionsMap['Belum'] = { label: 'Belum Tergabung', students: [] };
                        const catId = selectedLembaga?.id || (selectedKelas ? groupsList.find(g => g.id === selectedKelas.id)?.kategoriId : undefined);
                        const categoryGroups = groupsList.filter(g => g.kategoriId === catId && g.id !== selectedKelas?.id);

                        categoryGroups.forEach(g => {
                          sectionsMap[g.id] = { label: g.nama, students: [] };
                        });

                        searchedEligibleStudents.forEach(s => {
                          const ass = assignmentsList.find(a => 
                            a.santriId === s.id && 
                            (
                              (catId && a.kategoriId === catId) || 
                              groupsList.some(g => g.id === a.kelompokId && g.kategoriId === catId)
                            )
                          );
                          if (!ass) {
                            sectionsMap['Belum'].students.push(s);
                          } else {
                            if (sectionsMap[ass.kelompokId]) {
                              sectionsMap[ass.kelompokId].students.push(s);
                            } else {
                              const foundGrp = groupsList.find(g => g.id === ass.kelompokId);
                              if (foundGrp) {
                                sectionsMap[ass.kelompokId] = { label: foundGrp.nama, students: [s] };
                              } else {
                                sectionsMap['Belum'].students.push(s);
                              }
                            }
                          }
                        });
                      } else if (activeTab === 'Internal') {
                        // Internal
                        sectionsMap['Belum'] = { label: 'Belum Tergabung', students: [] };
                        targetLembagaClasses.forEach(c => {
                          sectionsMap[c.id] = { label: c.nama, students: [] };
                        });

                        searchedEligibleStudents.forEach(s => {
                          const belongingClass = targetLembagaClasses.find(c => classStudentSets[c.id]?.has(s.id));
                          if (belongingClass) {
                            if (sectionsMap[belongingClass.id]) {
                              sectionsMap[belongingClass.id].students.push(s);
                            } else {
                              sectionsMap[belongingClass.id] = { label: belongingClass.nama, students: [s] };
                            }
                          } else {
                            sectionsMap['Belum'].students.push(s);
                          }
                        });
                      } else {
                        // Formal Education
                        sectionsMap['Belum'] = { label: 'Belum Tergabung', students: [] };
                        Object.entries(formalSectionsMap).forEach(([secKey, secLabel]) => {
                          sectionsMap[secKey] = { label: secLabel, students: [] };
                        });

                        searchedEligibleStudents.forEach(s => {
                          const secInfo = studentFormalSectionMap.get(s.id) || getFormalSectionForStudent(s);
                          if (sectionsMap[secInfo.key]) {
                            sectionsMap[secInfo.key].students.push(s);
                          } else {
                            sectionsMap['Belum'].students.push(s);
                          }
                        });
                      }

                      const activeSections = Object.entries(sectionsMap)
                        .map(([key, data]) => ({ key, label: data.label, students: data.students }))
                        .filter(sec => sec.students.length > 0);

                      return activeSections.map(sec => {
                        const isCollapsed = !!collapsedModalSections[sec.key];
                        const isAllSectionSelected = sec.students.length > 0 && sec.students.every(s => selectedModalStudentIds.includes(s.id));

                        return (
                          <div key={`section-${sec.key}`} className="space-y-1">
                            {/* Segment Header (Explorer VCS style) */}
                            <div 
                              onClick={() => {
                                setCollapsedModalSections(prev => ({ ...prev, [sec.key]: !prev[sec.key] }));
                              }}
                              className="sticky top-0 z-30 px-2.5 py-1.5 bg-slate-100 border-y border-slate-200/90 rounded-lg flex items-center justify-between text-[11px] font-bold text-slate-700 shadow-2xs select-none cursor-pointer hover:bg-slate-200/80 transition-all"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <div className="p-0.5 hover:bg-slate-200/80 rounded text-slate-500 transition-colors shrink-0">
                                  {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                </div>
                                <Folder className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                <span className="uppercase tracking-wide truncate">{sec.label}</span>
                                <span className="px-1.5 py-0.2 rounded-full bg-white text-slate-600 text-[10px] font-extrabold border border-slate-200 shrink-0">
                                  {sec.students.length}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const sectionIds = sec.students.map(s => s.id);
                                    if (isAllSectionSelected) {
                                      setSelectedModalStudentIds(prev => prev.filter(id => !sectionIds.includes(id)));
                                    } else {
                                      setSelectedModalStudentIds(prev => Array.from(new Set([...prev, ...sectionIds])));
                                    }
                                  }}
                                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
                                    isAllSectionSelected
                                      ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                                      : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50 hover:border-emerald-400'
                                  }`}
                                  title={isAllSectionSelected ? "Batal pilih semua di bagian ini" : "Pilih semua di bagian ini"}
                                >
                                  {isAllSectionSelected ? (
                                    <>
                                      <CheckSquare className="h-3 w-3 stroke-[2.5]" />
                                      <span>Terpilih Semua</span>
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="h-3 w-3 stroke-[2.5]" />
                                      <span>Tambahkan Semua</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                            {!isCollapsed && sec.students.map((student, sIdx) => {
                              const isChecked = selectedModalStudentIds.includes(student.id);
                              return (
                                <div 
                                  key={`sec-${sec.key}-${student.id}-${sIdx}`} 
                                  onClick={() => setSelectedModalStudentIds(prev => prev.includes(student.id) ? prev.filter(id => id !== student.id) : [...prev, student.id])}
                                  className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 text-xs ${
                                    isChecked
                                      ? 'border-emerald-200 bg-emerald-50/10 shadow-xs'
                                      : 'border-slate-100 bg-white hover:border-emerald-200 hover:bg-emerald-50/30'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    {renderStudentAvatar(student)}
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5">
                                        <span
                                          className="font-semibold text-slate-800 truncate cursor-pointer hover:text-emerald-700 hover:underline inline-block w-fit max-w-full"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedSantriForDetail(student);
                                          }}
                                          title="Klik untuk melihat detail santri"
                                        >
                                          {student.nama}
                                        </span>
                                        {student.statusKeanggotaan === 'Alumni' && (
                                          <span className="px-1.5 py-0.2 rounded-full text-[8px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200/80 shrink-0">
                                            Alumni
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                                        {[student.desa, student.kecamatan, student.kabupaten].filter(Boolean).map(x => x!.trim()).join(', ') || student.alamat || student.asal || '-'}
                                      </p>
                                      <p className="text-[10px] font-semibold mt-0.5 truncate flex items-center gap-1">
                                        <span className="text-slate-400 font-medium">Kelas saat ini:</span>
                                        <span className={sec.key !== 'Belum' ? 'text-amber-800 font-bold bg-amber-50/80 px-1.5 py-0.2 rounded border border-amber-200/60' : 'text-slate-400 font-medium'}>
                                          {sec.label}
                                        </span>
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedModalStudentIds(prev => prev.includes(student.id) ? prev.filter(id => id !== student.id) : [...prev, student.id]);
                                    }}
                                    className={`h-8 w-8 rounded-lg transition-all shrink-0 cursor-pointer flex items-center justify-center border shadow-3xs ${
                                      isChecked
                                        ? 'bg-emerald-600 text-white border-emerald-600'
                                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border-emerald-200/80 hover:border-emerald-600'
                                    }`}
                                    title="Pilih Santri"
                                  >
                                    <Plus className="h-4 w-4 stroke-[2.5]" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* RIGHT COLUMN: SELECTED SANTRI */}
                <div className="flex flex-col h-full overflow-hidden bg-slate-50/40">
                  {/* Right Header */}
                  <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      Santri Dipilih
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                        {selectedStudentsForModal.length}
                      </span>
                    </span>
                    {selectedStudentsForModal.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedModalStudentIds([])}
                        className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 cursor-pointer hover:underline"
                      >
                        Hapus Semua
                      </button>
                    )}
                  </div>

                  {/* Right Scroll List */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                    {selectedStudentsForModal.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center py-12 text-center text-slate-400 text-xs">
                        <CheckCircle2 className="h-8 w-8 text-slate-200 mb-2 stroke-[1.5]" />
                        <p className="font-medium">Belum ada santri dipilih</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Klik santri di sebelah kiri untuk menambahkan</p>
                      </div>
                    ) : (
                      selectedStudentsForModal.map((student, sIdx) => (
                        <div 
                          key={`sel-modal-${student.id}-${sIdx}`} 
                          className="p-2.5 rounded-xl border border-emerald-100 bg-emerald-50/40 flex items-center justify-between gap-3 text-xs transition-all"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {renderStudentAvatar(student)}
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 truncate">{student.nama}</p>
                              <p className="text-[10px] text-slate-500 font-medium mt-0.5 truncate">
                                {[student.desa, student.kecamatan, student.kabupaten].filter(Boolean).map(x => x!.trim()).join(', ') || student.alamat || student.asal || '-'}
                                <span className="mx-1 text-slate-300">|</span>
                                {(() => {
                                  if (activeTab === 'Rombel') {
                                    const catId = selectedLembaga?.id || (selectedKelas ? groupsList.find(g => g.id === selectedKelas.id)?.kategoriId : undefined);
                                    const ass = assignmentsList.find(a => 
                                      a.santriId === student.id && 
                                      (
                                        (catId && a.kategoriId === catId) || 
                                        groupsList.some(g => g.id === a.kelompokId && g.kategoriId === catId)
                                      )
                                    );
                                    const groupName = ass ? groupsList.find(g => g.id === ass.kelompokId)?.nama : null;
                                    return (
                                      <span className={groupName ? 'text-amber-700 font-bold' : 'text-slate-400 font-normal'}>
                                        {groupName || 'Belum tergabung'}
                                      </span>
                                    );
                                  } else {
                                    const foundClass = targetLembagaClasses.find(c => classStudentSets[c.id]?.has(student.id));
                                    return (
                                      <span className={foundClass ? 'text-amber-700 font-bold' : 'text-slate-400 font-normal'}>
                                        {foundClass ? foundClass.nama : 'Belum tergabung'}
                                      </span>
                                    );
                                  }
                                })()}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedModalStudentIds(prev => prev.filter(id => id !== student.id))}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                            title="Batal Pilih"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* Footer / Action */}
              <div className="px-6 py-3.5 border-t border-slate-100 bg-white shrink-0 flex items-center justify-between gap-4">
                <p className="text-xs text-slate-500 font-medium">
                  {selectedStudentsForModal.length > 0 ? (
                    <span><strong>{selectedStudentsForModal.length} santri</strong> dipilih untuk dimasukkan ke <strong className="text-emerald-700">{selectedKelas.nama}</strong></span>
                  ) : (
                    <span>Pilih santri dari daftar di sebelah kiri</span>
                  )}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddMemberModalOpen(false);
                      setSelectedModalStudentIds([]);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmAddMembers}
                    disabled={selectedStudentsForModal.length === 0}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 disabled:hover:bg-emerald-600 shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="h-4 w-4" />
                    <span>Tambahkan ({selectedStudentsForModal.length})</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CLASS DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {classToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-xl max-w-sm w-full overflow-hidden flex flex-col"
            >
              <div className="p-5 text-center flex flex-col items-center">
                <div className="h-12 w-12 bg-rose-50 rounded-full flex items-center justify-center mb-3 animate-pulse">
                  <AlertCircle className="h-6 w-6 text-rose-600" />
                </div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                  Konfirmasi Hapus
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed px-2">
                  Apakah Anda yakin ingin menghapus {activeTab === 'Rombel' ? 'kelompok rombel' : 'kelas'} <span className="font-extrabold text-slate-800">"{classToDelete.name}"</span>? Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0 flex items-center gap-2">
                <button
                  onClick={() => setClassToDelete(null)}
                  className="flex-1 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl text-xs cursor-pointer shadow-3xs transition-colors"
                >
                  BATAL
                </button>
                <button
                  onClick={() => {
                    const id = classToDelete.id;
                    if (activeTab === 'Rombel') {
                      if (onDeleteGroup) {
                        onDeleteGroup(id);
                        showToast('Kelompok rombel berhasil dihapus.');
                      }
                    } else {
                      onDeleteKelas(id);
                      showToast('Kelas berhasil dihapus.');
                    }
                    if (selectedKelas?.id === id) {
                      setSelectedKelas(null);
                    }
                    setClassToDelete(null);
                  }}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-3xs transition-colors"
                >
                  YA, HAPUS
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* E. SANTRI DETAIL BIODATA MODAL */}
      {selectedSantriForDetail && (
        <SantriDetailModal
          selectedSantri={selectedSantriForDetail}
          onClose={() => setSelectedSantriForDetail(null)}
        />
      )}

      {/* FLOATING FIXED CLASS / ROMBEL DROPDOWN */}
      <AnimatePresence>
        {activeActionKelasId && kelasDropdownPos && (
          <>
            <div className="fixed inset-0 z-[9990]" onClick={() => { setActiveActionKelasId(null); setKelasDropdownPos(null); }} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                position: 'fixed',
                top: `${kelasDropdownPos.top}px`,
                left: `${kelasDropdownPos.left}px`,
                zIndex: 9999
              }}
              className="w-36 bg-white border border-slate-200 rounded-xl shadow-xl py-1 text-[11px] font-bold text-slate-700 text-left overflow-hidden"
            >
              {(() => {
                const c = (subClasses && subClasses.find((x: any) => x.id === activeActionKelasId)) || 
                          kelasList.find(x => x.id === activeActionKelasId) || 
                          (groupsList && groupsList.find((x: any) => x.id === activeActionKelasId));
                if (!c) return null;
                const isDefault = activeTab !== 'Rombel' && isDefaultClass(c);
                return (
                  <>
                    <button
                      onClick={() => {
                        handleOpenKelasModal(c);
                        setActiveActionKelasId(null);
                        setKelasDropdownPos(null);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 hover:text-[#00693E] transition-colors cursor-pointer block"
                    >
                      Edit {activeTab === 'Rombel' ? 'Rombel' : 'Kelas'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedKelas(c);
                        setAddMemberSearch('');
                        setIsAddMemberModalOpen(true);
                        setActiveActionKelasId(null);
                        setKelasDropdownPos(null);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#00693E]/10 hover:text-[#00693E] transition-colors cursor-pointer block border-t border-slate-100"
                    >
                      Tambah Anggota
                    </button>
                    {!isDefault && (
                      <button
                        onClick={() => {
                          handleDeleteKelasClick(c.id, c.nama);
                          setActiveActionKelasId(null);
                          setKelasDropdownPos(null);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer text-rose-600 border-t border-slate-100 mt-0.5 block"
                      >
                        Hapus {activeTab === 'Rombel' ? 'Rombel' : 'Kelas'}
                      </button>
                    )}
                  </>
                );
              })()}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Portal Dropdown Status EMIS */}
      {typeof document !== 'undefined' && activeEmisDropdownId && emisDropdownPos && createPortal(
        <>
          <div 
            className="fixed inset-0 z-[9998] bg-transparent"
            onClick={(e) => {
              e.stopPropagation();
              setActiveEmisDropdownId(null);
              setEmisDropdownPos(null);
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: emisDropdownPos.isUpward ? 'auto' : `${emisDropdownPos.top}px`,
              bottom: emisDropdownPos.isUpward ? `${window.innerHeight - emisDropdownPos.top}px` : 'auto',
              left: `${emisDropdownPos.left}px`,
            }}
            onClick={(e) => e.stopPropagation()}
            className="dropdown-container-box w-max min-w-[125px] max-w-[160px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-[9999] py-1.5 text-xs font-bold text-slate-700 animate-in fade-in zoom-in-95"
          >
            {(() => {
              const s = currentClassStudents.find(item => item.id === activeEmisDropdownId);
              if (!s) return null;
              const currentEmis = s.statusEmis || 'Belum';
              const pendingVal = pendingEmis[s.id];
              const hasChangedEmis = pendingVal !== undefined && pendingVal !== currentEmis;

              return (
                <>
                  {hasChangedEmis && (
                    <div className="flex items-center justify-between px-2.5 py-1 mb-1 border-b border-amber-100 bg-amber-50/80 rounded-t-xl">
                      <span className="text-[10px] font-bold text-amber-800">Simpan?</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const valToApply = pendingEmis[s.id] || currentEmis;
                            if (valToApply !== currentEmis && onUpdateSantri) {
                              const { extraNote } = parseCatatanInvalid(s.catatan);
                              let updated: Santri = {
                                ...s,
                                statusEmis: valToApply as any,
                                catatan: s.statusEmis === 'Invalid' && valToApply !== 'Invalid' ? extraNote : (valToApply === 'Invalid' && !s.catatan?.toLowerCase().startsWith('emis invalid:') ? `Emis Invalid: Status EMIS Invalid${s.catatan ? ` | ${s.catatan}` : ''}` : s.catatan)
                              };
                              if (valToApply === 'Belum') {
                                updated = demoteSantriToCalonPesertaDidik(s, lembagasList, kelasList);
                              }
                              onUpdateSantri(updated);
                            }
                            setActiveEmisDropdownId(null);
                            setEmisDropdownPos(null);
                            setPendingEmis(prev => {
                              const copy = { ...prev };
                              delete copy[s.id];
                              return copy;
                            });
                          }}
                          className="rounded p-0.5 bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer transition-all shadow-2xs active:scale-95 flex items-center justify-center"
                          title="Terapkan"
                        >
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveEmisDropdownId(null);
                            setEmisDropdownPos(null);
                            setPendingEmis(prev => {
                              const copy = { ...prev };
                              delete copy[s.id];
                              return copy;
                            });
                          }}
                          className="rounded p-0.5 bg-slate-200 text-slate-700 hover:bg-slate-300 cursor-pointer transition-all shadow-2xs active:scale-95 flex items-center justify-center"
                          title="Batal"
                        >
                          <X className="h-3.5 w-3.5 stroke-[3]" />
                        </button>
                      </div>
                    </div>
                  )}

                  {(['Terdaftar', 'Invalid', 'Belum'] as const).map((emisOption) => {
                    const activeVal = pendingEmis[s.id] || currentEmis;
                    const isCurrent = activeVal === emisOption;
                    return (
                      <button
                        key={emisOption}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingEmis(prev => ({ ...prev, [s.id]: emisOption }));
                        }}
                        className={`w-full text-left px-3 py-1.5 transition-colors flex items-center justify-between cursor-pointer ${
                          isCurrent 
                            ? (emisOption === 'Invalid' ? 'bg-rose-50 text-rose-700 font-bold' : 'bg-emerald-50 text-emerald-700 font-bold') 
                            : 'hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <span className={emisOption === 'Invalid' ? 'text-rose-600 font-bold' : ''}>{emisOption}</span>
                        {isCurrent && <span className={`h-1.5 w-1.5 rounded-full ${emisOption === 'Invalid' ? 'bg-rose-600' : 'bg-emerald-600'}`} />}
                      </button>
                    );
                  })}
                </>
              );
            })()}
          </div>
        </>,
        document.body
      )}

      {/* Portal Dropdown Status Verval */}
      {typeof document !== 'undefined' && activeVervalDropdownId && vervalDropdownPos && createPortal(
        <>
          <div 
            className="fixed inset-0 z-[9998] bg-transparent"
            onClick={(e) => {
              e.stopPropagation();
              setActiveVervalDropdownId(null);
              setVervalDropdownPos(null);
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: vervalDropdownPos.isUpward ? 'auto' : `${vervalDropdownPos.top}px`,
              bottom: vervalDropdownPos.isUpward ? `${window.innerHeight - vervalDropdownPos.top}px` : 'auto',
              left: `${vervalDropdownPos.left}px`,
            }}
            onClick={(e) => e.stopPropagation()}
            className="dropdown-container-box w-max min-w-[115px] max-w-[140px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-[9999] py-1.5 text-xs font-bold text-slate-700 animate-in fade-in zoom-in-95"
          >
            {(() => {
              const s = currentClassStudents.find(item => item.id === activeVervalDropdownId);
              if (!s) return null;
              const isNisnValid = Boolean(s.nisn && s.nisn.trim() !== '');
              const currentDefault = isNisnValid ? 'Sukses' : 'Proses';
              const currentVerval = s.statusVerval || currentDefault;
              const pendingVal = pendingVerval[s.id];
              const hasChangedVerval = pendingVal !== undefined && pendingVal !== currentVerval;

              return (
                <>
                  {hasChangedVerval && (
                    <div className="flex items-center justify-between px-2.5 py-1 mb-1 border-b border-amber-100 bg-amber-50/80 rounded-t-xl">
                      <span className="text-[10px] font-bold text-amber-800">Simpan?</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const valToApply = pendingVerval[s.id] || currentVerval;
                            if (valToApply !== currentVerval && onUpdateSantri) {
                              onUpdateSantri({
                                ...s,
                                statusVerval: valToApply as any
                              });
                            }
                            setActiveVervalDropdownId(null);
                            setVervalDropdownPos(null);
                            setPendingVerval(prev => {
                              const copy = { ...prev };
                              delete copy[s.id];
                              return copy;
                            });
                          }}
                          className="rounded p-0.5 bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer transition-all shadow-2xs active:scale-95 flex items-center justify-center"
                          title="Terapkan"
                        >
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveVervalDropdownId(null);
                            setVervalDropdownPos(null);
                            setPendingVerval(prev => {
                              const copy = { ...prev };
                              delete copy[s.id];
                              return copy;
                            });
                          }}
                          className="rounded p-0.5 bg-slate-200 text-slate-700 hover:bg-slate-300 cursor-pointer transition-all shadow-2xs active:scale-95 flex items-center justify-center"
                          title="Batal"
                        >
                          <X className="h-3.5 w-3.5 stroke-[3]" />
                        </button>
                      </div>
                    </div>
                  )}

                  {(['Sukses', 'Proses'] as const).map((vervalOption) => {
                    const activeVal = pendingVerval[s.id] || currentVerval;
                    const isCurrent = activeVal === vervalOption;
                    return (
                      <button
                        key={vervalOption}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingVerval(prev => ({ ...prev, [s.id]: vervalOption }));
                        }}
                        className={`w-full text-left px-3 py-1.5 transition-colors flex items-center justify-between cursor-pointer ${
                          isCurrent ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <span>{vervalOption}</span>
                        {isCurrent && <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />}
                      </button>
                    );
                  })}
                </>
              );
            })()}
          </div>
        </>,
        document.body
      )}

      {/* FLOATING FIXED STUDENT DROPDOWN */}
      <AnimatePresence>
        {activeActionStudentId && studentDropdownPos && (
          <>
            <div className="fixed inset-0 z-[9990]" onClick={() => { setActiveActionStudentId(null); setStudentDropdownPos(null); }} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                position: 'fixed',
                top: `${studentDropdownPos.top}px`,
                left: `${studentDropdownPos.left}px`,
                zIndex: 9999
              }}
              className="w-32 bg-white border border-slate-200 rounded-xl shadow-lg py-1 text-[11px] font-bold text-slate-700 text-left"
            >
              {(() => {
                const s = santriList.find(x => x.id === activeActionStudentId);
                if (!s) return null;
                return (
                  <>
                    <button
                      onClick={() => {
                        setSelectedSantriForDetail(s);
                        setActiveActionStudentId(null);
                        setStudentDropdownPos(null);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 hover:text-emerald-700 transition-colors cursor-pointer block"
                    >
                      <span>Detail</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsSelectionMode(true);
                        setSelectedStudentIds([s.id]);
                        setActiveActionStudentId(null);
                        setStudentDropdownPos(null);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 hover:text-[#00693E] transition-colors cursor-pointer block"
                    >
                      <span>Pilih</span>
                    </button>
                    <button
                      onClick={() => {
                        setTransferStudent(s);
                        setTransferLembagaId(selectedLembaga.id);
                        setDestClassId('');
                        setActiveActionStudentId(null);
                        setStudentDropdownPos(null);
                      }}
                      className="w-full text-left px-3 py-1.5 transition-colors cursor-pointer block hover:bg-slate-50 hover:text-blue-700"
                    >
                      <span>Pindah</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveActionStudentId(null);
                        setStudentDropdownPos(null);
                        handleRemoveStudentFromClass(s);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer text-rose-600 border-t border-slate-50 mt-1 block"
                    >
                      <span>Keluarkan</span>
                    </button>
                  </>
                );
              })()}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* E. CONFIRM REMOVE STUDENT(S) MODAL */}
      <AnimatePresence>
        {confirmRemoveOpen && confirmRemoveData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-xl max-w-sm w-full overflow-hidden"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-rose-50/40">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0" />
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                    Konfirmasi Pengeluaran
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setConfirmRemoveOpen(false);
                    setConfirmRemoveData(null);
                  }}
                  className="p-1 rounded-lg hover:bg-rose-100/50 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-3">
                <div className="text-xs font-medium text-slate-600 leading-relaxed space-y-2">
                  {confirmRemoveData.type === 'single' ? (
                    <p>
                      Apakah Anda yakin ingin mengeluarkan <strong className="text-slate-800 font-extrabold">{confirmRemoveData.studentName}</strong> dari {confirmRemoveData.label} <strong className="text-rose-600 font-extrabold">"{confirmRemoveData.className}"</strong>?
                    </p>
                  ) : (
                    <p>
                      Apakah Anda yakin ingin mengeluarkan <strong className="text-slate-800 font-extrabold">{confirmRemoveData.count} santri terpilih</strong> dari {confirmRemoveData.label} <strong className="text-rose-600 font-extrabold">"{confirmRemoveData.className}"</strong>?
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400 font-medium">
                    Tindakan ini akan mengeluarkan santri dari kelas/kelompok aktif tersebut.
                  </p>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setConfirmRemoveOpen(false);
                    setConfirmRemoveData(null);
                  }}
                  className="px-3.5 py-1.5 border border-slate-250 text-slate-500 rounded-lg text-xs font-bold hover:bg-slate-100 cursor-pointer transition-colors uppercase tracking-tight"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    confirmRemoveData.onConfirm();
                    setConfirmRemoveOpen(false);
                    setConfirmRemoveData(null);
                  }}
                  className="px-4.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold hover:shadow-xs cursor-pointer transition-colors uppercase tracking-tight"
                >
                  Keluarkan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Minimalist Batch Action Bar */}
      <AnimatePresence>
        {isSelectionMode && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 shadow-2xl rounded-2xl px-4 py-2.5 text-xs font-sans max-w-[92vw] sm:max-w-max"
          >
            {/* Left side: Count selected */}
            <div className="flex items-center gap-2 border-r border-slate-700 pr-3">
              <div className="h-5 w-5 rounded-full bg-emerald-500 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                {selectedStudentIds.length}
              </div>
              <span className="font-bold whitespace-nowrap text-slate-200">
                {selectedStudentIds.length} Santri Dipilih
              </span>
            </div>

            {/* Right side: Action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (selectedStudentIds.length === 0) {
                    showToast('Pilih setidaknya satu santri terlebih dahulu.');
                    return;
                  }
                  setIsBulkTransferOpen(true);
                  setBulkTransferLembagaId(selectedLembaga?.id || '');
                  setBulkDestClassId('');
                }}
                disabled={selectedStudentIds.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer border-none"
                title="Pindah Kelas/Rombel Masal"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
                <span>Pindah Masal</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (selectedStudentIds.length === 0) {
                    showToast('Pilih setidaknya satu santri terlebih dahulu.');
                    return;
                  }
                  handleBulkRemoveStudentsFromClass();
                }}
                disabled={selectedStudentIds.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer border-none"
                title="Keluarkan Masal"
              >
                <UserMinus className="h-3.5 w-3.5" />
                <span>Keluarkan</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedStudentIds([]);
                  setIsSelectionMode(false);
                }}
                className="px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white font-bold transition-all cursor-pointer border-none bg-transparent"
                title="Tutup Mode Pilih"
              >
                Batal
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
