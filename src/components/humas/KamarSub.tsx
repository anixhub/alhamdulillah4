import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, Home, BedDouble, Plus, Trash2, Edit, Users, ChevronRight, ChevronLeft,
  ArrowLeft, Search, Check, CheckCircle2, AlertCircle, X, MoreVertical, Award,
  Folder, FolderOpen, User, ArrowUpDown, Pencil, Settings, UserPlus, ArrowUp, ArrowDown,
  ChevronDown, Printer, Sparkles, UserCheck, ShieldAlert, UserMinus, ArrowLeftRight,
  Download, Eye, Sliders, Hash, FileSpreadsheet, ListOrdered, Shuffle, Crown, DoorClosed, CheckSquare
} from 'lucide-react';
import { Kompleks, Kamar, Santri } from '../../types';
import SantriDetailModal from '../sekretaris/SantriDetailModal';
import { renderSantriAvatar, calculateRealtimeAge, getPesantrenProfile } from '../SekretarisHelper';

interface KamarSubProps {
  kompleksList: Kompleks[];
  kamarList: Kamar[];
  santriList: Santri[];
  onAddKompleks: (newKom: Kompleks) => void;
  onUpdateKompleks: (upKom: Kompleks) => void;
  onDeleteKompleks: (id: string) => void;
  onAddKamar: (newKam: Kamar) => void;
  onUpdateKamar: (upKam: Kamar) => void;
  onDeleteKamar: (id: string) => void;
  onUpdateSantriRoom: (santriId: string, roomText: string, nomorLemari?: string) => void;
  canViewPutra?: boolean;
  canViewPutri?: boolean;
  canWritePutra?: boolean;
  canWritePutri?: boolean;
}

export default function KamarSub({
  kompleksList,
  kamarList,
  santriList,
  onAddKompleks,
  onUpdateKompleks,
  onDeleteKompleks,
  onAddKamar,
  onUpdateKamar,
  onDeleteKamar,
  onUpdateSantriRoom,
  canViewPutra = true,
  canViewPutri = true,
  canWritePutra = true,
  canWritePutri = true
}: KamarSubProps) {
  // Gender Filter state
  const [selectedGender, setSelectedGender] = useState<'Putra' | 'Putri'>('Putra');

  // Synchronize gender selection with view permissions
  useEffect(() => {
    if (!canViewPutra && canViewPutri) {
      setSelectedGender('Putri');
    } else if (canViewPutra && !canViewPutri) {
      setSelectedGender('Putra');
    }
  }, [canViewPutra, canViewPutri]);

  const canWriteCurrent = selectedGender === 'Putra' ? canWritePutra : canWritePutri;

  // Selected Kompleks & Selected Kamar states (matching Lembaga & Kelas hierarchy)
  const [selectedKompleksId, setSelectedKompleksId] = useState<string>('');
  const [activeRoomForDetail, setActiveRoomForDetail] = useState<Kamar | null>(null);

  // Search & Filter for Kamar grid
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [roomSortKey, setRoomSortKey] = useState<'name-asc' | 'name-desc' | 'students-desc' | 'students-asc'>('name-asc');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  // Search, Filter & Sort for Santri Table
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Semua');
  const [sortField, setSortField] = useState<'nama' | 'nis' | 'nomorLemari' | 'statusKeanggotaan' | 'kamar' | 'alamat' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  // Drag and drop
  const [draggedStudentId, setDraggedStudentId] = useState<string | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const [quickAssignSlot, setQuickAssignSlot] = useState<number | null>(null);
  const [targetSlotForAdd, setTargetSlotForAdd] = useState<number | null>(null);

  // Selection & Bulk Action
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isBulkTransferOpen, setIsBulkTransferOpen] = useState(false);
  const [bulkDestKompleksId, setBulkDestKompleksId] = useState('');
  const [bulkDestRoomId, setBulkDestRoomId] = useState('');
  const [bulkNomorLemari, setBulkNomorLemari] = useState('');

  // Dropdowns & Menu Action
  const [activeActionKompleksId, setActiveActionKompleksId] = useState<string | null>(null);
  const [activeActionKamarId, setActiveActionKamarId] = useState<string | null>(null);
  const [activeStudentDropdownId, setActiveStudentDropdownId] = useState<string | null>(null);
  const [studentDropdownPos, setStudentDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const [isAutoNumberingDropdownOpen, setIsAutoNumberingDropdownOpen] = useState(false);
  const [isAcakDropdownOpen, setIsAcakDropdownOpen] = useState(false);

  // Modals
  const [isKompleksModalOpen, setIsKompleksModalOpen] = useState(false);
  const [editingKompleks, setEditingKompleks] = useState<Kompleks | null>(null);
  const [komNama, setKomNama] = useState('');
  const [komKode, setKomKode] = useState('');

  const [isKamarModalOpen, setIsKamarModalOpen] = useState(false);
  const [editingKamar, setEditingKamar] = useState<Kamar | null>(null);
  const [kamNama, setKamNama] = useState('');
  const [kamKetua, setKamKetua] = useState('');
  const [kamKapasitas, setKamKapasitas] = useState<number>(15);

  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [addMemberSearch, setAddMemberSearch] = useState('');
  const [addMemberSpecificRoomFilter, setAddMemberSpecificRoomFilter] = useState<string>('BelumKamar');
  const [addMemberLemariFilter, setAddMemberLemariFilter] = useState<string>('Semua');
  const [collapsedRoomKeys, setCollapsedRoomKeys] = useState<string[]>([]);

  // Prevent background body scrolling when add member modal is open
  useEffect(() => {
    if (isAddMemberModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isAddMemberModalOpen]);

  // Auto-scroll page when dragging items near viewport top or bottom edge
  useEffect(() => {
    if (!draggedStudentId) return;

    let animFrameId: number | null = null;
    let currentY = 0;

    const handleDragOver = (e: DragEvent) => {
      if (e.clientY) {
        currentY = e.clientY;
      }
    };

    const handleDragEndGlobal = () => {
      setDraggedStudentId(null);
    };

    const doAutoScroll = () => {
      if (currentY > 0) {
        const threshold = 120;
        const vh = window.innerHeight;

        if (currentY < threshold) {
          const ratio = (threshold - currentY) / threshold;
          const scrollSpeed = Math.max(4, Math.round(ratio * 28));
          window.scrollBy(0, -scrollSpeed);
        } else if (currentY > vh - threshold) {
          const ratio = (currentY - (vh - threshold)) / threshold;
          const scrollSpeed = Math.max(4, Math.round(ratio * 28));
          window.scrollBy(0, scrollSpeed);
        }
      }
      animFrameId = requestAnimationFrame(doAutoScroll);
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragend', handleDragEndGlobal);
    window.addEventListener('drop', handleDragEndGlobal);
    animFrameId = requestAnimationFrame(doAutoScroll);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragend', handleDragEndGlobal);
      window.removeEventListener('drop', handleDragEndGlobal);
      if (animFrameId) cancelAnimationFrame(animFrameId);
    };
  }, [draggedStudentId]);
  const [selectedModalStudentIds, setSelectedModalStudentIds] = useState<string[]>([]);

  const [selectedSantriForDetail, setSelectedSantriForDetail] = useState<Santri | null>(null);
  const [singleTransferStudent, setSingleTransferStudent] = useState<Santri | null>(null);
  const [singleDestKompleksId, setSingleDestKompleksId] = useState('');
  const [singleDestRoomId, setSingleDestRoomId] = useState('');
  const [singleNomorLemari, setSingleNomorLemari] = useState('');

  const [editingLemariStudent, setEditingLemariStudent] = useState<Santri | null>(null);
  const [tempLemariValue, setTempLemariValue] = useState('');

  // Toast & Confirm Modal
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Universal Floating Dropdown Menu
  const [menuDropdown, setMenuDropdown] = useState<{
    type: 'kompleks' | 'kamar' | 'santri';
    id: string;
    top: number;
    right: number;
    data?: any;
  } | null>(null);

  const handleOpenMenu = (
    e: React.MouseEvent,
    type: 'kompleks' | 'kamar' | 'santri',
    id: string,
    data?: any
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (menuDropdown?.id === id && menuDropdown?.type === type) {
      setMenuDropdown(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const right = Math.max(8, window.innerWidth - rect.right);
    const top = rect.bottom + 4;
    setMenuDropdown({ type, id, top, right, data });
  };

  // Close dropdown menu automatically on any scroll event
  useEffect(() => {
    if (!menuDropdown) return;
    const handleScroll = () => {
      setMenuDropdown(null);
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [menuDropdown]);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    isDanger?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    confirmText: 'Konfirmasi',
    isDanger: true
  });

  const askConfirmation = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText = 'Konfirmasi',
    isDanger = true
  ) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm,
      confirmText,
      isDanger
    });
  };

  // Scroll & Table navigation refs
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const updateScrollButtons = () => {
    const container = tableContainerRef.current;
    if (container) {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      const hasHorizontalScroll = scrollWidth > clientWidth + 4;
      setCanScrollLeft(hasHorizontalScroll && scrollLeft > 2);
      setCanScrollRight(hasHorizontalScroll && scrollLeft < scrollWidth - clientWidth - 4);
    }
  };

  const scrollTable = (direction: 'left' | 'right') => {
    const container = tableContainerRef.current;
    if (container) {
      const scrollAmount = direction === 'left' ? -260 : 260;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const handleClose = () => {
      setActiveActionKompleksId(null);
      setActiveActionKamarId(null);
      setActiveStudentDropdownId(null);
      setStudentDropdownPos(null);
    };
    window.addEventListener('scroll', handleClose, true);
    window.addEventListener('resize', handleClose, true);
    window.addEventListener('click', handleClose, true);
    return () => {
      window.removeEventListener('scroll', handleClose, true);
      window.removeEventListener('resize', handleClose, true);
      window.removeEventListener('click', handleClose, true);
    };
  }, []);

  // Filtered list of Kompleks by selected gender
  const currentGenderKompleks = kompleksList.filter(k => (k.gender || 'Putra') === selectedGender);

  // Ensure selected Kompleks exists
  useEffect(() => {
    if (selectedKompleksId) {
      const exists = currentGenderKompleks.some(k => k.id === selectedKompleksId);
      if (!exists) {
        setSelectedKompleksId('');
        setActiveRoomForDetail(null);
      }
    }
  }, [selectedGender, kompleksList]);

  const selectedKompleks = kompleksList.find(k => k.id === selectedKompleksId);

  // Filtered Rooms under currently selected Kompleks
  const activeRooms = kamarList.filter(r => r.kompleksId === selectedKompleksId);

  // Helper to get students belonging to a room
  const getMembersOfRoom = (roomName: string) => {
    return santriList.filter(s => {
      if (s.gender !== selectedGender) return false;
      if (s.statusKeanggotaan && s.statusKeanggotaan !== 'Aktif') return false;
      return (s.kamar || '').trim().toLowerCase() === roomName.trim().toLowerCase();
    });
  };

  // Helper to get students belonging to a kompleks
  const getMembersOfKompleks = (kompleksId: string) => {
    const roomsInKompleks = kamarList.filter(r => r.kompleksId === kompleksId).map(r => r.nama.trim().toLowerCase());
    return santriList.filter(s => {
      if (s.gender !== selectedGender) return false;
      if (s.statusKeanggotaan && s.statusKeanggotaan !== 'Aktif') return false;
      const kName = (s.kamar || '').trim().toLowerCase();
      return kName && kName !== 'tanpa kamar' && roomsInKompleks.includes(kName);
    });
  };

  // Searched & Sorted Rooms for grid
  const searchedRooms = activeRooms.filter(r => {
    if (!roomSearchQuery) return true;
    const q = roomSearchQuery.toLowerCase();
    return (
      (r.nama || '').toLowerCase().includes(q) ||
      (r.ketuaKamar || '').toLowerCase().includes(q)
    );
  });

  const sortedRooms = [...searchedRooms].sort((a, b) => {
    if (roomSortKey === 'name-asc') return a.nama.localeCompare(b.nama);
    if (roomSortKey === 'name-desc') return b.nama.localeCompare(a.nama);
    if (roomSortKey === 'students-desc') return getMembersOfRoom(b.nama).length - getMembersOfRoom(a.nama).length;
    if (roomSortKey === 'students-asc') return getMembersOfRoom(a.nama).length - getMembersOfRoom(b.nama).length;
    return 0;
  });

  // Calculate Overall Gender Statistics
  const activeGenderSantri = santriList.filter(s => s.gender === selectedGender && (!s.statusKeanggotaan || s.statusKeanggotaan === 'Aktif'));
  const activeGenderKompleksIds = currentGenderKompleks.map(k => k.id);
  const activeGenderKamar = kamarList.filter(r => activeGenderKompleksIds.includes(r.kompleksId));
  const activeGenderRoomNames = activeGenderKamar.map(r => r.nama.toLowerCase());

  const placedSantriCount = activeGenderSantri.filter(s => {
    const kName = (s.kamar || '').trim().toLowerCase();
    return kName && kName !== 'tanpa kamar' && activeGenderRoomNames.includes(kName);
  }).length;

  const totalGenderCapacity = activeGenderKamar.reduce((sum, r) => sum + (r.kapasitas || 15), 0);
  const overallOccupancyPercent = totalGenderCapacity > 0 ? Math.min(100, Math.round((placedSantriCount / totalGenderCapacity) * 100)) : 0;

  // Active room members (when in detail mode)
  const currentRoomMembers = activeRoomForDetail ? getMembersOfRoom(activeRoomForDetail.nama) : [];

  // Filtered members for detail view
  const filteredStudents = currentRoomMembers.filter(s => {
    // Search query
    if (studentSearchQuery) {
      const q = studentSearchQuery.toLowerCase();
      const matchName = (s.nama || '').toLowerCase().includes(q);
      const matchNis = (s.nis || '').toLowerCase().includes(q);
      const matchLemari = (s.nomorLemari || '').toLowerCase().includes(q);
      if (!matchName && !matchNis && !matchLemari) return false;
    }

    // Status filter (Muqim vs Kampung)
    if (statusFilter !== 'Semua') {
      const sStatus = (s.statusDomisili || s.status || 'Muqim').toLowerCase();
      if (statusFilter === 'Muqim' && sStatus !== 'muqim') return false;
      if (statusFilter === 'Kampung' && sStatus !== 'kampung') return false;
    }

    return true;
  });

  // Sorted students
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (!sortField) return 0;
    let valA = '';
    let valB = '';

    if (sortField === 'nama') { valA = a.nama; valB = b.nama; }
    else if (sortField === 'nis') { valA = a.nis || ''; valB = b.nis || ''; }
    else if (sortField === 'nomorLemari') { valA = a.nomorLemari || ''; valB = b.nomorLemari || ''; }
    else if (sortField === 'statusKeanggotaan') { valA = a.statusKeanggotaan || ''; valB = b.statusKeanggotaan || ''; }
    else if (sortField === 'kamar') { valA = a.kamar || ''; valB = b.kamar || ''; }
    else if (sortField === 'alamat') { 
      valA = a.desa ? `Ds. ${a.desa}, Kec. ${a.kecamatan || ''}` : (a.alamat || a.asal || '');
      valB = b.desa ? `Ds. ${b.desa}, Kec. ${b.kecamatan || ''}` : (b.alamat || b.asal || '');
    }

    const res = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
    return sortDirection === 'asc' ? res : -res;
  });

  // Pagination
  const itemsPerPage = 50;
  const totalPages = Math.ceil(sortedStudents.length / itemsPerPage) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = (activePage - 1) * itemsPerPage;
  const paginatedStudents = sortedStudents.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    updateScrollButtons();
    window.addEventListener('resize', updateScrollButtons);
    return () => window.removeEventListener('resize', updateScrollButtons);
  }, [activeRoomForDetail, currentPage, filteredStudents.length]);

  // Sorting Handler
  const handleSort = (field: 'nama' | 'nis' | 'nomorLemari' | 'statusKeanggotaan' | 'kamar' | 'alamat') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortableHeader = (label: string, field: 'nama' | 'nis' | 'nomorLemari' | 'statusKeanggotaan' | 'kamar' | 'alamat', extraClass: string) => {
    const isSorted = sortField === field;
    return (
      <th 
        onClick={() => handleSort(field)} 
        className={`${extraClass} cursor-pointer hover:bg-slate-200 transition-colors select-none text-left`}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-slate-600">{label}</span>
          {isSorted ? (
            sortDirection === 'asc' ? (
              <ArrowUp className="h-3 w-3 text-purple-600 font-bold shrink-0" />
            ) : (
              <ArrowDown className="h-3 w-3 text-purple-600 font-bold shrink-0" />
            )
          ) : (
            <ArrowUpDown className="h-3 w-3 text-slate-400 hover:text-slate-600 shrink-0" />
          )}

          {field === 'nama' && canScrollLeft && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                scrollTable('left');
              }}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-[40] flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md hover:bg-slate-50 transition-all cursor-pointer"
              title="Gulir Kiri"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </th>
    );
  };

  // Handlers for Add / Edit Kompleks
  const handleOpenAddKompleks = () => {
    setEditingKompleks(null);
    setKomNama('');
    setKomKode('');
    setIsKompleksModalOpen(true);
  };

  const handleOpenEditKompleks = (kom: Kompleks) => {
    setEditingKompleks(kom);
    setKomNama(kom.nama);
    setKomKode(kom.kode || '');
    setIsKompleksModalOpen(true);
  };

  const handleSaveKompleks = (e: React.FormEvent) => {
    e.preventDefault();
    if (!komNama.trim()) return;

    if (editingKompleks) {
      onUpdateKompleks({
        ...editingKompleks,
        nama: komNama.trim(),
        kode: komKode.trim(),
        gender: selectedGender
      });
      showToast(`Kompleks "${komNama.trim()}" berhasil diperbarui.`);
    } else {
      const newKom: Kompleks = {
        id: 'KOM-' + Date.now().toString().slice(-6) + Math.floor(100 + Math.random() * 900),
        nama: komNama.trim(),
        kode: komKode.trim() || 'KMP-' + String(currentGenderKompleks.length + 1).padStart(2, '0'),
        gender: selectedGender
      };
      onAddKompleks(newKom);
      setSelectedKompleksId(newKom.id);
      showToast(`Kompleks "${komNama.trim()}" berhasil ditambahkan.`);
    }
    setIsKompleksModalOpen(false);
  };

  // Handlers for Add / Edit Kamar
  const handleOpenAddKamar = () => {
    setEditingKamar(null);
    setKamNama('');
    setKamKetua('');
    setKamKapasitas(15);
    setIsKamarModalOpen(true);
  };

  const handleOpenEditKamar = (kam: Kamar) => {
    setEditingKamar(kam);
    setKamNama(kam.nama);
    setKamKetua(kam.ketuaKamar || '');
    setKamKapasitas(kam.kapasitas || 15);
    setIsKamarModalOpen(true);
  };

  const handleSaveKamar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kamNama.trim() || !selectedKompleksId) return;

    if (editingKamar) {
      const updated = {
        ...editingKamar,
        nama: kamNama.trim(),
        ketuaKamar: kamKetua.trim(),
        kapasitas: Number(kamKapasitas) || 15
      };
      onUpdateKamar(updated);
      if (activeRoomForDetail?.id === updated.id) {
        setActiveRoomForDetail(updated);
      }
      showToast(`Kamar "${kamNama.trim()}" berhasil diperbarui.`);
    } else {
      const newKam: Kamar = {
        id: 'KMR-' + Date.now().toString().slice(-6) + Math.floor(100 + Math.random() * 900),
        kompleksId: selectedKompleksId,
        nama: kamNama.trim(),
        ketuaKamar: kamKetua.trim(),
        kapasitas: Number(kamKapasitas) || 15
      };
      onAddKamar(newKam);
      showToast(`Kamar "${kamNama.trim()}" berhasil ditambahkan.`);
    }
    setIsKamarModalOpen(false);
  };

  // Shuffle/Randomize santri into available closet slots
  const handleAcakSantri = () => {
    setIsAcakDropdownOpen(false);
    if (!activeRoomForDetail) return;
    const members = getMembersOfRoom(activeRoomForDetail.nama);
    if (members.length === 0) {
      showToast('Tidak ada santri di kamar ini untuk diacak.', 'error');
      return;
    }
    const capacity = activeRoomForDetail.kapasitas || 15;

    // Shuffle members array
    const shuffledMembers = [...members];
    for (let i = shuffledMembers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledMembers[i], shuffledMembers[j]] = [shuffledMembers[j], shuffledMembers[i]];
    }

    // Available slots 1..capacity
    const availableSlots = Array.from({ length: capacity }, (_, i) => i + 1);
    for (let i = availableSlots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availableSlots[i], availableSlots[j]] = [availableSlots[j], availableSlots[i]];
    }

    // Assign slots: fill empty lockers 1-by-1 first, if > capacity, distribute additional into slots
    shuffledMembers.forEach((santri, idx) => {
      let slotAssigned: number;
      if (idx < capacity) {
        slotAssigned = availableSlots[idx];
      } else {
        slotAssigned = availableSlots[idx % capacity];
      }
      onUpdateSantriRoom(santri.id, activeRoomForDetail.nama, String(slotAssigned));
    });

    showToast(`Pengacakan selesai! ${shuffledMembers.length} santri berhasil ditempatkan di lemari.`);
  };

  const handleAcakLemariKosong = () => {
    setIsAcakDropdownOpen(false);
    if (!activeRoomForDetail) return;
    const members = getMembersOfRoom(activeRoomForDetail.nama);
    if (members.length === 0) {
      showToast('Tidak ada santri di kamar ini.', 'error');
      return;
    }
    const capacity = activeRoomForDetail.kapasitas || 15;

    const occupiedSlotNums = new Set(
      members
        .map(s => parseInt(s.nomorLemari || '0', 10))
        .filter(num => num > 0)
    );

    const emptySlots = Array.from({ length: capacity }, (_, i) => i + 1).filter(s => !occupiedSlotNums.has(s));

    if (emptySlots.length === 0) {
      showToast('Tidak ada lemari kosong yang tersisa.', 'error');
      return;
    }

    const unassignedMembers = members.filter(s => {
      const num = parseInt(s.nomorLemari || '0', 10);
      return !num || num <= 0;
    });

    if (unassignedMembers.length === 0) {
      showToast('Semua santri di kamar ini sudah memiliki lemari.', 'error');
      return;
    }

    const shuffledMembers = [...unassignedMembers];
    for (let i = shuffledMembers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledMembers[i], shuffledMembers[j]] = [shuffledMembers[j], shuffledMembers[i]];
    }

    const shuffledSlots = [...emptySlots];
    for (let i = shuffledSlots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledSlots[i], shuffledSlots[j]] = [shuffledSlots[j], shuffledSlots[i]];
    }

    shuffledMembers.forEach((santri, idx) => {
      if (idx < shuffledSlots.length) {
        onUpdateSantriRoom(santri.id, activeRoomForDetail.nama, String(shuffledSlots[idx]));
      }
    });

    showToast(`${Math.min(shuffledMembers.length, shuffledSlots.length)} santri tanpa lemari berhasil ditempatkan di lemari kosong.`);
  };

  const handleDistributeUnassigned = (unassigned: Santri[]) => {
    if (!activeRoomForDetail || unassigned.length === 0) return;
    const roomCapacity = activeRoomForDetail.kapasitas || 15;
    if (roomCapacity <= 0) return;

    const currentMembers = getMembersOfRoom(activeRoomForDetail.nama);

    // Count occupants per locker slot 1..roomCapacity
    const slotCounts: Record<number, number> = {};
    for (let i = 1; i <= roomCapacity; i++) {
      slotCounts[i] = 0;
    }

    currentMembers.forEach(s => {
      const num = parseInt(s.nomorLemari || '0', 10);
      if (!isNaN(num) && num >= 1 && num <= roomCapacity) {
        slotCounts[num] = (slotCounts[num] || 0) + 1;
      }
    });

    // Assign each unassigned student to the slot with minimum occupants (sequentially from top)
    unassigned.forEach(student => {
      let minCount = Infinity;
      let bestSlot = 1;

      for (let slot = 1; slot <= roomCapacity; slot++) {
        const count = slotCounts[slot] || 0;
        if (count < minCount) {
          minCount = count;
          bestSlot = slot;
        }
      }

      slotCounts[bestSlot] = (slotCounts[bestSlot] || 0) + 1;
      onUpdateSantriRoom(student.id, activeRoomForDetail.nama, String(bestSlot));
    });

    showToast(`${unassigned.length} santri berhasil didistribusikan ke lemari secara merata.`);
  };

  const handleKosongkanSemuaLemari = () => {
    setIsAcakDropdownOpen(false);
    if (!activeRoomForDetail) return;
    const members = getMembersOfRoom(activeRoomForDetail.nama);
    if (members.length === 0) return;

    if (confirm(`Apakah Anda yakin ingin mengosongkan seluruh nomor lemari untuk ${members.length} santri di kamar "${activeRoomForDetail.nama}"?`)) {
      members.forEach(santri => {
        onUpdateSantriRoom(santri.id, activeRoomForDetail.nama, '');
      });
      showToast(`Semua lemari di kamar "${activeRoomForDetail.nama}" berhasil dikosongkan.`);
    }
  };

  // Drag and drop handler: MERGE (drop on occupied slot) / MOVE (drop on empty slot)
  const handleSlotDropSwap = (targetSlot: number) => {
    if (!draggedStudentId || !activeRoomForDetail) return;
    const draggedStudent = santriList.find(s => s.id === draggedStudentId);
    if (!draggedStudent) return;

    const targetSlotStr = String(targetSlot);
    const isSameRoom = (draggedStudent.kamar || '').trim().toLowerCase() === activeRoomForDetail.nama.trim().toLowerCase();
    const draggedSlotNum = parseInt(draggedStudent.nomorLemari || '0', 10);

    // Prevent drop on own locker slot
    if (isSameRoom && (draggedSlotNum === targetSlot || draggedStudent.nomorLemari === targetSlotStr)) {
      setDraggedStudentId(null);
      setDragOverSlot(null);
      return;
    }

    const currentMembers = getMembersOfRoom(activeRoomForDetail.nama);
    const targetOccupants = currentMembers.filter(s => {
      const num = parseInt(s.nomorLemari || '0', 10);
      return (num === targetSlot || s.nomorLemari === targetSlotStr) && s.id !== draggedStudent.id;
    });

    if (targetOccupants.length > 0) {
      // MERGE logic: assign dragged student to targetSlot without kicking existing occupants out
      onUpdateSantriRoom(draggedStudent.id, activeRoomForDetail.nama, targetSlotStr);

      const targetNames = targetOccupants.map(o => o.nama).join(', ');
      showToast(`${draggedStudent.nama} berhasil digabungkan ke Lemari ${String(targetSlot).padStart(2, '0')} bersama ${targetNames}.`);
    } else {
      // Move to empty slot
      onUpdateSantriRoom(draggedStudent.id, activeRoomForDetail.nama, targetSlotStr);
      showToast(`${draggedStudent.nama} dipindahkan ke Lemari ${String(targetSlot).padStart(2, '0')}.`);
    }

    setDraggedStudentId(null);
    setDragOverSlot(null);
  };

  // Add Member Modal logic
  const handleOpenAddMemberModal = (slotNum?: number) => {
    if (typeof slotNum === 'number') {
      setTargetSlotForAdd(slotNum);
      setAddMemberLemariFilter('BelumLemari');
      setAddMemberSpecificRoomFilter('Semua');
    } else {
      setTargetSlotForAdd(null);
      setAddMemberLemariFilter('Semua');
      setAddMemberSpecificRoomFilter('BelumKamar');
    }
    setSelectedModalStudentIds([]);
    setCollapsedRoomKeys([]);
    setAddMemberSearch('');
    setIsAddMemberModalOpen(true);
  };

  // Students eligible to be added to room / lemari
  const eligibleStudentsForAdd = santriList.filter(s => {
    if (s.gender !== selectedGender) return false;
    const statusKg = (s.statusKeanggotaan || (s as any).status || 'Aktif').trim().toLowerCase();
    if (statusKg !== 'aktif') return false;

    // If targetSlotForAdd is set, exclude students who are ALREADY in targetSlotForAdd in this active room
    if (activeRoomForDetail && targetSlotForAdd) {
      const inCurrentRoom = (s.kamar || '').trim().toLowerCase() === activeRoomForDetail.nama.trim().toLowerCase();
      const slotNum = parseInt(s.nomorLemari || '0', 10);
      if (inCurrentRoom && (slotNum === targetSlotForAdd || s.nomorLemari === String(targetSlotForAdd))) {
        return false;
      }
    }

    const kamarNorm = (s.kamar || '').trim().toLowerCase();
    const isBelumKamar = !kamarNorm || kamarNorm === 'tanpa kamar' || kamarNorm === 'belum kamar';
    const slotNum = parseInt(s.nomorLemari || '0', 10);
    const isBelumLemari = !s.nomorLemari || isNaN(slotNum) || slotNum <= 0;

    // Filter by Current Room (Semua, Belum Memiliki Kamar, or Specific Room Name)
    if (addMemberSpecificRoomFilter !== 'Semua') {
      if (addMemberSpecificRoomFilter === 'BelumKamar') {
        if (!isBelumKamar) return false;
      } else {
        if (s.kamar?.trim().toLowerCase() !== addMemberSpecificRoomFilter.trim().toLowerCase()) {
          return false;
        }
      }
    }

    // Filter by Status Lemari (Semua, Sudah Dapat Lemari, Belum Dapat Lemari)
    if (addMemberLemariFilter === 'SudahLemari') {
      if (isBelumLemari) return false;
    } else if (addMemberLemariFilter === 'BelumLemari') {
      if (!isBelumLemari) return false;
    }

    // Filter by search query
    if (addMemberSearch) {
      const q = addMemberSearch.toLowerCase();
      const mName = (s.nama || '').toLowerCase().includes(q);
      const mNis = (s.nis || '').toLowerCase().includes(q);
      const mKamar = (s.kamar || '').toLowerCase().includes(q);
      const mLemari = (s.nomorLemari || '').toLowerCase().includes(q);
      if (!mName && !mNis && !mKamar && !mLemari) return false;
    }

    return true;
  });

  const handleConfirmAddMembers = () => {
    if (!activeRoomForDetail || selectedModalStudentIds.length === 0) return;

    if (targetSlotForAdd) {
      // Adding co-occupants / direct assignment to targetSlotForAdd
      selectedModalStudentIds.forEach(id => {
        onUpdateSantriRoom(id, activeRoomForDetail.nama, String(targetSlotForAdd));
      });
      showToast(`${selectedModalStudentIds.length} santri berhasil ditambahkan ke Lemari No. ${String(targetSlotForAdd).padStart(2, '0')}.`);
    } else {
      // General Add Members to Room: fill empty slots sequentially, set unassigned if room full
      const roomCapacity = activeRoomForDetail.kapasitas || 15;

      const occupiedSlotNums = new Set(
        currentRoomMembers
          .map(s => parseInt(s.nomorLemari || '0', 10))
          .filter(n => !isNaN(n) && n > 0 && n <= roomCapacity)
      );

      const availableEmptySlots = Array.from({ length: roomCapacity }, (_, i) => i + 1)
        .filter(slot => !occupiedSlotNums.has(slot));

      let assignedCount = 0;
      let unassignedCount = 0;

      selectedModalStudentIds.forEach(id => {
        const slotToAssign = availableEmptySlots.shift();
        if (slotToAssign !== undefined) {
          assignedCount++;
          onUpdateSantriRoom(id, activeRoomForDetail.nama, String(slotToAssign));
        } else {
          unassignedCount++;
          onUpdateSantriRoom(id, activeRoomForDetail.nama, '');
        }
      });

      let msg = `${selectedModalStudentIds.length} santri berhasil ditambahkan ke ${activeRoomForDetail.nama}.`;
      if (unassignedCount > 0) {
        msg += ` (${assignedCount} mengisi lemari, ${unassignedCount} belum dapat lemari)`;
      }
      showToast(msg);
    }

    setSelectedModalStudentIds([]);
    setTargetSlotForAdd(null);
    setIsAddMemberModalOpen(false);
  };

  // Bulk Transfer Handler
  const handleConfirmBulkTransfer = () => {
    if (selectedStudentIds.length === 0 || !bulkDestRoomId) return;

    const destRoomObj = kamarList.find(r => r.id === bulkDestRoomId);
    if (!destRoomObj) return;

    selectedStudentIds.forEach(id => {
      onUpdateSantriRoom(id, destRoomObj.nama, bulkNomorLemari.trim());
    });

    showToast(`${selectedStudentIds.length} santri berhasil dipindahkan ke ${destRoomObj.nama}.`);
    setSelectedStudentIds([]);
    setIsSelectionMode(false);
    setIsBulkTransferOpen(false);
  };

  // Export Rooms Data to Excel
  const exportRoomsToExcel = () => {
    const profile = getPesantrenProfile();
    const filteredKompleks = kompleksList.filter(kom => kom.gender === selectedGender);

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <style>
          table { border-collapse: collapse; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 11px; }
          .title { font-size: 16px; font-weight: bold; color: #7e22ce; text-align: center; }
          .meta { font-size: 10px; color: #64748b; text-align: center; }
          .kompleks-header { background-color: #7e22ce; color: #ffffff; font-size: 13px; font-weight: bold; text-align: center; }
          .kamar-header { background-color: #f3e8ff; color: #581c87; font-size: 11px; font-weight: bold; text-align: center; }
          .table-th { background-color: #f1f5f9; font-weight: bold; color: #334155; }
        </style>
      </head>
      <body>
        <table style="width: 100%;">
          <tr>
            <td colspan="5" class="title">DATA KAMAR SANTRI ${selectedGender.toUpperCase()} - ${profile.namaPesantren.toUpperCase()}</td>
          </tr>
          <tr>
            <td colspan="5" class="meta">Laporan terkelompok per Kompleks dan Kamar (${selectedGender}) • Tanggal: ${new Date().toLocaleDateString('id-ID')}</td>
          </tr>
        </table>
        <br/>
    `;

    filteredKompleks.forEach(kom => {
      const roomsInKom = kamarList.filter(r => r.kompleksId === kom.id);
      if (roomsInKom.length === 0) return;

      html += `
        <table style="width: 100%; margin-bottom: 10px;">
          <tr class="kompleks-header">
            <td colspan="5">KOMPLEKS: ${kom.nama.toUpperCase()} (${(kom.gender || 'PUTRA').toUpperCase()})</td>
          </tr>
        </table>
      `;

      roomsInKom.forEach(rm => {
        const members = getMembersOfRoom(rm.nama);
        html += `
          <table style="width: 100%; margin-bottom: 15px;">
            <tr class="kamar-header">
              <td colspan="5">Nama Kamar: ${rm.nama} &nbsp;|&nbsp; Ketua: ${rm.ketuaKamar || '-'} &nbsp;|&nbsp; Kapasitas: ${rm.kapasitas} &nbsp;|&nbsp; Jumlah: ${members.length} Santri</td>
            </tr>
            <tr>
              <th class="table-th">No</th>
              <th class="table-th">NIS</th>
              <th class="table-th">Nama Lengkap Santri</th>
              <th class="table-th">No. Lemari</th>
              <th class="table-th">Status</th>
            </tr>
        `;

        if (members.length === 0) {
          html += `<tr><td colspan="5" style="text-align: center; color: #94a3b8; font-style: italic;">Belum ada santri terdaftar di kamar ini</td></tr>`;
        } else {
          members.sort((a, b) => a.nama.localeCompare(b.nama)).forEach((s, idx) => {
            html += `
              <tr>
                <td style="text-align: center;">${idx + 1}</td>
                <td style="text-align: center; font-family: monospace;">${s.nis || '-'}</td>
                <td style="font-weight: bold;">${s.nama}</td>
                <td style="text-align: center; font-family: monospace;">${s.nomorLemari || '-'}</td>
                <td style="text-align: center;">${s.statusKeanggotaan || 'Muqim'}</td>
              </tr>
            `;
          });
        }
        html += `</table><br/>`;
      });
    });

    html += `</body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Data_Kamar_Santri_${selectedGender}_${new Date().toISOString().slice(0, 10)}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle printing PDF for single Kamar
  const handlePrintKamarPDF = () => {
    if (!activeRoomForDetail || !selectedKompleks) return;
    const profile = getPesantrenProfile();
    const members = currentRoomMembers;

    if (members.length === 0) {
      showToast(`Tidak ada data santri pada ${activeRoomForDetail.nama}.`, 'error');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Gagal membuka jendela cetak. Pastikan pop-up dibolehkan di peramban Anda.', 'error');
      return;
    }

    const dateStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const rowsHtml = members.map((s, idx) => `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td style="font-family: monospace;">${s.nis || '-'}</td>
        <td><strong>${s.nama}</strong></td>
        <td style="text-align: center; font-family: monospace;">${s.nomorLemari || '-'}</td>
        <td style="text-align: center;">${s.statusKeanggotaan || 'Muqim'}</td>
        <td>${s.desa ? `Ds. ${s.desa}, Kec. ${s.kecamatan || '-'}` : (s.alamat || s.asal || '-')}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>DAFTAR SANTRI ${activeRoomForDetail.nama.toUpperCase()} - KOMPLEKS ${selectedKompleks.nama.toUpperCase()}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; margin: 0; padding: 10px; font-size: 11px; }
          .header { text-align: center; border-bottom: 2px solid #7e22ce; padding-bottom: 10px; margin-bottom: 15px; }
          .header h1 { margin: 0; font-size: 18px; color: #7e22ce; font-weight: bold; }
          .header p { margin: 3px 0 0; font-size: 11px; color: #64748b; }
          .title { text-align: center; font-size: 14px; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; color: #334155; }
          .info { margin-bottom: 12px; font-size: 11px; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 10px; text-align: left; }
          th { background-color: #f1f5f9; font-weight: bold; color: #334155; text-transform: uppercase; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .footer { margin-top: 25px; text-align: right; font-size: 10px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${profile.namaPesantren || 'PONDOK PESANTREN'}</h1>
          <p>${profile.alamat || ''} ${(profile as any).kota ? ' - ' + (profile as any).kota : ''}</p>
        </div>
        <div class="title">DAFTAR SANTRI ${activeRoomForDetail.nama.toUpperCase()} — KOMPLEKS ${selectedKompleks.nama.toUpperCase()}</div>
        <div class="info">
          <strong>Ketua Kamar:</strong> ${activeRoomForDetail.ketuaKamar || '-'} &nbsp;|&nbsp; 
          <strong>Kapasitas:</strong> ${activeRoomForDetail.kapasitas || 15} Bed &nbsp;|&nbsp; 
          <strong>Total Santri:</strong> ${members.length} Santri
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">No</th>
              <th style="width: 90px;">NIS</th>
              <th>Nama Santri</th>
              <th style="width: 80px; text-align: center;">No. Lemari</th>
              <th style="width: 80px; text-align: center;">Status</th>
              <th>Alamat / Asal</th>
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

  // Handle printing PDF for selected Kompleks
  const handlePrintKompleksPDF = () => {
    if (!selectedKompleks) return;
    const profile = getPesantrenProfile();
    const roomsInKom = activeRooms;

    if (roomsInKom.length === 0) {
      showToast(`Tidak ada kamar terdaftar pada ${selectedKompleks.nama}.`, 'error');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Gagal membuka jendela cetak. Pastikan pop-up dibolehkan di peramban Anda.', 'error');
      return;
    }

    const dateStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    let tablesHtml = '';
    roomsInKom.forEach(rm => {
      const members = getMembersOfRoom(rm.nama);
      const rowsHtml = members.map((s, idx) => `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td style="font-family: monospace;">${s.nis || '-'}</td>
          <td><strong>${s.nama}</strong></td>
          <td style="text-align: center; font-family: monospace;">${s.nomorLemari || '-'}</td>
          <td style="text-align: center;">${s.statusKeanggotaan || 'Muqim'}</td>
        </tr>
      `).join('');

      tablesHtml += `
        <div style="margin-top: 15px; margin-bottom: 5px; font-weight: bold; font-size: 11px; color: #7e22ce;">
          Kamar: ${rm.nama} (Ketua: ${rm.ketuaKamar || '-'} | Kapasitas: ${rm.kapasitas || 15} Bed | Total: ${members.length} Santri)
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">No</th>
              <th style="width: 100px;">NIS</th>
              <th>Nama Santri</th>
              <th style="width: 90px; text-align: center;">No. Lemari</th>
              <th style="width: 80px; text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${members.length > 0 ? rowsHtml : '<tr><td colspan="5" style="text-align: center; color: #94a3b8; font-style: italic;">Belum ada santri</td></tr>'}
          </tbody>
        </table>
      `;
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>DAFTAR KAMAR KOMPLEKS ${selectedKompleks.nama.toUpperCase()}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; margin: 0; padding: 10px; font-size: 11px; }
          .header { text-align: center; border-bottom: 2px solid #7e22ce; padding-bottom: 10px; margin-bottom: 15px; }
          .header h1 { margin: 0; font-size: 18px; color: #7e22ce; font-weight: bold; }
          .header p { margin: 3px 0 0; font-size: 11px; color: #64748b; }
          .title { text-align: center; font-size: 14px; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; color: #334155; }
          .info { margin-bottom: 12px; font-size: 11px; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
          table { width: 100%; border-collapse: collapse; margin-top: 5px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 10px; text-align: left; }
          th { background-color: #f1f5f9; font-weight: bold; color: #334155; text-transform: uppercase; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .footer { margin-top: 25px; text-align: right; font-size: 10px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${profile.namaPesantren || 'PONDOK PESANTREN'}</h1>
          <p>${profile.alamat || ''} ${(profile as any).kota ? ' - ' + (profile as any).kota : ''}</p>
        </div>
        <div class="title">DAFTAR SELURUH KAMAR — KOMPLEKS ${selectedKompleks.nama.toUpperCase()}</div>
        <div class="info">
          <strong>Gender:</strong> Santri ${selectedGender} &nbsp;|&nbsp; 
          <strong>Total Kamar:</strong> ${roomsInKom.length} Kamar
        </div>
        ${tablesHtml}
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

  const isPutra = selectedGender === 'Putra';
  const bgClass = isPutra ? 'bg-purple-600' : 'bg-rose-600';
  const textClass = isPutra ? 'text-purple-600' : 'text-rose-600';
  const borderClass = isPutra ? 'border-purple-100' : 'border-rose-100';
  const bgLightClass = isPutra ? 'bg-purple-50/50' : 'bg-rose-50/50';

  return (
    <div className="space-y-6">

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-xs font-bold text-white ${
              toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
            }`}
          >
            {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & Overview Cards (HIDDEN WHEN IN DETAIL KOMPLEKS VIEW) */}
      {!selectedKompleksId && (
        <>
          {/* Header with Title & Gender Toggle Switcher */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in">
            <div>
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl flex flex-wrap items-center gap-x-2">
                <span>Kelola Kamar</span>
                {canViewPutra && canViewPutri && (
                  <span 
                    onClick={() => {
                      setSelectedGender(selectedGender === 'Putra' ? 'Putri' : 'Putra');
                      setActiveRoomForDetail(null);
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
                )}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Kelola struktur kompleks asrama, kamar santri, kapasitas tempat tidur, dan distribusi anggota kamar.
              </p>
            </div>
          </div>

          {/* Top Level Overview Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className={`rounded-2xl border ${borderClass} ${bgLightClass} p-4.5 shadow-xs flex items-center gap-4 transition-all`}>
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${bgClass} text-white shadow-sm`}>
                <Building2 className="h-5.5 w-5.5" />
              </div>
              <div>
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">Total Kompleks ({selectedGender})</p>
                <p className="text-xl font-display font-extrabold text-slate-900 mt-1 flex items-baseline gap-1">
                  <span>{currentGenderKompleks.length}</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit</span>
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-4.5 shadow-xs flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <Home className="h-5.5 w-5.5" />
              </div>
              <div>
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">Total Kamar Aktif</p>
                <p className="text-xl font-display font-extrabold text-slate-900 mt-1 flex items-baseline gap-1">
                  <span>{activeGenderKamar.length}</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ruang</span>
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-4.5 shadow-xs flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <BedDouble className="h-5.5 w-5.5" />
              </div>
              <div>
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">Santri Ditempatkan</p>
                <p className="text-xl font-display font-extrabold text-slate-900 mt-1 flex items-baseline gap-1">
                  <span>{placedSantriCount} / {activeGenderSantri.length}</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Santri</span>
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-4.5 shadow-xs flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <UserCheck className="h-5.5 w-5.5" />
              </div>
              <div>
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">Kapasitas Lemari</p>
                <p className="text-xl font-display font-extrabold text-slate-900 mt-1 flex items-baseline gap-1">
                  <span>{overallOccupancyPercent}%</span>
                  <span className="text-xs font-medium text-slate-400">({placedSantriCount}/{totalGenderCapacity})</span>
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Content Area */}
      <AnimatePresence mode="wait">
        {!selectedKompleksId || !selectedKompleks ? (
          /* LEVEL 1 VIEW: KOMPLEKS GRID & KAMAR GRID (MEMBERI RASA UI/UX SAMA PERSIS SEPERTI LEMBAGA & KELAS PENDIDIKAN) */
          <motion.div
            key="kompleks-kamar-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {/* Section 1: Daftar Kompleks Asrama Cards */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-purple-600" />
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    Daftar Kompleks Asrama ({selectedGender})
                  </h3>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    onClick={exportRoomsToExcel}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all cursor-pointer shadow-3xs"
                    title="Ekspor Data Excel"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  {canWriteCurrent && (
                    <button
                      onClick={handleOpenAddKompleks}
                      className={`px-3.5 py-1.5 rounded-xl ${bgClass} text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:opacity-90 transition-all cursor-pointer`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Kompleks</span>
                    </button>
                  )}
                </div>
              </div>

              {currentGenderKompleks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center space-y-2">
                  <Building2 className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">Belum ada Kompleks Asrama ({selectedGender})</p>
                  <p className="text-[10px] text-slate-400">Klik tombol "Tambah Kompleks" untuk menambahkan lokasi asrama baru.</p>
                </div>
              ) : (
                /* Card Grid 2 Kolom - Gaya Lembaga/Pendidikan */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {currentGenderKompleks.map(kom => {
                    const rooms = kamarList.filter(r => r.kompleksId === kom.id);
                    const roomNames = rooms.map(r => r.nama.toLowerCase());
                    const studentsInKom = activeGenderSantri.filter(s => {
                      const kName = (s.kamar || '').trim().toLowerCase();
                      return kName && roomNames.includes(kName);
                    }).length;

                    return (
                      <div
                        key={kom.id}
                        onClick={() => {
                          setSelectedKompleksId(kom.id);
                          if (rooms.length > 0) {
                            setActiveRoomForDetail(rooms[0]);
                          } else {
                            setActiveRoomForDetail(null);
                          }
                        }}
                        className="group relative bg-white border border-slate-100 rounded-2xl cursor-pointer transition-all hover:border-slate-300 hover:shadow-md flex h-32 overflow-hidden"
                      >
                        {/* Box Kiri: Icon Kompleks */}
                        <div className="w-24 bg-slate-50 flex items-center justify-center shrink-0 border-r border-slate-100 relative overflow-hidden">
                          <div className="flex flex-col items-center justify-center p-2 text-slate-300 text-center">
                            <Building2 className={`h-8 w-8 ${isPutra ? 'text-purple-600' : 'text-rose-600'}`} />
                          </div>
                        </div>

                        {/* Box Kanan: Informasi & Stats */}
                        <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                          <div>
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="text-base font-black text-slate-800 leading-tight group-hover:text-purple-700 transition-colors truncate">
                                  {kom.nama}
                                </h3>
                                <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                                  Kompleks Asrama {selectedGender}
                                </p>
                              </div>

                              {/* Menu Tiga Titik */}
                              {canWriteCurrent && (
                                <div className="shrink-0" onClick={e => e.stopPropagation()}>
                                  <button
                                    onClick={(e) => handleOpenMenu(e, 'kompleks', kom.id, kom)}
                                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
                                    title="Menu Pilihan"
                                  >
                                    <MoreVertical className="h-4.5 w-4.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Stats Counter */}
                          <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <Home className="h-4 w-4 text-slate-400 shrink-0" />
                              <span>{rooms.length} Kamar</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Users className="h-4 w-4 text-slate-400 shrink-0" />
                              <span>{studentsInKom} Santri</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          /* LEVEL 2 VIEW: DETAIL ANGGOTA KAMAR & SANTRI TABLE (SAMAPERSIS DENGAN DETAIL KELAS DI PENDIDIKAN FORMAL) */
          <motion.div
            key="kamar-detail-students-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {/* Split View 30/70 Layout - 2 Box Red Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Panel (30% - 4 col): Daftar Kamar di Kompleks Ini */}
              <div className="lg:col-span-4 space-y-4">
                <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-xs space-y-4">
                  {/* Top Back & Header */}
                  <div className="flex items-start justify-between">
                    <button
                      onClick={() => {
                        setSelectedKompleksId(null);
                        setActiveRoomForDetail(null);
                      }}
                      className="p-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all cursor-pointer shadow-3xs"
                      title="Kembali ke Daftar Kompleks"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Center Kompleks Icon & Title */}
                  <div className="text-center space-y-2">
                    <div className={`w-14 h-14 rounded-2xl ${bgLightClass} border border-purple-100 flex items-center justify-center text-purple-600 shadow-2xs mx-auto`}>
                      <Building2 className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">
                        {selectedKompleks?.nama}
                      </h3>
                      <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mt-1">
                        {sortedRooms.length} KAMAR &bull; {getMembersOfKompleks(selectedKompleks?.id || '').length} SANTRI
                      </p>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <button
                        onClick={() => handlePrintKompleksPDF()}
                        className="p-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all cursor-pointer shadow-3xs"
                        title="Cetak PDF Kompleks"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      {canWriteCurrent && selectedKompleks && (
                        <>
                          <button
                            onClick={() => handleOpenEditKompleks(selectedKompleks)}
                            className="p-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all cursor-pointer shadow-3xs"
                            title="Edit Kompleks"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => askConfirmation(
                              'Hapus Kompleks',
                              `Apakah Anda yakin ingin menghapus kompleks "${selectedKompleks.nama}"? Seluruh kamar di dalamnya juga akan terhapus.`,
                              () => {
                                onDeleteKompleks(selectedKompleks.id);
                                setSelectedKompleksId(null);
                                setActiveRoomForDetail(null);
                              }
                            )}
                            className="p-2.5 rounded-full border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition-all cursor-pointer shadow-3xs"
                            title="Hapus Kompleks"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Divider and DAFTAR KAMAR title */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                      DAFTAR KAMAR
                    </h4>
                    {canWriteCurrent && (
                      <button
                        onClick={handleOpenAddKamar}
                        className={`p-1.5 rounded-xl ${bgClass} text-white transition-all cursor-pointer shadow-xs hover:opacity-90`}
                        title="Tambah Kamar Baru"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Search Kamar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari kamar / ketua..."
                      value={roomSearchQuery}
                      onChange={e => setRoomSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none"
                    />
                  </div>

                  {/* Kamar List Nav */}
                  <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                    {sortedRooms.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                        Belum ada kamar di {selectedKompleks?.nama}
                      </div>
                    ) : (
                      sortedRooms.map(kam => {
                        const members = getMembersOfRoom(kam.nama);
                        const capacity = kam.kapasitas || 15;
                        const occupiedLemariCount = Array.from({ length: capacity }, (_, i) => i + 1).filter(slotNum => 
                          members.some(s => parseInt(s.nomorLemari || '0', 10) === slotNum || s.nomorLemari === String(slotNum))
                        ).length;
                        const isSelected = activeRoomForDetail?.id === kam.id;

                        return (
                          <div
                            key={kam.id}
                            onClick={() => {
                              setActiveRoomForDetail(kam);
                              setCurrentPage(1);
                              setStudentSearchQuery('');
                              setSelectedStudentIds([]);
                              setIsSelectionMode(false);
                            }}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                              isSelected
                                ? `${bgClass} text-white border-transparent shadow-md`
                                : 'border-slate-100 bg-slate-50/50 hover:bg-slate-100/80 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <Folder className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-purple-600'}`} />
                              <div className="min-w-0">
                                <h4 className={`text-xs font-extrabold truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                                  {kam.nama}
                                </h4>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                              }`}>
                                {occupiedLemariCount}/{capacity}
                              </span>

                              {canWriteCurrent && (
                                <div onClick={e => e.stopPropagation()}>
                                  <button
                                    onClick={e => handleOpenMenu(e, 'kamar', kam.id, kam)}
                                    className={`p-1 rounded transition-colors cursor-pointer ${isSelected ? 'text-white/80 hover:text-white' : 'text-slate-400 hover:text-slate-700'}`}
                                    title="Opsi Kamar"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Right Panel (70% - 8 col): Detail Kamar & Table Santri */}
              <div className="lg:col-span-8 space-y-4">
                {activeRoomForDetail ? (
                  <>

            {/* Room Banner & Detail Header Card */}
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xs space-y-5">
              {/* Header Title & Icon Action Buttons Row */}
              <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-100">
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    DETAIL KAMAR
                  </h4>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mt-0.5">
                    {activeRoomForDetail.nama}
                  </h3>
                </div>

                {/* Top Right Action Buttons Group */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrintKamarPDF}
                    className="p-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs transition-all cursor-pointer"
                    title="Cetak Data Kamar"
                  >
                    <Printer className="w-4 h-4" />
                  </button>

                  {canWriteCurrent && (
                    <button
                      onClick={() => handleOpenEditKamar(activeRoomForDetail)}
                      className="p-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs transition-all cursor-pointer"
                      title="Edit Kamar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}

                  {canWriteCurrent && (
                    <button
                      onClick={() => handleOpenAddMemberModal()}
                      className="p-2.5 rounded-full border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 shadow-2xs transition-all cursor-pointer"
                      title="Tambah Anggota Santri ke Kamar"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                  )}

                  {canWriteCurrent && (
                    <button
                      onClick={() => askConfirmation(
                        'Hapus Kamar',
                        `Apakah Anda yakin ingin menghapus kamar "${activeRoomForDetail.nama}"?`,
                        () => {
                          const members = getMembersOfRoom(activeRoomForDetail.nama);
                          members.forEach(m => onUpdateSantriRoom(m.id, ''));
                          onDeleteKamar(activeRoomForDetail.id);
                          setActiveRoomForDetail(null);
                        }
                      )}
                      className="p-2.5 rounded-full border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 shadow-2xs transition-all cursor-pointer"
                      title="Hapus Kamar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Stat Cards (Ketua Kamar, Jumlah Santri, Kapasitas Lemari) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* Card 1: Ketua Kamar */}
                <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    KETUA KAMAR
                  </span>
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-purple-50 text-purple-700 shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-extrabold text-slate-800 truncate">
                      {activeRoomForDetail.ketuaKamar || 'Belum Ditentukan'}
                    </span>
                  </div>
                </div>

                {/* Card 2: Jumlah Santri */}
                <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    JUMLAH SANTRI
                  </span>
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-purple-50 text-purple-700 shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-extrabold text-slate-800 truncate">
                      {currentRoomMembers.length} Santri
                    </span>
                  </div>
                </div>

                {/* Card 3: Kapasitas Lemari */}
                {(() => {
                  const roomCapacity = activeRoomForDetail.kapasitas || 15;
                  const occupiedSlotsCount = Array.from({ length: roomCapacity }, (_, i) => i + 1).filter(slotNum => 
                    currentRoomMembers.some(s => parseInt(s.nomorLemari || '0', 10) === slotNum || s.nomorLemari === String(slotNum))
                  ).length;
                  const pct = Math.min(100, Math.round((occupiedSlotsCount / roomCapacity) * 100));

                  return (
                    <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        <span>KAPASITAS LEMARI</span>
                        <span className="text-purple-700 font-extrabold">{occupiedSlotsCount} / {roomCapacity} Lemari</span>
                      </div>
                      <div className="relative w-full bg-slate-200/80 h-6 rounded-full overflow-hidden flex items-center justify-center shadow-inner">
                        <div 
                          className="absolute left-0 top-0 bottom-0 bg-purple-600 transition-all duration-300 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                        <span className={`relative z-10 text-[11px] font-black tracking-wider ${pct > 40 ? 'text-white drop-shadow-xs' : 'text-slate-800'}`}>
                          {pct}%
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Search, Filter & Bulk Action Toolbar */}
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs space-y-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                {/* Search & Action Controls */}
                <div className="flex flex-wrap items-center gap-2 flex-1">


                  {/* Search Bar */}
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari nama, NIS, no. lemari..."
                      value={studentSearchQuery}
                      onChange={e => {
                        setStudentSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full pl-9 pr-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none"
                    />
                  </div>

                  {/* Status Filter */}
                  <select
                    value={statusFilter}
                    onChange={e => {
                      setStatusFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="py-1.5 px-2.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none cursor-pointer"
                  >
                    <option value="Semua">Semua Status</option>
                    <option value="Muqim">Muqim</option>
                    <option value="Kampung">Kampung</option>
                  </select>

                  {/* Tombol Pilih / Mode Pilih */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSelectionMode(prev => !prev);
                      if (isSelectionMode) {
                        setSelectedStudentIds([]);
                      }
                    }}
                    className={`py-1.5 px-3 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                      isSelectionMode
                        ? 'bg-purple-600 border-purple-600 text-white shadow-xs'
                        : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100'
                    }`}
                    title="Mode Pilih Banyak Anggota Kamar"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>{isSelectionMode ? 'Batal Pilih' : 'Pilih'}</span>
                  </button>
                </div>
              </div>


            </div>

            {/* DETAIL VIEW CONTENT: SLOT LEMARI VISUALIZATION */}
            {(() => {
                const roomCapacity = activeRoomForDetail.kapasitas || 15;
                const slotNumbers = Array.from({ length: roomCapacity }, (_, i) => i + 1);

                // Members who are in this room but don't have a valid locker number within capacity range
                const unassignedMembers = currentRoomMembers.filter(s => {
                  const num = parseInt(s.nomorLemari || '0', 10);
                  return isNaN(num) || num < 1 || num > roomCapacity;
                });

                return (
                  <div className="space-y-4">
                    {/* Unassigned Students Bar if any */}
                    {unassignedMembers.length > 0 && (
                      <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 text-amber-600" />
                            Belum Dapat Lemari ({unassignedMembers.length})
                          </span>
                          <div className="flex items-center gap-2">
                            {canWriteCurrent && (
                              <button
                                type="button"
                                onClick={() => handleDistributeUnassigned(unassignedMembers)}
                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-extrabold text-[11px] rounded-xl flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Distribusikan</span>
                              </button>
                            )}
                            <span className="hidden sm:inline-block text-[10px] font-bold text-amber-700 bg-amber-100/90 px-2.5 py-1 rounded-full">
                              Tarik ke slot lemari di bawah
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {unassignedMembers.map((s, idx) => (
                            <div
                              key={`unassigned-${s.id}-${idx}`}
                              draggable={canWriteCurrent}
                              onDragStart={(e) => {
                                setDraggedStudentId(s.id);
                                e.dataTransfer.setData('text/plain', s.id);
                              }}
                              onDragEnd={() => {
                                setDraggedStudentId(null);
                              }}
                              className="group relative px-3 py-1.5 bg-white border border-amber-300/80 hover:border-purple-500 rounded-xl shadow-2xs text-xs font-bold text-slate-800 flex items-center gap-2 cursor-grab active:cursor-grabbing hover:bg-purple-50 transition-all pr-8"
                            >
                              {renderSantriAvatar(s, "w-6 h-6 rounded-full border border-slate-200 text-[10px]")}
                              <span>{s.nama}</span>
                              {canWriteCurrent && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    askConfirmation(
                                      'Keluarkan Santri',
                                      `Apakah Anda yakin ingin mengeluarkan santri "${s.nama}" dari kamar ini?`,
                                      () => {
                                        onUpdateSantriRoom(s.id, '');
                                        showToast(`Santri "${s.nama}" dikeluarkan dari kamar.`);
                                      }
                                    );
                                  }}
                                  className="opacity-0 group-hover:opacity-100 absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-100 transition-all cursor-pointer"
                                  title="Keluarkan dari kamar"
                                >
                                  <X className="w-3.5 h-3.5 stroke-[2.5]" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Slot Table - Columns EXACT SAME as Tabel List */}
                    <div className="relative rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-100/80 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500 font-extrabold select-none">
                              {isSelectionMode && (
                                <th className="py-3 px-2 w-10 text-center">
                                  <input
                                    type="checkbox"
                                    checked={
                                      currentRoomMembers.length > 0 &&
                                      currentRoomMembers.every(s => selectedStudentIds.includes(s.id))
                                    }
                                    onChange={e => {
                                      if (e.target.checked) {
                                        setSelectedStudentIds(currentRoomMembers.map(s => s.id));
                                      } else {
                                        setSelectedStudentIds([]);
                                      }
                                    }}
                                    className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                                  />
                                </th>
                              )}
                              <th className="py-3 px-3.5 w-28 text-center">No. Lemari</th>
                              <th className="py-3 px-3.5 w-12 text-center">No</th>
                              <th className="py-3 px-3.5 min-w-[200px]">Nama Santri</th>
                              <th className="py-3 px-3.5 w-28">NIS</th>
                              <th className="py-3 px-3.5 w-48">Alamat</th>
                              <th className="py-3 px-3.5 w-20 text-center sticky right-0 bg-slate-100/95 backdrop-blur-xs z-10 border-l border-slate-200/60 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                                Aksi
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                            {(() => {
                              let runningSantriCount = 0;

                              return slotNumbers.map(slotNum => {
                                const slotStr = String(slotNum);
                                const occupants = currentRoomMembers.filter(s => {
                                  const num = parseInt(s.nomorLemari || '0', 10);
                                  return num === slotNum || s.nomorLemari === slotStr;
                                });

                                const isOver = dragOverSlot === slotNum;

                                // Check if dragged student is already in this locker slot
                                const draggedStudentObj = draggedStudentId ? santriList.find(s => s.id === draggedStudentId) : null;
                                const isOwnSlot = Boolean(
                                  draggedStudentObj &&
                                  (draggedStudentObj.kamar || '').trim().toLowerCase() === activeRoomForDetail.nama.trim().toLowerCase() &&
                                  (parseInt(draggedStudentObj.nomorLemari || '0', 10) === slotNum || draggedStudentObj.nomorLemari === slotStr)
                                );

                                return (
                                  <React.Fragment key={slotNum}>
                                    {occupants.length === 0 ? (
                                      /* Empty Slot Row */
                                      <tr
                                        data-slot={slotNum}
                                        onDragEnter={(e) => {
                                          e.preventDefault();
                                          e.dataTransfer.dropEffect = 'move';
                                          if (!isOwnSlot && dragOverSlot !== slotNum) {
                                            setDragOverSlot(slotNum);
                                          }
                                        }}
                                        onDragOver={(e) => {
                                          e.preventDefault();
                                          e.dataTransfer.dropEffect = 'move';
                                          if (!isOwnSlot && dragOverSlot !== slotNum) {
                                            setDragOverSlot(slotNum);
                                          }
                                        }}
                                        onDragLeave={(e) => {
                                          const related = e.relatedTarget as HTMLElement | null;
                                          if (related && (e.currentTarget.contains(related) || related.closest?.(`[data-slot="${slotNum}"]`))) {
                                            return;
                                          }
                                          if (dragOverSlot === slotNum) {
                                            setDragOverSlot(null);
                                          }
                                        }}
                                        onDrop={(e) => {
                                          e.preventDefault();
                                          if (!isOwnSlot) {
                                            handleSlotDropSwap(slotNum);
                                          }
                                        }}
                                        className={`transition-colors ${
                                          isOver && !isOwnSlot ? 'bg-emerald-100/90 ring-2 ring-emerald-500/80 z-10' : 'bg-slate-50/20 hover:bg-purple-50/30'
                                        }`}
                                      >
                                        {isSelectionMode && (
                                          <td className="py-3 px-2 text-center font-mono text-slate-300 text-[11px]">-</td>
                                        )}
                                        <td className="py-3 px-3.5 text-center">
                                          <span className="font-mono font-bold text-xs bg-slate-100 text-slate-400 px-2 py-0.5 rounded-md border border-slate-200">
                                            {String(slotNum).padStart(2, '0')}
                                          </span>
                                        </td>
                                        <td className="py-3 px-3.5 text-center font-mono text-slate-300 text-[11px]">
                                          -
                                        </td>
                                        <td className="py-3 px-3.5">
                                          {isOver && !isOwnSlot ? (
                                            <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-800 bg-emerald-100/90 px-3 py-1.5 rounded-xl border border-emerald-300 w-fit shadow-2xs">
                                              <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-600" />
                                              <span>Pindah ke sini</span>
                                            </div>
                                          ) : (
                                            <div
                                              onClick={() => !isSelectionMode && canWriteCurrent && handleOpenAddMemberModal(slotNum)}
                                              className={`flex items-center gap-2 text-xs font-medium transition-colors py-0.5 ${
                                                isSelectionMode 
                                                  ? 'text-slate-300 cursor-default' 
                                                  : 'text-slate-400 hover:text-purple-600 cursor-pointer'
                                              }`}
                                            >
                                              <span>Klik atau tarik santri ke sini</span>
                                            </div>
                                          )}
                                        </td>
                                        <td className="py-3 px-3.5 font-mono text-slate-300 text-[11px]">-</td>
                                        <td className="py-3 px-3.5 text-slate-300 text-[11px]">-</td>
                                        <td className="py-3 px-3.5 text-center sticky right-0 bg-white group-hover:bg-purple-50/20 z-10 border-l border-slate-100 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.03)] text-slate-300 text-[11px]">
                                          -
                                        </td>
                                      </tr>
                                    ) : (
                                      /* Occupant Row(s) for this Slot */
                                      occupants.map((s, idx) => {
                                        runningSantriCount++;
                                        const currentSantriNo = runningSantriCount;

                                        const isKetua = Boolean(
                                          activeRoomForDetail.ketuaKamar &&
                                          activeRoomForDetail.ketuaKamar.trim().toLowerCase() === s.nama.trim().toLowerCase()
                                        );

                                        return (
                                          <tr
                                             key={s.id}
                                             data-slot={slotNum}
                                             draggable={!isSelectionMode && canWriteCurrent}
                                             onClick={() => {
                                               if (isSelectionMode) {
                                                 if (selectedStudentIds.includes(s.id)) {
                                                   setSelectedStudentIds(prev => prev.filter(id => id !== s.id));
                                                 } else {
                                                   setSelectedStudentIds(prev => [...prev, s.id]);
                                                 }
                                               } else {
                                                 setSelectedSantriForDetail(s);
                                               }
                                             }}
                                             onDragStart={(e) => {
                                               if (isSelectionMode) return;
                                               setDraggedStudentId(s.id);
                                               e.dataTransfer.setData('text/plain', s.id);
                                               e.dataTransfer.effectAllowed = 'move';
                                             }}
                                             onDragEnd={() => {
                                               setDraggedStudentId(null);
                                               setDragOverSlot(null);
                                             }}
                                             onDragEnter={(e) => {
                                               e.preventDefault();
                                               e.dataTransfer.dropEffect = 'move';
                                               if (!isOwnSlot && dragOverSlot !== slotNum) {
                                                 setDragOverSlot(slotNum);
                                               }
                                             }}
                                             onDragOver={(e) => {
                                               e.preventDefault();
                                               e.dataTransfer.dropEffect = 'move';
                                               if (!isOwnSlot && dragOverSlot !== slotNum) {
                                                 setDragOverSlot(slotNum);
                                               }
                                             }}
                                             onDragLeave={(e) => {
                                               const related = e.relatedTarget as HTMLElement | null;
                                               if (related && (e.currentTarget.contains(related) || related.closest?.(`[data-slot="${slotNum}"]`))) {
                                                 return;
                                               }
                                               if (dragOverSlot === slotNum) {
                                                 setDragOverSlot(null);
                                               }
                                             }}
                                             onDrop={(e) => {
                                               e.preventDefault();
                                               if (!isOwnSlot) {
                                                 handleSlotDropSwap(slotNum);
                                               }
                                             }}
                                             className={`transition-colors cursor-pointer group ${
                                               isSelectionMode && selectedStudentIds.includes(s.id)
                                                 ? 'bg-purple-100/90 ring-1 ring-purple-300 shadow-2xs'
                                                 : isOver && !isOwnSlot 
                                                   ? 'bg-purple-100/95 ring-2 ring-purple-500/90 z-10' 
                                                   : isSelectionMode
                                                     ? 'bg-white'
                                                     : 'hover:bg-purple-50/60 bg-white'
                                             }`}
                                          >
                                            {isSelectionMode && (
                                              <td className="py-3 px-2 text-center" onClick={e => e.stopPropagation()}>
                                                <input
                                                  type="checkbox"
                                                  checked={selectedStudentIds.includes(s.id)}
                                                  onChange={e => {
                                                    if (e.target.checked) {
                                                      setSelectedStudentIds(prev => [...prev, s.id]);
                                                    } else {
                                                      setSelectedStudentIds(prev => prev.filter(id => id !== s.id));
                                                    }
                                                  }}
                                                  className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                                                />
                                              </td>
                                            )}
                                            {/* No. Lemari - Show badge for primary (idx 0), connect with vertical line for co-occupants (idx > 0) */}
                                            <td className="py-3 px-3.5 text-center align-middle relative overflow-visible">
                                              {idx === 0 ? (
                                                <div className="flex flex-col items-center justify-center relative">
                                                  <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md border inline-block bg-purple-50 text-purple-700 border-purple-200 shadow-2xs z-10 relative">
                                                    {String(slotNum).padStart(2, '0')}
                                                  </span>
                                                  {occupants.length > 1 && (
                                                    <div className="w-0.5 bg-purple-400 absolute left-1/2 -translate-x-1/2 top-1/2 -bottom-3.5 z-0" />
                                                  )}
                                                </div>
                                              ) : (
                                                <div className="flex justify-center items-center h-full relative">
                                                  {/* Vertical trunk line - connects seamlessly across py-3 cell boundaries */}
                                                  <div className={`w-0.5 bg-purple-400 absolute left-1/2 -translate-x-1/2 z-0 ${
                                                    idx === occupants.length - 1 ? '-top-3.5 h-[calc(50%+14px)]' : '-top-3.5 -bottom-3.5'
                                                  }`} />
                                                  {/* Horizontal branch tick pointing right */}
                                                  <div className="w-2.5 h-0.5 bg-purple-400 absolute left-1/2 top-1/2 z-0" />
                                                </div>
                                              )}
                                            </td>

                                            {/* No - Runtut per Santri */}
                                            <td className="py-3 px-3.5 text-center font-mono font-bold text-slate-600 text-[11px]">
                                              {currentSantriNo}
                                            </td>

                                            {/* Nama Santri */}
                                            <td className="py-3 px-3.5">
                                              <div className="flex items-center justify-between gap-2.5 min-w-0">
                                                <div
                                                  onClick={(e) => {
                                                     if (isSelectionMode) {
                                                       e.stopPropagation();
                                                       if (selectedStudentIds.includes(s.id)) {
                                                         setSelectedStudentIds(prev => prev.filter(id => id !== s.id));
                                                       } else {
                                                         setSelectedStudentIds(prev => [...prev, s.id]);
                                                       }
                                                     } else {
                                                       setSelectedSantriForDetail(s);
                                                     }
                                                   }}
                                                  className="flex items-center gap-2.5 cursor-pointer group min-w-0"
                                                  title={!isSelectionMode ? "Klik untuk lihat biodata" : undefined}
                                                >
                                                  {renderSantriAvatar(s, "w-8 h-8 rounded-full border border-slate-200 text-xs font-bold shrink-0")}
                                                  <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                      <p className={`font-extrabold text-slate-800 transition-colors truncate ${
                                                        !isSelectionMode ? 'group-hover:text-purple-600' : ''
                                                      }`}>
                                                        {s.nama}
                                                      </p>
                                                      {isKetua && (
                                                        <span title="Ketua Kamar" className="shrink-0">
                                                          <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                                                        </span>
                                                      )}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                      <span className="inline-block text-[9.5px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                                        {s.statusDomisili || s.status || 'Muqim'}
                                                      </span>
                                                    </div>
                                                  </div>
                                                </div>
                                                {/* Label Gabung Ke Sini inside box when dragging over occupied slot */}
                                                {isOver && !isOwnSlot && idx === 0 && (
                                                  <span className="inline-flex items-center gap-1.5 text-xs font-black bg-purple-600 text-white px-2.5 py-1 rounded-xl shadow-xs shrink-0 animate-pulse">
                                                    <UserPlus className="w-3.5 h-3.5 text-purple-200" />
                                                    <span>Gabung ke sini</span>
                                                  </span>
                                                )}
                                              </div>
                                            </td>

                                              {/* NIS */}
                                              <td className="py-3 px-3.5 font-mono text-slate-600 font-bold text-[11px]">
                                                {s.nis || '-'}
                                              </td>

                                              {/* Alamat */}
                                              <td className="py-3 px-3.5 text-slate-500 text-[11px] truncate max-w-[180px]">
                                                {s.desa ? `Ds. ${s.desa}, Kec. ${s.kecamatan || '-'}` : (s.alamat || s.asal || '-')}
                                              </td>

                                              {/* Aksi - Sticky Right */}
                                              <td className="py-3 px-3.5 text-center sticky right-0 bg-white group-hover:bg-purple-50/30 z-10 border-l border-slate-100 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.03)]">
                                                <div className="flex items-center justify-center">
                                                  {canWriteCurrent && (
                                                    <button
                                                      onClick={e => handleOpenMenu(e, 'santri', s.id, s)}
                                                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                                      title="Opsi Santri"
                                                    >
                                                      <MoreVertical className="w-4 h-4" />
                                                    </button>
                                                  )}
                                                </div>
                                              </td>
                                            </tr>
                                        );
                                      })
                                    )}

                                    {/* Expandable Bottom Border Row on Hover (ONLY for occupied slots & NOT during dragging) */}
                                    {occupants.length > 0 && !draggedStudentId && !isSelectionMode && (
                                      <tr className="group/addslot relative">
                                        <td colSpan={6} className="p-0 border-0">
                                          <div
                                            onClick={() => {
                                              if (canWriteCurrent) {
                                                handleOpenAddMemberModal(slotNum);
                                              }
                                            }}
                                            className="overflow-hidden transition-all duration-200 ease-out flex items-center justify-center gap-2 border-b cursor-pointer max-h-0 py-0 opacity-0 group-hover/addslot:max-h-12 group-hover/addslot:py-2.5 group-hover/addslot:opacity-100 bg-purple-50/90 text-purple-600 border-dashed border-purple-300 hover:bg-purple-100 text-xs font-bold"
                                          >
                                            <UserPlus className="w-3.5 h-3.5" />
                                            <span>+ Tambah Pengguna Lemari No. {String(slotNum).padStart(2, '0')}</span>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}
              </>
            ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center space-y-3">
                    <Home className="w-10 h-10 text-slate-300 mx-auto" />
                    <h3 className="text-xs font-bold text-slate-600">Pilih Kamar di Panel Kiri</h3>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                      Silakan pilih salah satu kamar di daftar sebelah kiri untuk melihat detail anggota santri, nomor lemari, dan penataan tempat tidur.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MODAL ADD / EDIT KOMPLEKS --- */}
      <AnimatePresence>
        {isKompleksModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-purple-600" />
                  {editingKompleks ? 'Edit Kompleks Asrama' : 'Tambah Kompleks Asrama Baru'}
                </h3>
                <button onClick={() => setIsKompleksModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveKompleks} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Nama Kompleks</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Kompleks Sunan Ampel"
                    value={komNama}
                    onChange={e => setKomNama(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsKompleksModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 text-xs font-bold text-white rounded-xl ${bgClass} shadow-sm hover:opacity-90`}
                  >
                    Simpan Kompleks
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL ADD / EDIT KAMAR --- */}
      <AnimatePresence>
        {isKamarModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                  <Home className="w-4 h-4 text-purple-600" />
                  {editingKamar ? 'Edit Kamar' : 'Tambah Kamar Baru'}
                </h3>
                <button onClick={() => setIsKamarModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveKamar} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Nama Kamar</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Kamar A1 - Abu Bakar"
                    value={kamNama}
                    onChange={e => setKamNama(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Kapasitas Lemari</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={kamKapasitas}
                    onChange={e => setKamKapasitas(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsKamarModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 text-xs font-bold text-white rounded-xl ${bgClass} shadow-sm hover:opacity-90`}
                  >
                    Simpan Kamar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL ADD SANTRI TO ROOM --- */}
      <AnimatePresence>
        {isAddMemberModalOpen && activeRoomForDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[85vh] max-h-[680px] min-h-[480px]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0 bg-white">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      {targetSlotForAdd ? `Tambah Pengguna Lemari No. ${String(targetSlotForAdd).padStart(2, '0')}` : 'Tambah Anggota Kamar'}
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                      {selectedKompleks?.nama?.toLowerCase()} &bull; {activeRoomForDetail.nama?.toLowerCase()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddMemberModalOpen(false)}
                  className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body - 2 Columns */}
              {(() => {
                const unselectedEligibleStudents = eligibleStudentsForAdd.filter(s => !selectedModalStudentIds.includes(s.id));
                const selectedStudentsForModal = santriList.filter(s => selectedModalStudentIds.includes(s.id));

                // Covered rooms by current gender kompleks
                const coveredRoomNames = new Set(
                  currentGenderKompleks.flatMap(kom => kamarList.filter(r => r.kompleksId === kom.id).map(r => r.nama.trim().toLowerCase()))
                );
                const extraRooms = Array.from(new Set(
                  santriList
                    .filter(s => s.gender === selectedGender && s.kamar && s.kamar.trim() && s.kamar.trim().toLowerCase() !== 'tanpa kamar' && s.kamar.trim().toLowerCase() !== 'belum kamar')
                    .map(s => s.kamar.trim())
                    .filter(kName => !coveredRoomNames.has(kName.toLowerCase()))
                )).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

                // Group unselected eligible students by room
                const groupedByRoom = unselectedEligibleStudents.reduce((acc, s) => {
                  const kamarNorm = (s.kamar || '').trim().toLowerCase();
                  const isBelumKamar = !kamarNorm || kamarNorm === 'tanpa kamar' || kamarNorm === 'belum kamar';
                  const rawKamar = (s.kamar || '').trim();
                  const roomKey = isBelumKamar
                    ? 'Belum Memiliki Kamar'
                    : (rawKamar.toLowerCase().startsWith('kamar') ? rawKamar : `Kamar ${rawKamar}`);

                  if (!acc[roomKey]) acc[roomKey] = [];
                  acc[roomKey].push(s);
                  return acc;
                }, {} as Record<string, typeof unselectedEligibleStudents>);

                const sortedRoomKeys = Object.keys(groupedByRoom).sort((a, b) => {
                  if (a === 'Belum Memiliki Kamar') return -1;
                  if (b === 'Belum Memiliki Kamar') return 1;
                  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
                });

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 flex-1 min-h-0 overflow-hidden">
                    {/* Left Column: Santri Tersedia */}
                    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-white">
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                        <span className="text-xs font-extrabold text-slate-800">Santri Tersedia</span>
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                          {unselectedEligibleStudents.length}
                        </span>
                      </div>

                      {/* Filter Bar */}
                      <div className="p-3 bg-slate-50/80 border-b border-slate-100 space-y-2 shrink-0">
                        {/* Search Input with Clear Button */}
                        <div className="relative w-full">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Cari nama, NIS, kamar, lemari..."
                            value={addMemberSearch}
                            onChange={e => setAddMemberSearch(e.target.value)}
                            className="w-full pl-8 pr-8 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none shadow-3xs"
                          />
                          {addMemberSearch && (
                            <button
                              type="button"
                              onClick={() => setAddMemberSearch('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Dropdown Filters: Filter Kamar (Grouped by Kompleks) & Status Lemari */}
                        <div className="grid grid-cols-2 gap-2">
                          {/* Filter Kamar */}
                          <select
                            value={addMemberSpecificRoomFilter}
                            onChange={e => setAddMemberSpecificRoomFilter(e.target.value)}
                            className="py-1.5 px-2.5 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 outline-none cursor-pointer w-full"
                          >
                            <option value="Semua">Semua Kamar</option>
                            <option value="BelumKamar">Belum Memiliki Kamar</option>
                            {currentGenderKompleks.map(kom => {
                              const roomsInKom = kamarList.filter(r => r.kompleksId === kom.id);
                              if (roomsInKom.length === 0) return null;
                              return (
                                <optgroup key={kom.id} label={`Kompleks ${kom.nama}`}>
                                  {roomsInKom.map(r => (
                                    <option key={r.id} value={r.nama}>
                                      {r.nama.toLowerCase().startsWith('kamar') ? r.nama : `Kamar ${r.nama}`}
                                    </option>
                                  ))}
                                </optgroup>
                              );
                            })}
                            {extraRooms.length > 0 && (
                              <optgroup label="Kamar Lainnya">
                                {extraRooms.map(r => (
                                  <option key={r} value={r}>
                                    {r.toLowerCase().startsWith('kamar') ? r : `Kamar ${r}`}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                          </select>

                          {/* Filter Status Lemari */}
                          <select
                            value={addMemberLemariFilter}
                            onChange={e => setAddMemberLemariFilter(e.target.value)}
                            className="py-1.5 px-2.5 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 outline-none cursor-pointer w-full"
                          >
                            <option value="Semua">Semua Lemari</option>
                            <option value="SudahLemari">Sudah Dapat Lemari</option>
                            <option value="BelumLemari">Belum Dapat Lemari</option>
                          </select>
                        </div>
                      </div>

                      {/* Available List Grouped By Room */}
                      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
                        {unselectedEligibleStudents.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center p-8 text-center min-h-[220px]">
                            <User className="w-10 h-10 text-slate-300 stroke-1 mb-2" />
                            <p className="text-xs font-bold text-slate-400">Tidak ada santri tersedia</p>
                          </div>
                        ) : (
                          sortedRoomKeys.map(roomKey => {
                            const isCollapsed = collapsedRoomKeys.includes(roomKey);

                            return (
                              <div key={roomKey} className="space-y-1.5">
                                {/* Group Header with Minimize Toggle */}
                                <div
                                  onClick={() => {
                                    setCollapsedRoomKeys(prev =>
                                      prev.includes(roomKey)
                                        ? prev.filter(k => k !== roomKey)
                                        : [...prev, roomKey]
                                    );
                                  }}
                                  className="sticky top-0 z-30 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1 rounded-lg border border-slate-200/80 flex items-center justify-between text-[11px] font-extrabold text-slate-700 shadow-3xs cursor-pointer transition-colors select-none"
                                >
                                  <span className="flex items-center gap-1.5">
                                    {isCollapsed ? (
                                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                                    ) : (
                                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                                    )}
                                    <DoorClosed className="w-3.5 h-3.5 text-purple-600" />
                                    {roomKey}
                                  </span>
                                  <span className="text-[10px] font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                                    {groupedByRoom[roomKey].length} santri
                                  </span>
                                </div>

                                {/* Student Cards in Group */}
                                {!isCollapsed && (
                                  <div className="space-y-1.5 pt-0.5">
                                    {groupedByRoom[roomKey].map(s => {
                                      const kamarNorm = (s.kamar || '').trim().toLowerCase();
                                      const isBelumKamar = !kamarNorm || kamarNorm === 'tanpa kamar' || kamarNorm === 'belum kamar';
                                      const slotNum = parseInt(s.nomorLemari || '0', 10);
                                      const isBelumLemari = !s.nomorLemari || isNaN(slotNum) || slotNum <= 0;

                                      const nisStr = s.nis ? s.nis.trim() : '';
                                      const rawKamar = (s.kamar || '').trim();
                                      const roomNameFormatted = rawKamar.toLowerCase().startsWith('kamar') ? rawKamar : `Kamar ${rawKamar}`;
                                      const roomText = isBelumKamar
                                        ? 'Belum dapat kamar'
                                        : `${roomNameFormatted} (${isBelumLemari ? 'Belum dapat lemari' : String(slotNum).padStart(2, '0')})`;

                                      const subtitleText = nisStr ? `${nisStr} &bull; ${roomText}` : roomText;

                                      return (
                                        <div
                                          key={s.id}
                                          onClick={() => setSelectedModalStudentIds([...selectedModalStudentIds, s.id])}
                                          className="p-2.5 rounded-xl border border-slate-100 bg-white hover:bg-emerald-50/40 hover:border-emerald-200 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-3xs group"
                                        >
                                          <div className="flex items-center gap-3 min-w-0">
                                            {renderSantriAvatar(s, "w-8 h-8 rounded-full border border-slate-200 text-xs font-bold shrink-0")}
                                            <div className="min-w-0">
                                              <div className="flex items-center">
                                                <span
                                                  className="text-xs font-extrabold text-slate-800 truncate cursor-pointer hover:text-purple-700 hover:underline inline-block w-fit max-w-full"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedSantriForDetail(s);
                                                  }}
                                                  title="Klik untuk melihat detail santri"
                                                >
                                                  {s.nama}
                                                </span>
                                              </div>
                                              <p className="text-[10px] text-slate-500 truncate" dangerouslySetInnerHTML={{ __html: subtitleText }} />
                                            </div>
                                          </div>
                                          <button className="p-1 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0 cursor-pointer">
                                            <Plus className="w-4 h-4" />
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Right Column: Santri Dipilih */}
                    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-slate-50/30">
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                        <span className="text-xs font-extrabold text-slate-800">Santri Dipilih</span>
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                          {selectedStudentsForModal.length}
                        </span>
                      </div>

                      {/* Selected List */}
                      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
                        {selectedStudentsForModal.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center p-8 text-center min-h-[260px]">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-2 border border-slate-200/80">
                              <Check className="w-5 h-5 text-slate-300 stroke-[2.5]" />
                            </div>
                            <p className="text-xs font-bold text-slate-400">Belum ada santri dipilih</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Klik santri di sebelah kiri untuk menambahkan
                            </p>
                          </div>
                        ) : (
                          selectedStudentsForModal.map(s => {
                            const kamarNorm = (s.kamar || '').trim().toLowerCase();
                            const isBelumKamar = !kamarNorm || kamarNorm === 'tanpa kamar' || kamarNorm === 'belum kamar';
                            const slotNum = parseInt(s.nomorLemari || '0', 10);
                            const isBelumLemari = !s.nomorLemari || isNaN(slotNum) || slotNum <= 0;

                            const nisStr = s.nis ? s.nis.trim() : '';
                            const rawKamar = (s.kamar || '').trim();
                            const roomNameFormatted = rawKamar.toLowerCase().startsWith('kamar') ? rawKamar : `Kamar ${rawKamar}`;
                            const roomText = isBelumKamar
                              ? 'Belum dapat kamar'
                              : `${roomNameFormatted} (${isBelumLemari ? 'Belum dapat lemari' : String(slotNum).padStart(2, '0')})`;

                            const subtitleText = nisStr ? `${nisStr} &bull; ${roomText}` : roomText;

                            return (
                              <div
                                key={s.id}
                                className="p-2.5 rounded-xl border border-emerald-100 bg-emerald-50/40 flex items-center justify-between gap-3 shadow-3xs"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  {renderSantriAvatar(s, "w-8 h-8 rounded-full border border-emerald-200 text-xs font-bold shrink-0")}
                                  <div className="min-w-0">
                                    <p className="text-xs font-extrabold text-slate-900 truncate">{s.nama}</p>
                                    <p className="text-[10px] text-slate-500 truncate" dangerouslySetInnerHTML={{ __html: subtitleText }} />
                                  </div>
                                </div>
                              <button
                                onClick={() => setSelectedModalStudentIds(selectedModalStudentIds.filter(id => id !== s.id))}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                                title="Batalkan pilihan"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Modal Footer */}
              <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-white shrink-0">
                <span className="text-xs font-medium text-slate-400">
                  Pilih santri dari daftar di sebelah kiri
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAddMemberModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    disabled={selectedModalStudentIds.length === 0}
                    onClick={handleConfirmAddMembers}
                    className="px-5 py-2.5 rounded-full text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-40 shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4 stroke-[3px]" />
                    <span>Tambahkan ({selectedModalStudentIds.length})</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL BULK TRANSFER / SINGLE TRANSFER KAMAR --- */}
      <AnimatePresence>
        {(isBulkTransferOpen || singleTransferStudent) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-purple-600" />
                  {singleTransferStudent ? `Pindahkan Santri` : `Pindahkan ${selectedStudentIds.length} Santri`}
                </h3>
                <button 
                  onClick={() => {
                    setIsBulkTransferOpen(false);
                    setSingleTransferStudent(null);
                  }} 
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {singleTransferStudent && (
                <div className="p-3 bg-purple-50/60 border border-purple-100/80 rounded-2xl flex items-center gap-3">
                  {renderSantriAvatar(singleTransferStudent, "w-10 h-10 rounded-full border border-purple-200 text-xs font-bold shrink-0", false, true)}
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-slate-800 truncate">{singleTransferStudent.nama}</p>
                    <p className="text-[10px] text-slate-500 font-semibold truncate">
                      Kamar: <span className="font-bold text-purple-700">{singleTransferStudent.kamar || activeRoomForDetail?.nama || 'Belum Ada'}</span>
                      {singleTransferStudent.nomorLemari ? ` &bull; Lemari ${String(singleTransferStudent.nomorLemari).padStart(2, '0')}` : ''}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Pilih Kompleks Tujuan</label>
                  <select
                    value={singleTransferStudent ? singleDestKompleksId : bulkDestKompleksId}
                    onChange={e => {
                      if (singleTransferStudent) {
                        setSingleDestKompleksId(e.target.value);
                        setSingleDestRoomId('');
                      } else {
                        setBulkDestKompleksId(e.target.value);
                        setBulkDestRoomId('');
                      }
                    }}
                    className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500/20"
                  >
                    <option value="">-- Pilih Kompleks --</option>
                    {currentGenderKompleks.map(k => (
                      <option key={k.id} value={k.id}>{k.nama}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Pilih Kamar Tujuan</label>
                  <select
                    disabled={!(singleTransferStudent ? singleDestKompleksId : bulkDestKompleksId)}
                    value={singleTransferStudent ? singleDestRoomId : bulkDestRoomId}
                    onChange={e => {
                      if (singleTransferStudent) setSingleDestRoomId(e.target.value);
                      else setBulkDestRoomId(e.target.value);
                    }}
                    className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500/20 disabled:bg-slate-50 disabled:cursor-not-allowed"
                  >
                    <option value="">-- Pilih Kamar --</option>
                    {kamarList
                      .filter(r => r.kompleksId === (singleTransferStudent ? singleDestKompleksId : bulkDestKompleksId))
                      .map(r => {
                        const count = getMembersOfRoom(r.nama).length;
                        const cap = r.kapasitas || 15;
                        return (
                          <option key={r.id} value={r.id}>
                            {r.nama} ({count}/{cap})
                          </option>
                        );
                      })}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Nomor Lemari (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Contoh: 05"
                    value={singleTransferStudent ? singleNomorLemari : bulkNomorLemari}
                    onChange={e => {
                      if (singleTransferStudent) setSingleNomorLemari(e.target.value);
                      else setBulkNomorLemari(e.target.value);
                    }}
                    className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsBulkTransferOpen(false);
                    setSingleTransferStudent(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  disabled={!(singleTransferStudent ? singleDestRoomId : bulkDestRoomId)}
                  onClick={() => {
                    if (singleTransferStudent) {
                      const destRoom = kamarList.find(r => r.id === singleDestRoomId);
                      if (destRoom) {
                        onUpdateSantriRoom(singleTransferStudent.id, destRoom.nama, singleNomorLemari.trim());
                        showToast(`Santri "${singleTransferStudent.nama}" dipindahkan ke ${destRoom.nama}.`);
                        setSingleTransferStudent(null);
                      }
                    } else {
                      handleConfirmBulkTransfer();
                    }
                  }}
                  className={`px-4 py-2 text-xs font-bold text-white rounded-xl ${bgClass} shadow-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  Konfirmasi Pindah
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL PINDAH LEMARI --- */}
      <AnimatePresence>
        {editingLemariStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  {renderSantriAvatar(editingLemariStudent, "w-10 h-10 rounded-full border border-purple-200 text-xs font-bold shrink-0", false, true)}
                  <div className="min-w-0">
                    <h3 className="text-sm font-extrabold text-slate-800 truncate">
                      {editingLemariStudent.nama}
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-500 truncate">
                      Pindah Lemari &bull; {editingLemariStudent.kamar || activeRoomForDetail?.nama || '-'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setEditingLemariStudent(null)} 
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {(() => {
                const targetRoomObj = activeRoomForDetail || kamarList.find(r => r.nama === editingLemariStudent.kamar);
                const capacity = targetRoomObj?.kapasitas || activeRoomForDetail?.kapasitas || 15;
                const membersInRoom = targetRoomObj ? getMembersOfRoom(targetRoomObj.nama) : currentRoomMembers;

                return (
                  <div className="space-y-3.5">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-500">Lemari Saat Ini:</span>
                        <span className="font-extrabold text-purple-700 bg-purple-50 border border-purple-100 px-2.5 py-0.5 rounded-lg text-[11px]">
                          {editingLemariStudent.nomorLemari && parseInt(editingLemariStudent.nomorLemari, 10) > 0
                            ? `Lemari ${String(editingLemariStudent.nomorLemari).padStart(2, '0')}`
                            : 'Belum Dapat Lemari'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                        Pilih Lemari Tujuan
                      </label>
                      <select
                        value={tempLemariValue}
                        onChange={e => setTempLemariValue(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500/20 bg-white"
                      >
                        <option value="">-- Belum Dapat Lemari (Kosongkan) --</option>
                        {Array.from({ length: capacity }, (_, i) => i + 1).map(slotNum => {
                          const slotStr = String(slotNum);
                          const occupants = membersInRoom.filter(s => {
                            const num = parseInt(s.nomorLemari || '0', 10);
                            return num === slotNum || s.nomorLemari === slotStr;
                          });

                          let occupantText = 'Kosong';
                          if (occupants.length > 0) {
                            occupantText = occupants.map(s => {
                              if (s.id === editingLemariStudent.id) return `${s.nama} (Saat Ini)`;
                              return s.nama;
                            }).join(', ');
                          }

                          return (
                            <option key={slotNum} value={slotStr}>
                              Lemari {String(slotNum).padStart(2, '0')} — ({occupantText})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingLemariStudent(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const roomName = editingLemariStudent.kamar || activeRoomForDetail?.nama || '';
                    onUpdateSantriRoom(editingLemariStudent.id, roomName, tempLemariValue.trim());
                    if (tempLemariValue.trim()) {
                      showToast(`Lemari "${editingLemariStudent.nama}" berhasil diubah ke No. ${String(tempLemariValue.trim()).padStart(2, '0')}.`);
                    } else {
                      showToast(`Santri "${editingLemariStudent.nama}" diset belum mendapat lemari.`);
                    }
                    setEditingLemariStudent(null);
                  }}
                  className={`px-4 py-2 text-xs font-bold text-white rounded-xl ${bgClass} shadow-xs hover:opacity-90 cursor-pointer transition-all`}
                >
                  Simpan Perubahan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- SANTRI DETAIL MODAL --- */}
      {selectedSantriForDetail && (
        <SantriDetailModal
          selectedSantri={selectedSantriForDetail}
          onClose={() => setSelectedSantriForDetail(null)}
        />
      )}

      {/* --- FLOATING TOP-LAYER ACTION DROPDOWN MENU --- */}
      <AnimatePresence>
        {menuDropdown && (
          <>
            <div
              className="fixed inset-0 z-40 bg-transparent"
              onClick={() => setMenuDropdown(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.1 }}
              style={{ top: menuDropdown.top, right: menuDropdown.right }}
              className="fixed w-36 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 text-xs font-bold text-slate-700"
              onClick={e => e.stopPropagation()}
            >
              {menuDropdown.type === 'kompleks' && (
                <>
                  <button
                    onClick={() => {
                      const kom = menuDropdown.data as Kompleks;
                      setMenuDropdown(null);
                      handleOpenEditKompleks(kom);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      const kom = menuDropdown.data as Kompleks;
                      setMenuDropdown(null);
                      askConfirmation(
                        'Hapus Kompleks',
                        `Apakah Anda yakin ingin menghapus kompleks "${kom.nama}"? Seluruh kamar di dalamnya juga akan terhapus.`,
                        () => onDeleteKompleks(kom.id)
                      );
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer border-t border-slate-100"
                  >
                    Hapus
                  </button>
                </>
              )}

              {menuDropdown.type === 'kamar' && (
                <>
                  <button
                    onClick={() => {
                      const kam = menuDropdown.data as Kamar;
                      setMenuDropdown(null);
                      handleOpenEditKamar(kam);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      const kam = menuDropdown.data as Kamar;
                      setMenuDropdown(null);
                      askConfirmation(
                        'Hapus Kamar',
                        `Apakah Anda yakin ingin menghapus kamar "${kam.nama}"?`,
                        () => {
                          const members = getMembersOfRoom(kam.nama);
                          members.forEach(m => onUpdateSantriRoom(m.id, ''));
                          onDeleteKamar(kam.id);
                          if (activeRoomForDetail?.id === kam.id) {
                            setActiveRoomForDetail(null);
                          }
                        }
                      );
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer border-t border-slate-100"
                  >
                    Hapus
                  </button>
                </>
              )}

              {menuDropdown.type === 'santri' && (() => {
                const s = menuDropdown.data as Santri;
                const isKetua = Boolean(
                  activeRoomForDetail?.ketuaKamar &&
                  activeRoomForDetail.ketuaKamar.trim().toLowerCase() === s.nama.trim().toLowerCase()
                );

                return (
                  <>
                    <button
                      onClick={() => {
                        setMenuDropdown(null);
                        if (isKetua) {
                          askConfirmation(
                            'Copot Ketua Kamar',
                            `Apakah Anda yakin ingin mencopot "${s.nama}" dari Ketua Kamar?`,
                            () => {
                              if (activeRoomForDetail) {
                                const updated = { ...activeRoomForDetail, ketuaKamar: '' };
                                onUpdateKamar(updated);
                                setActiveRoomForDetail(updated);
                                showToast(`Santri "${s.nama}" berhasil dicopot dari Ketua Kamar.`);
                              }
                            },
                            'Ya, Copot Ketua',
                            true
                          );
                        } else {
                          askConfirmation(
                            'Jadikan Ketua Kamar',
                            `Apakah Anda yakin ingin menjadikan "${s.nama}" sebagai ketua kamar ini?`,
                            () => {
                              if (activeRoomForDetail) {
                                const updated = { ...activeRoomForDetail, ketuaKamar: s.nama };
                                onUpdateKamar(updated);
                                setActiveRoomForDetail(updated);
                                showToast(`Santri "${s.nama}" berhasil dijadikan Ketua Kamar.`);
                              }
                            },
                            'Ya, Jadikan Ketua',
                            false
                          );
                        }
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-100 text-slate-800 font-medium transition-colors cursor-pointer"
                    >
                      {isKetua ? 'Copot Ketua' : 'Jadikan Ketua'}
                    </button>
                    <button
                      onClick={() => {
                        setMenuDropdown(null);
                        setSingleTransferStudent(s);
                        setSingleDestKompleksId(selectedKompleksId || '');
                        setSingleDestRoomId(activeRoomForDetail?.id || '');
                        setSingleNomorLemari(s.nomorLemari || '');
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-100 text-slate-800 font-medium transition-colors cursor-pointer"
                    >
                      Pindah Kamar
                    </button>
                    <button
                      onClick={() => {
                        setMenuDropdown(null);
                        setEditingLemariStudent(s);
                        setTempLemariValue(s.nomorLemari || '');
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-100 text-slate-800 font-medium transition-colors cursor-pointer"
                    >
                      Pindah Lemari
                    </button>
                    <button
                      onClick={() => {
                        setMenuDropdown(null);
                        askConfirmation(
                          'Hapus Lemari Santri',
                          `Apakah Anda yakin ingin menghapus nomor lemari dari "${s.nama}"?`,
                          () => {
                            if (activeRoomForDetail) {
                              onUpdateSantriRoom(s.id, activeRoomForDetail.nama, '');
                              showToast(`Nomor lemari "${s.nama}" berhasil dihapus.`);
                            }
                          }
                        );
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-100 text-slate-800 font-medium transition-colors cursor-pointer"
                    >
                      Hapus Lemari
                    </button>
                    <button
                      onClick={() => {
                        setMenuDropdown(null);
                        const slotNum = parseInt(s.nomorLemari || '0', 10);
                        handleOpenAddMemberModal(slotNum > 0 ? slotNum : undefined);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-100 text-slate-800 font-medium transition-colors cursor-pointer"
                    >
                      Tambah Pengguna
                    </button>
                    <button
                      onClick={() => {
                        setMenuDropdown(null);
                        askConfirmation(
                          'Keluarkan Santri',
                          `Apakah Anda yakin ingin mengeluarkan santri "${s.nama}" dari kamar ini?`,
                          () => {
                            onUpdateSantriRoom(s.id, '');
                            showToast(`Santri "${s.nama}" dikeluarkan dari kamar.`);
                          }
                        );
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer border-t border-slate-100"
                    >
                      Keluarkan
                    </button>
                  </>
                );
              })()}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- CONFIRMATION DIALOG --- */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl space-y-4 text-center"
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${
                confirmModal.isDanger !== false
                  ? 'bg-rose-100 text-rose-600'
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
                {confirmModal.isDanger !== false ? (
                  <ShieldAlert className="w-6 h-6" />
                ) : (
                  <CheckCircle2 className="w-6 h-6" />
                )}
              </div>

              <div>
                <h3 className="text-sm font-extrabold text-slate-800">{confirmModal.title}</h3>
                <p className="text-xs text-slate-500 mt-1">{confirmModal.message}</p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  }}
                  className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-sm cursor-pointer ${
                    confirmModal.isDanger !== false
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {confirmModal.confirmText || 'Konfirmasi'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Minimalist Batch Action Bar */}
      <AnimatePresence>
        {(isSelectionMode || selectedStudentIds.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 shadow-2xl rounded-2xl px-4 py-2.5 text-xs font-sans max-w-[92vw] sm:max-w-max"
          >
            {/* Left side: Count selected */}
            <div className="flex items-center gap-2 border-r border-slate-700 pr-3">
              <div className="h-5 w-5 rounded-full bg-purple-500 text-white font-black text-[10px] flex items-center justify-center shrink-0">
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
                }}
                disabled={selectedStudentIds.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer border-none"
                title="Pindah Kamar Masal"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                <span>Pindah Kamar</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (selectedStudentIds.length === 0) {
                    showToast('Pilih setidaknya satu santri terlebih dahulu.');
                    return;
                  }
                  askConfirmation(
                    'Hapus Lemari Santri Terpilih',
                    `Apakah Anda yakin ingin menghapus nomor lemari dari ${selectedStudentIds.length} santri yang dipilih?`,
                    () => {
                      selectedStudentIds.forEach(id => {
                        onUpdateSantriRoom(id, activeRoomForDetail?.nama || '', '');
                      });
                      setSelectedStudentIds([]);
                      showToast(`Nomor lemari ${selectedStudentIds.length} santri berhasil dihapus.`);
                    }
                  );
                }}
                disabled={selectedStudentIds.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer border-none"
                title="Hapus Lemari Masal"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Hapus Lemari</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (selectedStudentIds.length === 0) {
                    showToast('Pilih setidaknya satu santri terlebih dahulu.');
                    return;
                  }
                  askConfirmation(
                    'Keluarkan Santri Terpilih',
                    `Apakah Anda yakin ingin mengeluarkan ${selectedStudentIds.length} santri dari kamar ini?`,
                    () => {
                      selectedStudentIds.forEach(id => onUpdateSantriRoom(id, ''));
                      setSelectedStudentIds([]);
                      setIsSelectionMode(false);
                      showToast(`${selectedStudentIds.length} santri dikeluarkan dari kamar.`);
                    }
                  );
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
