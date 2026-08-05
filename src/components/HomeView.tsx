import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Plus, 
  Trash2, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  ArrowUpRight, 
  ArrowRight,
  X,
  Smartphone,
  Download,
  AlertTriangle,
  CheckCircle2,
  ListTodo,
  Clock,
  Calendar,
  Timer,
  AlertCircle,
  Info
} from 'lucide-react';
import { Santri, KeamananRecord, BendaharaRecord, Kompleks, Kamar } from '../types';
import { INITIAL_KOMPLEKS, INITIAL_KAMAR } from './HumasyView';
import { fetchTableData, insertTableRow, updateTableRow, deleteTableRow, subscribeRealtimeChanges } from '../lib/api';
import SantriDetailModal from './sekretaris/SantriDetailModal';

interface HomeViewProps {
  santriList: Santri[];
  keamananList: KeamananRecord[];
  bendaharaList: BendaharaRecord[];
  onChangeModule: (mod: string, subTab?: string) => void;
  onResetAllLocalData?: () => void;
}

interface TaskItem {
  id: string;
  text: string;
  description?: string;
  status: 'done' | 'pending';
  deadlineTimestamp?: number;
  color: 'green' | 'yellow' | 'blue';
  createdAt: number;
  username?: string;
}

export default function HomeView({ 
  santriList, 
  keamananList, 
  bendaharaList, 
  onChangeModule,
  onResetAllLocalData
}: HomeViewProps) {
  // PWA banner state
  const [showPwaBanner, setShowPwaBanner] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem('smartsantri_pwa_dismissed') === 'true';
  });

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Live seconds ticker for deadlines
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Normalize task item
  const normalizeTask = (item: any): TaskItem => ({
    id: String(item.id || Date.now()),
    text: item.text || item.judul || item.title || 'Tugas Tanpa Judul',
    description: item.description || item.deskripsi || '',
    status: item.status === 'done' || item.status === 'Selesai' ? 'done' : 'pending',
    deadlineTimestamp: Number(item.deadlineTimestamp || item.deadline_timestamp || item.due_date) || (Date.now() + 3600000),
    color: (item.color === 'green' || item.color === 'yellow' || item.color === 'blue') ? item.color : 'yellow',
    createdAt: Number(item.createdAt || item.created_at) || Date.now(),
    username: (item.username || item.user_id || '').toLowerCase().trim()
  });

  // Task list state - Initialized from localStorage, then fetched from database
  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    try {
      const local = localStorage.getItem('smartsantri_dashboard_tasks');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) return parsed.map(normalizeTask);
      }
    } catch (e) {
      console.error(e);
    }
    return []; // Empty by default
  });

  // Task modal states
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<TaskItem | null>(null);
  const [selectedSantriForDetail, setSelectedSantriForDetail] = useState<Santri | null>(null);

  // Tab for Top 10 Card (Pelanggaran vs Pelanggar)
  const [violationsTab, setViolationsTab] = useState<'pelanggaran' | 'pelanggar'>('pelanggaran');

  // Add task form states
  const [taskFormText, setTaskFormText] = useState('');
  const [taskFormDesc, setTaskFormDesc] = useState('');
  const [taskFormColor, setTaskFormColor] = useState<'green' | 'yellow' | 'blue'>('yellow');
  const [taskFormDays, setTaskFormDays] = useState<number>(0);
  const [taskFormHours, setTaskFormHours] = useState<number>(1);
  const [taskFormMinutes, setTaskFormMinutes] = useState<number>(0);
  const [taskFormSeconds, setTaskFormSeconds] = useState<number>(0);

  // Kompleks and Kamar state for capacity calculations
  const [kompleksList, setKompleksList] = useState<Kompleks[]>([]);
  const [kamarList, setKamarList] = useState<Kamar[]>([]);

  useEffect(() => {
    let isMounted = true;
    const loadKamarData = async () => {
      try {
        const kData = await fetchTableData<Kompleks>('kompleks', 'smartsantri_kompleks', INITIAL_KOMPLEKS);
        const rmData = await fetchTableData<Kamar>('kamar', 'smartsantri_kamar', INITIAL_KAMAR);
        if (isMounted) {
          setKompleksList(kData || []);
          setKamarList(rmData || []);
        }
      } catch (e) {
        console.error("Gagal memuat data kamar untuk dashboard:", e);
      }
    };

    loadKamarData();

    const unsubscribeWs = subscribeRealtimeChanges((payload: any) => {
      if (!payload.table || payload.table === 'kompleks' || payload.table === 'kamar' || payload.action === 'truncate_all') {
        loadKamarData();
      }
    });

    return () => {
      isMounted = false;
      unsubscribeWs();
    };
  }, []);

  // Fetch tasks from database and subscribe to real-time updates across devices
  useEffect(() => {
    let isMounted = true;
    const loadTasksFromDb = async () => {
      try {
        const data = await fetchTableData<any>('tugas', 'smartsantri_dashboard_tasks', []);
        if (isMounted && Array.isArray(data)) {
          const normalized = data.map(normalizeTask);
          setTasks(normalized);
        }
      } catch (err) {
        console.error("Gagal sinkronisasi tugas dari database:", err);
      }
    };

    loadTasksFromDb();

    const unsubscribeWs = subscribeRealtimeChanges((payload: any) => {
      if (!payload.table || payload.table === 'tugas' || payload.table === 'tasks' || payload.action === 'truncate_all') {
        loadTasksFromDb();
      }
    });

    return () => {
      isMounted = false;
      unsubscribeWs();
    };
  }, []);

  // Save tasks to localStorage cache
  useEffect(() => {
    try {
      localStorage.setItem('smartsantri_dashboard_tasks', JSON.stringify(tasks));
    } catch (e) {}
  }, [tasks]);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    if (isStandalone || isDismissed) return;

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    if (isIosDevice) {
      setShowPwaBanner(true);
    }

    if ((window as any).deferredPrompt) {
      setInstallPrompt((window as any).deferredPrompt);
      setShowPwaBanner(true);
    }

    const handleInstallable = () => {
      setInstallPrompt((window as any).deferredPrompt);
      setShowPwaBanner(true);
    };

    const handleInstalled = () => {
      setShowPwaBanner(false);
    };

    window.addEventListener('pwa-installable', handleInstallable);
    window.addEventListener('pwa-installed', handleInstalled);
    return () => {
      window.removeEventListener('pwa-installable', handleInstallable);
      window.removeEventListener('pwa-installed', handleInstalled);
    };
  }, [isDismissed]);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    console.log(`User installation decision: ${outcome}`);
    (window as any).deferredPrompt = null;
    setInstallPrompt(null);
    setShowPwaBanner(false);
  };

  const handleDismissPwaBanner = () => {
    setIsDismissed(true);
    localStorage.setItem('smartsantri_pwa_dismissed', 'true');
    setShowPwaBanner(false);
  };

  // Active Admin Name
  const currentAdminName = useMemo(() => {
    try {
      const directName = localStorage.getItem('smartsantri_admin_name') || localStorage.getItem('smartsantri_user_name');
      if (directName) return directName;
      const activeUser = localStorage.getItem('smartsantri_active_username');
      if (activeUser) {
        const clean = activeUser.split('@')[0];
        return clean.charAt(0).toUpperCase() + clean.slice(1);
      }
    } catch (e) {
      console.error(e);
    }
    return 'David Mustofa';
  }, []);

  // Quotes typewriter animation state
  const quotesList = useMemo(() => [
    `"الْعِلْمُ بِالتَّعَلُّمِ وَالْبَرَكَةُ بِالْخِدْمَةِ" - "Ilmu diperoleh dengan belajar, keberkahan dengan berkhidmat." ~Syaikhina Minanurrochman`,
    `"إِذَا كُسِيَتِ الْجُبَّةُ فَلَا تَخْلَعْهَا" - "Jika engkau telah dipakaikan jubah (jabatan/kekuasaan) oleh Allah, maka janganlah engkau melepaskannya." ~Syaikhina Minanurrochman`,
    `"مَنْ جَدَّ وَجَدَ" - "Siapa yang bersungguh-sungguh, dia akan berhasil."`,
    `"Ojo pengen dadi pemimpin, tapi nek dikon mimpin kudu amanah" ~Syaikhina Minanurrochman`
  ], []);

  const [quoteIdx, setQuoteIdx] = useState(0);
  const [typedQuote, setTypedQuote] = useState('');
  const [isDeletingQuote, setIsDeletingQuote] = useState(false);

  useEffect(() => {
    const currentFull = quotesList[quoteIdx];
    const speed = isDeletingQuote ? 20 : 40;

    const timer = setTimeout(() => {
      if (!isDeletingQuote) {
        setTypedQuote(currentFull.slice(0, typedQuote.length + 1));
        if (typedQuote.length + 1 >= currentFull.length) {
          setTimeout(() => setIsDeletingQuote(true), 3500);
        }
      } else {
        setTypedQuote(currentFull.slice(0, typedQuote.length - 1));
        if (typedQuote.length <= 1) {
          setIsDeletingQuote(false);
          setQuoteIdx((prev) => (prev + 1) % quotesList.length);
        }
      }
    }, speed);

    return () => clearTimeout(timer);
  }, [typedQuote, isDeletingQuote, quoteIdx, quotesList]);

  // 1. Data Santri Real Breakdown
  const totalSantriReal = santriList.length;

  const putraAktif = useMemo(() => 
    santriList.filter(s => s.gender === 'Putra' && (s.statusKeanggotaan === 'Aktif' || !s.statusKeanggotaan)).length
  , [santriList]);

  const putraAlumni = useMemo(() => 
    santriList.filter(s => s.gender === 'Putra' && s.statusKeanggotaan === 'Alumni').length
  , [santriList]);

  const putraMeninggal = useMemo(() => 
    santriList.filter(s => s.gender === 'Putra' && s.statusKeanggotaan === 'Meninggal').length
  , [santriList]);

  const putriAktif = useMemo(() => 
    santriList.filter(s => s.gender === 'Putri' && (s.statusKeanggotaan === 'Aktif' || !s.statusKeanggotaan)).length
  , [santriList]);

  const putriAlumni = useMemo(() => 
    santriList.filter(s => s.gender === 'Putri' && s.statusKeanggotaan === 'Alumni').length
  , [santriList]);

  const putriMeninggal = useMemo(() => 
    santriList.filter(s => s.gender === 'Putri' && s.statusKeanggotaan === 'Meninggal').length
  , [santriList]);

  // Concentric Multi-Segment Donut Chart Calculation
  // Outer Ring: Putri (R=40, Circumference = 251.327)
  // Inner Ring: Putra (R=30, Circumference = 188.495)
  const donutSegments = useMemo(() => {
    const totalPutri = putriAktif + putriAlumni + putriMeninggal;
    const totalPutra = putraAktif + putraAlumni + putraMeninggal;

    const C_OUTER = 251.327;
    const C_INNER = 188.495;

    // Outer Ring (Putri): Aktif (#EC4899), Alumni (#FBCFE8), Meninggal (#FFF1F2)
    let pAktifLen = 0, pAlumniLen = 0, pMeninggalLen = 0;
    if (totalPutri > 0) {
      pAktifLen = (putriAktif / totalPutri) * C_OUTER;
      pAlumniLen = (putriAlumni / totalPutri) * C_OUTER;
      pMeninggalLen = (putriMeninggal / totalPutri) * C_OUTER;
    } else {
      pAktifLen = C_OUTER / 3;
      pAlumniLen = C_OUTER / 3;
      pMeninggalLen = C_OUTER / 3;
    }

    // Inner Ring (Putra): Aktif (#3B82F6), Alumni (#BAE6FD), Meninggal (#F0F9FF)
    let mAktifLen = 0, mAlumniLen = 0, mMeninggalLen = 0;
    if (totalPutra > 0) {
      mAktifLen = (putraAktif / totalPutra) * C_INNER;
      mAlumniLen = (putraAlumni / totalPutra) * C_INNER;
      mMeninggalLen = (putraMeninggal / totalPutra) * C_INNER;
    } else {
      mAktifLen = C_INNER / 3;
      mAlumniLen = C_INNER / 3;
      mMeninggalLen = C_INNER / 3;
    }

    return {
      putri: {
        aktif: { dash: `${pAktifLen} ${C_OUTER}`, offset: 0 },
        alumni: { dash: `${pAlumniLen} ${C_OUTER}`, offset: -pAktifLen },
        meninggal: { dash: `${pMeninggalLen} ${C_OUTER}`, offset: -(pAktifLen + pAlumniLen) }
      },
      putra: {
        aktif: { dash: `${mAktifLen} ${C_INNER}`, offset: 0 },
        alumni: { dash: `${mAlumniLen} ${C_INNER}`, offset: -mAktifLen },
        meninggal: { dash: `${mMeninggalLen} ${C_INNER}`, offset: -(mAktifLen + mAlumniLen) }
      }
    };
  }, [putriAktif, putriAlumni, putriMeninggal, putraAktif, putraAlumni, putraMeninggal]);

  // 2. Status Domisili Real
  const putraMuqim = useMemo(() => 
    santriList.filter(s => s.gender === 'Putra' && (s.statusKeanggotaan === 'Aktif' || !s.statusKeanggotaan) && (s.statusDomisili || s.status || 'Muqim') === 'Muqim').length
  , [santriList]);

  const putriMuqim = useMemo(() => 
    santriList.filter(s => s.gender === 'Putri' && (s.statusKeanggotaan === 'Aktif' || !s.statusKeanggotaan) && (s.statusDomisili || s.status || 'Muqim') === 'Muqim').length
  , [santriList]);

  const pctPutraMuqim = putraAktif > 0 ? Math.round((putraMuqim / putraAktif) * 100) : 0;
  const pctPutriMuqim = putriAktif > 0 ? Math.round((putriMuqim / putriAktif) * 100) : 0;

  // 3. Lemari Terisi vs Belum Ditempatkan (Santri Belum Dapat Lemari) Real
  const {
    putraLemariTerisi,
    putraTotalKapasitas,
    putraBelumLemari,
    pctPutraKamar,
    putriLemariTerisi,
    putriTotalKapasitas,
    putriBelumLemari,
    pctPutriKamar
  } = useMemo(() => {
    const activePutra = santriList.filter(s => s.gender === 'Putra' && (s.statusKeanggotaan === 'Aktif' || !s.statusKeanggotaan));
    const activePutri = santriList.filter(s => s.gender === 'Putri' && (s.statusKeanggotaan === 'Aktif' || !s.statusKeanggotaan));

    // Santri belum dapat lemari (active santri without nomorLemari)
    const pBlm = activePutra.filter(s => !s.nomorLemari || s.nomorLemari.trim() === '' || s.nomorLemari === '-').length;
    const piBlm = activePutri.filter(s => !s.nomorLemari || s.nomorLemari.trim() === '' || s.nomorLemari === '-').length;

    // Filter Kompleks & Kamar by Gender
    const pKompleksIds = (kompleksList || []).filter(k => k.gender === 'Putra' || (!k.gender && k.nama.toLowerCase().includes('putra'))).map(k => k.id);
    const piKompleksIds = (kompleksList || []).filter(k => k.gender === 'Putri' || (!k.gender && k.nama.toLowerCase().includes('putri'))).map(k => k.id);

    const pKamar = (kamarList || []).filter(r => pKompleksIds.includes(r.kompleksId) || (!r.kompleksId && r.nama.toLowerCase().includes('putra')));
    const piKamar = (kamarList || []).filter(r => piKompleksIds.includes(r.kompleksId) || (!r.kompleksId && r.nama.toLowerCase().includes('putri')));

    const effPKamar = pKamar.length > 0 ? pKamar : (kamarList || []);
    const effPiKamar = piKamar.length > 0 ? piKamar : (kamarList || []);

    // Total Capacity
    let capP = effPKamar.reduce((sum, r) => sum + (r.kapasitas || 15), 0);
    let capPi = effPiKamar.reduce((sum, r) => sum + (r.kapasitas || 15), 0);

    // Occupied locker slots calculation (counting filled locker slots per room, without double counting santri)
    let filledP = 0;
    effPKamar.forEach(r => {
      const roomMembers = activePutra.filter(s => (s.kamar || '').trim().toLowerCase() === r.nama.trim().toLowerCase());
      const occupiedSlots = new Set<string>();
      roomMembers.forEach(s => {
        if (s.nomorLemari && s.nomorLemari.trim() !== '' && s.nomorLemari !== '-') {
          occupiedSlots.add(s.nomorLemari.trim());
        }
      });
      filledP += occupiedSlots.size;
    });

    let filledPi = 0;
    effPiKamar.forEach(r => {
      const roomMembers = activePutri.filter(s => (s.kamar || '').trim().toLowerCase() === r.nama.trim().toLowerCase());
      const occupiedSlots = new Set<string>();
      roomMembers.forEach(s => {
        if (s.nomorLemari && s.nomorLemari.trim() !== '' && s.nomorLemari !== '-') {
          occupiedSlots.add(s.nomorLemari.trim());
        }
      });
      filledPi += occupiedSlots.size;
    });

    // Fallback if no kamar defined in DB yet: count assigned santri directly
    if (capP === 0) {
      filledP = activePutra.filter(s => s.nomorLemari && s.nomorLemari.trim() !== '' && s.nomorLemari !== '-').length;
      capP = Math.max(filledP + pBlm, 15);
    }
    if (capPi === 0) {
      filledPi = activePutri.filter(s => s.nomorLemari && s.nomorLemari.trim() !== '' && s.nomorLemari !== '-').length;
      capPi = Math.max(filledPi + piBlm, 15);
    }

    const pctP = capP > 0 ? Math.min(100, Math.round((filledP / capP) * 100)) : 0;
    const pctPi = capPi > 0 ? Math.min(100, Math.round((filledPi / capPi) * 100)) : 0;

    return {
      putraLemariTerisi: filledP,
      putraTotalKapasitas: capP,
      putraBelumLemari: pBlm,
      pctPutraKamar: pctP,
      putriLemariTerisi: filledPi,
      putriTotalKapasitas: capPi,
      putriBelumLemari: piBlm,
      pctPutriKamar: pctPi
    };
  }, [santriList, kamarList, kompleksList]);

  // 4. Monitor Emis Terdaftar Real (strictly matching statusEmis from Sekretaris module)
  const isEmisTerdaftarSantri = (s: Santri) => {
    if (s.statusEmis) {
      return s.statusEmis.trim().toLowerCase() === 'terdaftar';
    }
    return Boolean((s.nis && s.nis.trim() !== '' && s.nis !== '-') || (s.nik && s.nik.trim() !== '' && s.nik !== '-'));
  };

  const putraAktifEmis = useMemo(() => 
    santriList.filter(s => s.gender === 'Putra' && (s.statusKeanggotaan === 'Aktif' || !s.statusKeanggotaan) && isEmisTerdaftarSantri(s)).length
  , [santriList]);
  const pctPutraAktifEmis = putraAktif > 0 ? Math.round((putraAktifEmis / putraAktif) * 100) : 0;

  const putraAlumniEmis = useMemo(() => 
    santriList.filter(s => s.gender === 'Putra' && s.statusKeanggotaan === 'Alumni' && isEmisTerdaftarSantri(s)).length
  , [santriList]);
  const pctPutraAlumniEmis = putraAlumni > 0 ? Math.round((putraAlumniEmis / putraAlumni) * 100) : 0;

  const putriAktifEmis = useMemo(() => 
    santriList.filter(s => s.gender === 'Putri' && (s.statusKeanggotaan === 'Aktif' || !s.statusKeanggotaan) && isEmisTerdaftarSantri(s)).length
  , [santriList]);
  const pctPutriAktifEmis = putriAktif > 0 ? Math.round((putriAktifEmis / putriAktif) * 100) : 0;

  const putriAlumniEmis = useMemo(() => 
    santriList.filter(s => s.gender === 'Putri' && s.statusKeanggotaan === 'Alumni' && isEmisTerdaftarSantri(s)).length
  , [santriList]);
  const pctPutriAlumniEmis = putriAlumni > 0 ? Math.round((putriAlumniEmis / putriAlumni) * 100) : 0;

  // 5. Aktifitas Terbaru Real dengan navigasi
  const allActivities = useMemo(() => {
    const list: { time: string; text: string }[] = [];
    if (keamananList && keamananList.length > 0) {
      [...keamananList].reverse().forEach((k) => {
        list.push({
          time: k.tanggal || new Date().toLocaleDateString('id-ID'),
          text: `Catatan Pelanggaran: ${k.namaSantri} (${k.jenisPelanggaran || 'Pelanggaran'}) - Poin: ${k.poin}`
        });
      });
    }
    if (santriList && santriList.length > 0) {
      [...santriList].reverse().slice(0, 30).forEach((s) => {
        list.push({
          time: s.tanggalMasuk || new Date().toLocaleDateString('id-ID'),
          text: `Santri Baru: ${s.nama} (${s.kelas || s.kamar || s.gender})`
        });
      });
    }
    if (list.length === 0) {
      list.push({ time: '-', text: 'Belum ada aktivitas terbaru' });
    }
    return list;
  }, [keamananList, santriList]);

  const [activityIndex, setActivityIndex] = useState(0);
  useEffect(() => {
    if (activityIndex >= allActivities.length) {
      setActivityIndex(0);
    }
  }, [allActivities.length]);

  const currentActivity = allActivities[activityIndex] || allActivities[0];

  // 6. Top Violators (Santri) strictly from keamananList
  const topViolators = useMemo(() => {
    if (!keamananList || keamananList.length === 0) return [];
    const map = new Map<string, { nama: string; poin: number; count: number }>();
    keamananList.forEach(k => {
      const existing = map.get(k.namaSantri) || { nama: k.namaSantri, poin: 0, count: 0 };
      existing.poin += k.poin || 0;
      existing.count += 1;
      map.set(k.namaSantri, existing);
    });
    return Array.from(map.values())
      .sort((a, b) => b.poin - a.poin)
      .slice(0, 10);
  }, [keamananList]);

  // 7. Top Violation Types (Jenis Pelanggaran) strictly from keamananList
  const topViolationTypes = useMemo(() => {
    if (!keamananList || keamananList.length === 0) return [];
    const map = new Map<string, { jenis: string; poin: number; count: number }>();
    keamananList.forEach(k => {
      const jenisName = (k.jenisPelanggaran || (k as any).pelanggaran || 'Pelanggaran').trim();
      if (!jenisName) return;
      const existing = map.get(jenisName) || { jenis: jenisName, poin: 0, count: 0 };
      existing.poin += k.poin || 0;
      existing.count += 1;
      map.set(jenisName, existing);
    });
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count || b.poin - a.poin)
      .slice(0, 10);
  }, [keamananList]);

  // Format task deadline / overdue remaining time with ticking seconds
  const formatTaskTime = (targetTimestamp?: number, currentNow: number = Date.now()) => {
    if (!targetTimestamp) return { isOverdue: false, text: 'Tanpa Deadline', formattedStr: '', badgeClass: 'bg-slate-100 text-slate-600' };

    const diffMs = targetTimestamp - currentNow;
    const isOverdue = diffMs < 0;
    const absSec = Math.floor(Math.abs(diffMs) / 1000);

    const days = Math.floor(absSec / 86400);
    const hours = Math.floor((absSec % 86400) / 3600);
    const minutes = Math.floor((absSec % 3600) / 60);
    const seconds = absSec % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');

    let formattedStr = '';
    if (days > 0) {
      formattedStr = `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
    } else {
      formattedStr = `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
    }

    if (isOverdue) {
      return {
        isOverdue: true,
        text: `OUT OF +${formattedStr}`,
        formattedStr,
        badgeClass: 'bg-rose-500 text-white font-extrabold shadow-2xs animate-pulse'
      };
    }

    return {
      isOverdue: false,
      text: formattedStr,
      formattedStr,
      badgeClass: 'bg-[#0D8A68] text-white font-extrabold shadow-2xs'
    };
  };

  // Handle task actions with database synchronization
  const toggleTaskStatus = async (id: string) => {
    const targetTask = tasks.find(t => t.id === id);
    if (!targetTask) return;

    const nextStatus = targetTask.status === 'done' ? 'pending' : 'done';

    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        if (selectedTaskDetail && selectedTaskDetail.id === id) {
          setSelectedTaskDetail({ ...selectedTaskDetail, status: nextStatus });
        }
        return { ...t, status: nextStatus };
      }
      return t;
    }));

    try {
      await updateTableRow<any>('tugas', 'smartsantri_dashboard_tasks', id, { 
        status: nextStatus,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.error("Gagal update status tugas di database:", e);
    }
  };

  const deleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    if (selectedTaskDetail && selectedTaskDetail.id === id) {
      setSelectedTaskDetail(null);
    }

    try {
      await deleteTableRow('tugas', 'smartsantri_dashboard_tasks', id);
    } catch (e) {
      console.error("Gagal menghapus tugas dari database:", e);
    }
  };

  const handleAddTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskFormText.trim()) return;

    const totalSec = (taskFormDays * 86400) + (taskFormHours * 3600) + (taskFormMinutes * 60) + taskFormSeconds;
    const totalMs = totalSec * 1000;
    const deadlineTimestamp = Date.now() + (totalMs > 0 ? totalMs : 3600000);
    const currentActiveUsername = (
      localStorage.getItem('smartsantri_active_username') || 
      localStorage.getItem('smartsantri_active_role') || 
      'pengurus'
    ).toLowerCase().trim();

    const newTask: TaskItem & { username?: string; user_id?: string; judul?: string; deskripsi?: string; deadline_timestamp?: number } = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
      text: taskFormText.trim(),
      judul: taskFormText.trim(),
      description: taskFormDesc.trim(),
      deskripsi: taskFormDesc.trim(),
      status: 'pending',
      deadlineTimestamp,
      deadline_timestamp: deadlineTimestamp,
      color: taskFormColor,
      createdAt: Date.now(),
      username: currentActiveUsername,
      user_id: currentActiveUsername
    };

    setTasks(prev => [newTask, ...prev]);
    setTaskFormText('');
    setTaskFormDesc('');
    setTaskFormDays(0);
    setTaskFormHours(1);
    setTaskFormMinutes(0);
    setTaskFormSeconds(0);
    setIsAddTaskModalOpen(false);

    try {
      await insertTableRow('tugas', 'smartsantri_dashboard_tasks', newTask);
    } catch (e) {
      console.error("Gagal menyimpan tugas baru ke database:", e);
    }
  };

  // Derive active username for filtering tasks per account
  const currentActiveUser = (
    localStorage.getItem('smartsantri_active_username') || 
    localStorage.getItem('smartsantri_active_role') || 
    'pengurus'
  ).toLowerCase().trim();

  // Filter tasks to only show tasks belonging to the active account
  const userTasks = useMemo(() => {
    return tasks.filter(t => {
      if (!t.username) {
        return currentActiveUser.includes('superadmin') || currentActiveUser === 'pengurus';
      }
      return t.username.toLowerCase().trim() === currentActiveUser;
    });
  }, [tasks, currentActiveUser]);

  // Filter tasks by search query matching eligible keyword in text or description
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return userTasks;
    const q = searchQuery.toLowerCase().trim();
    return userTasks.filter(t => 
      t.text.toLowerCase().includes(q) || 
      (t.description && t.description.toLowerCase().includes(q))
    );
  }, [userTasks, searchQuery]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
      className="min-h-screen bg-[#E6F4F1] p-3 md:p-6 font-sans text-slate-800 space-y-4 max-w-[1600px] mx-auto"
    >
      {/* PWA Banner if applicable */}
      {showPwaBanner && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-900 text-white p-4 shadow-md border border-emerald-600/30"
        >
          <div className="flex items-start justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-yellow-300 shrink-0">
                <Smartphone className="h-5 w-5 animate-bounce" style={{ animationDuration: '3s' }} />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Instal Go AttarOkey di HP / Desktop</h3>
                <p className="text-xs text-emerald-100/90">
                  {isIOS 
                    ? "Gunakan portal ini lebih cepat dan lancar dari layar utama perangkat Apple Anda." 
                    : "Simpan aplikasi ini ke beranda untuk akses instan dan kinerja lebih lancar."}
                </p>
              </div>
            </div>
            <button
              onClick={handleDismissPwaBanner}
              className="text-white/70 hover:text-white bg-white/5 hover:bg-white/10 p-1 rounded-full transition-all shrink-0 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {!isIOS && installPrompt && (
            <div className="mt-3 flex gap-2 justify-end">
              <button
                onClick={handleInstallClick}
                className="inline-flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-300 text-emerald-950 font-bold px-4 py-1.5 rounded-xl text-xs shadow-xs transition-all cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                Instal
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* Main Grid Layout: Left Main Area & Right Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* LEFT / MAIN COLUMN (8 COLS ON LG / 9 COLS ON XL) */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-4">

          {/* 1. Hero Welcome Banner */}
          <div className="bg-[#0D8A68] rounded-2xl p-5 text-white shadow-xs relative overflow-hidden flex flex-col justify-between min-h-[140px]">
            {/* Background subtle pattern decorative circle */}
            <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-white/5 rounded-full pointer-events-none" />

            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Sugeng Rawuh, <span className="font-serif italic font-normal text-emerald-200">{currentAdminName}</span>
              </h1>
              {/* Typewriter Quotes Animation */}
              <p className="text-xs md:text-sm text-emerald-100/90 italic mt-1.5 font-medium max-w-2xl min-h-[40px] flex items-center">
                <span>{typedQuote}</span>
                <span className="inline-block w-1.5 h-4 bg-yellow-300 ml-1 animate-pulse rounded-full" />
              </p>
            </div>

            <div className="mt-4">
              <button 
                onClick={() => onChangeModule('sekretaris', 'santri')}
                className="inline-flex items-center gap-2.5 bg-emerald-700/40 hover:bg-emerald-700/60 text-white text-xs md:text-sm font-semibold px-4 py-2 rounded-full border border-emerald-300/40 transition-all cursor-pointer backdrop-blur-sm shadow-md group"
              >
                <span className="w-6 h-6 rounded-full bg-white text-[#0D8A68] flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-110 group-hover:bg-yellow-300 group-hover:text-emerald-950 transition-all shadow-2xs">
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5] group-hover:translate-x-0.5 transition-transform" />
                </span>
                <span>Mulai Jelajahi Data</span>
              </button>
            </div>
          </div>

          {/* 2. Aktifitas Terbaru Ticker Bar (SCROLLING MARQUEE) */}
          <div className="bg-white rounded-full p-1.5 px-3 border border-emerald-100 shadow-3xs flex items-center justify-between text-xs font-semibold gap-2 overflow-hidden">
            <div className="flex items-center gap-2 shrink-0 z-10 bg-white pr-2">
              <span className="bg-[#0D8A68] text-white text-[11px] font-bold px-3 py-1 rounded-full shrink-0 shadow-3xs">
                Aktifitas Terbaru
              </span>
              <span className="text-rose-500 font-bold shrink-0 text-[11px] md:text-xs">
                ({currentActivity.time})
              </span>
            </div>
            
            <div className="flex-1 overflow-hidden relative h-5 flex items-center">
              <motion.div
                key={currentActivity.text}
                className="whitespace-nowrap text-slate-700 text-[11px] md:text-xs font-semibold inline-block"
                animate={{ x: ['100%', '-100%'] }}
                transition={{
                  repeat: Infinity,
                  repeatType: 'loop',
                  duration: Math.max(12, currentActivity.text.length * 0.28),
                  ease: 'linear'
                }}
              >
                {currentActivity.text}
              </motion.div>
            </div>

            <div className="flex items-center gap-0.5 text-slate-400 shrink-0 bg-white pl-2 z-10">
              <button 
                onClick={() => setActivityIndex(prev => Math.max(0, prev - 1))}
                className="p-1 hover:text-slate-600 cursor-pointer"
                title="Aktivitas Lebih Baru"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setActivityIndex(prev => Math.min(allActivities.length - 1, prev + 1))}
                className="p-1 hover:text-slate-600 cursor-pointer"
                title="Aktivitas Lebih Lama"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 3. Top Row Grid: Data Statistik Santri + Status Domisili + Donut Kamar Putra & Putri */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
            
            {/* Card A: Data Statistik Santri (5 Cols) - MULTI-SEGMENT CONCENTRIC DONUT + COLOR MATCHED TABLE */}
            <div className="md:col-span-5 bg-white rounded-2xl border border-emerald-100/80 shadow-3xs overflow-hidden flex flex-col justify-between">
              {/* Header Pill */}
              <div className="bg-[#0D8A68] text-white text-center text-xs font-extrabold py-2.5 tracking-wide">
                Data Statistik Santri
              </div>

              {/* Body Content */}
              <div className="p-4 flex flex-col items-center justify-center space-y-4 flex-1">
                {/* Concentric Multi-Segment Donut Chart */}
                <div className="relative w-40 h-40 flex items-center justify-center my-1">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    {/* OUTER RING (PUTRI) - 3 Segments */}
                    {/* 1. Putri Aktif (Vibrant Pink #EC4899) */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#EC4899"
                      strokeWidth="8"
                      strokeDasharray={donutSegments.putri.aktif.dash}
                      strokeDashoffset={donutSegments.putri.aktif.offset}
                      fill="transparent"
                    />
                    {/* 2. Putri Alumni (Light Pink #FBCFE8) */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#FBCFE8"
                      strokeWidth="8"
                      strokeDasharray={donutSegments.putri.alumni.dash}
                      strokeDashoffset={donutSegments.putri.alumni.offset}
                      fill="transparent"
                    />
                    {/* 3. Putri Meninggal (Very Pale Pink #FFF1F2) */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#FFF1F2"
                      strokeWidth="8"
                      strokeDasharray={donutSegments.putri.meninggal.dash}
                      strokeDashoffset={donutSegments.putri.meninggal.offset}
                      fill="transparent"
                    />

                    {/* INNER RING (PUTRA) - 3 Segments */}
                    {/* 1. Putra Aktif (Solid Blue #3B82F6) */}
                    <circle
                      cx="50"
                      cy="50"
                      r="30"
                      stroke="#3B82F6"
                      strokeWidth="8"
                      strokeDasharray={donutSegments.putra.aktif.dash}
                      strokeDashoffset={donutSegments.putra.aktif.offset}
                      fill="transparent"
                    />
                    {/* 2. Putra Alumni (Light Blue #BAE6FD) */}
                    <circle
                      cx="50"
                      cy="50"
                      r="30"
                      stroke="#BAE6FD"
                      strokeWidth="8"
                      strokeDasharray={donutSegments.putra.alumni.dash}
                      strokeDashoffset={donutSegments.putra.alumni.offset}
                      fill="transparent"
                    />
                    {/* 3. Putra Meninggal (Very Light Blue #F0F9FF) */}
                    <circle
                      cx="50"
                      cy="50"
                      r="30"
                      stroke="#F0F9FF"
                      strokeWidth="8"
                      strokeDasharray={donutSegments.putra.meninggal.dash}
                      strokeDashoffset={donutSegments.putra.meninggal.offset}
                      fill="transparent"
                    />
                  </svg>

                  {/* Center Total Count Text */}
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">TOTAL</span>
                    <span className="text-2xl font-black text-slate-900 leading-none my-0.5">
                      {totalSantriReal}
                    </span>
                    <span className="text-[10px] font-bold text-slate-600">Santri</span>
                  </div>
                </div>

                {/* Table Breakdown Synchronized with Donut Colors */}
                <div className="w-full text-xs font-bold rounded-xl overflow-hidden shadow-2xs border border-slate-100">
                  {/* Header Row */}
                  <div className="grid grid-cols-4 text-center">
                    <div className="bg-[#00A896] p-2 flex items-center justify-center"></div>
                    <div className="bg-[#3B82F6] text-white p-2 font-extrabold">Aktif</div>
                    <div className="bg-[#BAE6FD] text-[#0F172A] p-2 font-extrabold">Alumni</div>
                    <div className="bg-[#F0F9FF] text-[#0F172A] p-2 font-extrabold">Meninggal</div>
                  </div>
                  {/* Row Putra */}
                  <div className="grid grid-cols-4 text-center border-t border-white">
                    <div className="bg-[#3B82F6] text-white p-2 font-extrabold flex items-center justify-center">Putra</div>
                    <div className="bg-[#3B82F6] text-[#0F172A] p-2 font-black text-base flex items-center justify-center">{putraAktif}</div>
                    <div className="bg-[#BAE6FD] text-[#0F172A] p-2 font-black text-base flex items-center justify-center">{putraAlumni}</div>
                    <div className="bg-[#F0F9FF] text-[#0F172A] p-2 font-black text-base flex items-center justify-center">{putraMeninggal}</div>
                  </div>
                  {/* Row Putri */}
                  <div className="grid grid-cols-4 text-center border-t border-white">
                    <div className="bg-[#EC4899] text-white p-2 font-extrabold flex items-center justify-center">Putri</div>
                    <div className="bg-[#EC4899] text-[#0F172A] p-2 font-black text-base flex items-center justify-center">{putriAktif}</div>
                    <div className="bg-[#FCE7F3] text-[#0F172A] p-2 font-black text-base flex items-center justify-center">{putriAlumni}</div>
                    <div className="bg-[#FFF1F2] text-[#0F172A] p-2 font-black text-base flex items-center justify-center">{putriMeninggal}</div>
                  </div>
                </div>

                {/* Button Kelola Data */}
                <button 
                  onClick={() => onChangeModule('sekretaris', 'santri')}
                  className="w-full bg-[#0D8A68] hover:bg-[#0B7A5C] text-white font-extrabold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-3xs transition-all cursor-pointer"
                >
                  <span>Kelola Data</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Card B & C & D: Status Domisili + Donut Kamar (7 Cols) - REAL DATA */}
            <div className="md:col-span-7 space-y-3.5 flex flex-col justify-between">
              
              {/* Card B: Status Domisili Santri Aktif */}
              <div className="bg-white rounded-2xl border border-emerald-100/80 shadow-3xs overflow-hidden">
                <div className="bg-[#0D8A68] text-white text-center text-xs font-extrabold py-2.5 tracking-wide">
                  Status Domisili Santri Aktif
                </div>
                <div className="p-4 space-y-3 text-xs font-bold">
                  {/* Row Putra */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-slate-700">Domisili Muqim <span className="text-[#00A3FF]">Putra</span></span>
                      <span className="font-extrabold text-slate-800">{putraMuqim} <span className="text-slate-400 font-normal">/{putraAktif}</span></span>
                    </div>
                    <div className="w-full bg-slate-100 h-5 rounded-full overflow-hidden relative border border-slate-200/60">
                      <div className="bg-[#00A3FF] h-full rounded-full transition-all duration-500" style={{ width: `${pctPutraMuqim}%` }} />
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-white font-extrabold drop-shadow-xs">{pctPutraMuqim}%</span>
                    </div>
                  </div>

                  {/* Row Putri */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-slate-700">Domisili Muqim <span className="text-[#FF4B91]">Putri</span></span>
                      <span className="font-extrabold text-slate-800">{putriMuqim} <span className="text-slate-400 font-normal">/{putriAktif}</span></span>
                    </div>
                    <div className="w-full bg-slate-100 h-5 rounded-full overflow-hidden relative border border-slate-200/60">
                      <div className="bg-[#FF4B91] h-full rounded-full transition-all duration-500" style={{ width: `${pctPutriMuqim}%` }} />
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-white font-extrabold drop-shadow-xs">{pctPutriMuqim}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid 2 Donut Cards for Kamar Putra & Kamar Putri - MATCHING UPLOADED IMAGE EXACTLY */}
              <div className="grid grid-cols-2 gap-3.5 flex-1">
                
                {/* Kamar Putra Donut */}
                <div className="bg-white rounded-2xl border border-emerald-100/80 shadow-3xs p-3.5 flex flex-col items-center justify-between relative overflow-hidden">
                  {/* Top Arched Cap Bar */}
                  <div className="absolute top-0 left-2 right-2 h-1.5 bg-[#0D8A68] rounded-b-md" />

                  <div className="relative w-32 h-32 flex items-center justify-center my-1.5">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      {/* Background Circle (Blm Ditempatkan - Light Sky Blue #D0EBFF) */}
                      <circle
                        cx="50"
                        cy="50"
                        r="34"
                        stroke="#D0EBFF"
                        strokeWidth="18"
                        fill="transparent"
                      />
                      {/* Foreground Circle (Kamar Terisi - Solid Blue #299DFF) */}
                      <circle
                        cx="50"
                        cy="50"
                        r="34"
                        stroke="#299DFF"
                        strokeWidth="18"
                        strokeDasharray={`${(pctPutraKamar / 100) * 213.6} 213.6`}
                        strokeDashoffset="0"
                        strokeLinecap="butt"
                        fill="transparent"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] font-bold text-slate-600">Total</span>
                      <span className="text-xl font-black text-[#299DFF] leading-tight my-0.5">{pctPutraKamar}%</span>
                      <span className="text-[10px] font-bold text-slate-600">Terisi</span>
                    </div>
                  </div>

                  {/* Dual Badge Footer Box */}
                  <div className="w-full text-[11px] font-bold rounded-xl overflow-hidden shadow-3xs border border-sky-100 mt-1">
                    <div className="grid grid-cols-2 text-center">
                      <div className="bg-[#299DFF] text-white py-1 px-0.5 font-extrabold">Lemari terisi</div>
                      <div className="bg-[#D0EBFF] text-[#0284C7] py-1 px-0.5 font-extrabold">Blm ditempatkan</div>
                    </div>
                    <div className="grid grid-cols-2 text-center border-t border-white">
                      <div className="py-1.5 bg-[#299DFF] text-white font-black text-xs">{putraLemariTerisi} <span className="font-medium text-sky-100 text-[10px]">/{putraTotalKapasitas}</span></div>
                      <div className="py-1.5 bg-[#D0EBFF] text-[#0284C7] font-black text-xs">{putraBelumLemari}</div>
                    </div>
                  </div>
                </div>

                {/* Kamar Putri Donut */}
                <div className="bg-white rounded-2xl border border-emerald-100/80 shadow-3xs p-3.5 flex flex-col items-center justify-between relative overflow-hidden">
                  {/* Top Arched Cap Bar */}
                  <div className="absolute top-0 left-2 right-2 h-1.5 bg-[#0D8A68] rounded-b-md" />

                  <div className="relative w-32 h-32 flex items-center justify-center my-1.5">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      {/* Background Circle (Blm Ditempatkan - Light Soft Pink #FFD8E8) */}
                      <circle
                        cx="50"
                        cy="50"
                        r="34"
                        stroke="#FFD8E8"
                        strokeWidth="18"
                        fill="transparent"
                      />
                      {/* Foreground Circle (Kamar Terisi - Solid Pink #FF529A) */}
                      <circle
                        cx="50"
                        cy="50"
                        r="34"
                        stroke="#FF529A"
                        strokeWidth="18"
                        strokeDasharray={`${(pctPutriKamar / 100) * 213.6} 213.6`}
                        strokeDashoffset="0"
                        strokeLinecap="butt"
                        fill="transparent"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] font-bold text-slate-600">Total</span>
                      <span className="text-xl font-black text-[#FF529A] leading-tight my-0.5">{pctPutriKamar}%</span>
                      <span className="text-[10px] font-bold text-slate-600">Terisi</span>
                    </div>
                  </div>

                  {/* Dual Badge Footer Box */}
                  <div className="w-full text-[11px] font-bold rounded-xl overflow-hidden shadow-3xs border border-pink-100 mt-1">
                    <div className="grid grid-cols-2 text-center">
                      <div className="bg-[#FF529A] text-white py-1 px-0.5 font-extrabold">Lemari terisi</div>
                      <div className="bg-[#FFD8E8] text-[#BE185D] py-1 px-0.5 font-extrabold">Blm ditempatkan</div>
                    </div>
                    <div className="grid grid-cols-2 text-center border-t border-white">
                      <div className="py-1.5 bg-[#FF529A] text-white font-black text-xs">{putriLemariTerisi} <span className="font-medium text-pink-100 text-[10px]">/{putriTotalKapasitas}</span></div>
                      <div className="py-1.5 bg-[#FFD8E8] text-[#BE185D] font-black text-xs">{putriBelumLemari}</div>
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>

        {/* RIGHT SIDEBAR COLUMN (4 COLS ON LG / 3 COLS ON XL) */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4 flex flex-col">
          
          {/* Top Search Input Bar (Pencarian Tugas / Data) */}
          <div className="bg-white rounded-2xl p-2 px-4 border border-emerald-100 shadow-3xs flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input 
              type="text"
              placeholder="Cari kata kunci tugas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs font-bold text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Tugas Saya Section */}
          <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-3xs space-y-3 flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-800 text-sm">Tugas Saya</h3>
                <span className="bg-emerald-100 text-[#0D8A68] text-[10px] font-black px-2 py-0.5 rounded-full">
                  {filteredTasks.length}
                </span>
              </div>

              <button 
                onClick={() => setIsAddTaskModalOpen(true)}
                className="w-7 h-7 rounded-full bg-[#0D8A68] hover:bg-emerald-700 text-white flex items-center justify-center transition-all shadow-2xs cursor-pointer font-bold group"
                title="Tambah Tugas Baru (Atur Durasi & Deadline)"
              >
                <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </button>
            </div>

            {/* Task Items Scrollable List */}
            <div className="space-y-2.5 max-h-[380px] md:max-h-[440px] overflow-y-auto pr-1 custom-scrollbar flex-1">
              {filteredTasks.map((task) => {
                const isDone = task.status === 'done';
                const timeInfo = formatTaskTime(task.deadlineTimestamp, now);

                let cardBg = 'bg-slate-50 border-slate-100 hover:border-slate-300';
                if (isDone) {
                  cardBg = 'bg-[#EAFBF3] border-emerald-200/60 hover:border-emerald-300';
                } else if (timeInfo.isOverdue) {
                  cardBg = 'bg-rose-50/70 border-rose-200 hover:border-rose-300';
                } else if (task.color === 'yellow') {
                  cardBg = 'bg-[#FFFBEB] border-amber-200/60 hover:border-amber-300';
                } else if (task.color === 'blue') {
                  cardBg = 'bg-[#F0F9FF] border-sky-200/60 hover:border-sky-300';
                }

                return (
                  <div 
                    key={task.id}
                    onClick={() => setSelectedTaskDetail(task)}
                    className={`p-3 rounded-2xl border ${cardBg} shadow-2xs space-y-2 transition-all cursor-pointer group hover:shadow-xs relative overflow-hidden`}
                  >
                    {/* Top Item Text & Checkbox */}
                    <div className="flex items-start gap-2.5">
                      {/* Checkbox */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTaskStatus(task.id);
                        }}
                        className={`w-5 h-5 rounded-md border mt-0.5 flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                          isDone 
                            ? 'bg-emerald-500 border-emerald-500 text-white' 
                            : 'bg-white border-slate-300 hover:border-emerald-500'
                        }`}
                        title={isDone ? 'Tandai belum selesai' : 'Tandai selesai'}
                      >
                        {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>

                      {/* Task Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold leading-relaxed truncate ${
                          isDone ? 'line-through text-slate-500' : 'text-slate-800 group-hover:text-[#0D8A68] transition-colors'
                        }`}>
                          {task.text}
                        </p>
                        {task.description && (
                          <p className="text-[10px] text-slate-500 truncate mt-0.5 font-normal">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Bottom Status Badge, Ticking Seconds & Delete */}
                    <div className="flex items-center justify-between pt-1.5 pl-0.5 border-t border-slate-200/40">
                      {isDone ? (
                        <span className="bg-[#22C55E] text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-3xs flex items-center gap-1">
                          <Check className="w-3 h-3 stroke-[3]" />
                          Terselesaikan
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Clock className={`w-3 h-3 ${timeInfo.isOverdue ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`} />
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${timeInfo.badgeClass}`}>
                            {timeInfo.text}
                          </span>
                        </div>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTask(task.id);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Tugas"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredTasks.length === 0 && (
                <div className="text-center py-8 px-2 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 my-auto">
                  <ListTodo className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-slate-500">
                    {searchQuery ? `Tidak ada tugas sesuai '${searchQuery}'` : 'Belum ada tugas tercatat'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {searchQuery ? 'Coba kata kunci lain atau tambah tugas baru' : 'Klik + untuk menambah tugas dengan durasi & deadline'}
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* 4. Bottom Full-Width Row Grid: Monitor Emis Terdaftar (5 Cols) + Top 10 Pelanggaran (7 Cols) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-stretch">
        
        {/* Monitor Emis Terdaftar (5 Cols - Matches Data Statistik Santri width above) */}
        <div className="md:col-span-5 bg-white rounded-2xl border border-emerald-100/80 shadow-3xs overflow-hidden flex flex-col">
          <div className="bg-[#0D8A68] text-white text-center text-xs font-extrabold py-2.5 tracking-wide shrink-0">
            Monitor Emis Terdaftar
          </div>
          <div className="p-4 space-y-3.5 text-xs font-bold flex flex-col justify-start">
            {/* Row 1: Santri Aktif Putra */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-700 font-bold">Santri Aktif <span className="text-[#0D8A68]">Putra</span></span>
                <span className="font-extrabold text-slate-800">{putraAktifEmis} <span className="text-slate-400 font-normal">/{putraAktif}</span></span>
              </div>
              <div className="w-full bg-slate-100 h-5 rounded-full overflow-hidden relative border border-slate-200/60">
                <div className="bg-[#0D8A68] h-full rounded-full transition-all duration-500" style={{ width: `${pctPutraAktifEmis}%` }} />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] text-white font-black drop-shadow-xs">{pctPutraAktifEmis}%</span>
              </div>
            </div>

            {/* Row 2: Santri Alumni Putra */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-700 font-bold">Santri Alumni <span className="text-[#0D8A68]">Putra</span></span>
                <span className="font-extrabold text-slate-800">{putraAlumniEmis} <span className="text-slate-400 font-normal">/{putraAlumni}</span></span>
              </div>
              <div className="w-full bg-slate-100 h-5 rounded-full overflow-hidden relative border border-slate-200/60">
                <div className="bg-[#0D8A68] h-full rounded-full transition-all duration-500" style={{ width: `${pctPutraAlumniEmis}%` }} />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] text-white font-black drop-shadow-xs">{pctPutraAlumniEmis}%</span>
              </div>
            </div>

            {/* Row 3: Santri Aktif Putri */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-700 font-bold">Santri Aktif <span className="text-[#3B82F6]">Putri</span></span>
                <span className="font-extrabold text-slate-800">{putriAktifEmis} <span className="text-slate-400 font-normal">/{putriAktif}</span></span>
              </div>
              <div className="w-full bg-slate-100 h-5 rounded-full overflow-hidden relative border border-slate-200/60">
                <div className="bg-[#3B82F6] h-full rounded-full transition-all duration-500" style={{ width: `${pctPutriAktifEmis}%` }} />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] text-white font-black drop-shadow-xs">{pctPutriAktifEmis}%</span>
              </div>
            </div>

            {/* Row 4: Santri Alumni Putri */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-700 font-bold">Santri Alumni <span className="text-[#3B82F6]">Putri</span></span>
                <span className="font-extrabold text-slate-800">{putriAlumniEmis} <span className="text-slate-400 font-normal">/{putriAlumni}</span></span>
              </div>
              <div className="w-full bg-slate-100 h-5 rounded-full overflow-hidden relative border border-slate-200/60">
                <div className="bg-[#3B82F6] h-full rounded-full transition-all duration-500" style={{ width: `${pctPutriAlumniEmis}%` }} />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] text-white font-black drop-shadow-xs">{pctPutriAlumniEmis}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top 10 Pelanggaran / Pelanggar Card */}
        <div className="md:col-span-7 bg-[#008265] rounded-3xl p-4 md:p-5 text-white shadow-md border border-emerald-600/40 flex flex-col justify-between h-full relative overflow-hidden">
          {/* Header Top Pills Tabs (Top 10 Pelanggaran & Top 10 Pelanggar) */}
          <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-emerald-600/30 shrink-0">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setViolationsTab('pelanggaran')}
                className={`text-xs px-4 py-1.5 rounded-full font-black transition-all cursor-pointer ${
                  violationsTab === 'pelanggaran'
                    ? 'bg-[#80ED99] text-[#005944] shadow-sm'
                    : 'bg-[#007359] hover:bg-[#00634c] text-white border border-emerald-400/30'
                }`}
              >
                Top 10 Pelanggaran
              </button>
              <button 
                onClick={() => setViolationsTab('pelanggar')}
                className={`text-xs px-4 py-1.5 rounded-full font-black transition-all cursor-pointer ${
                  violationsTab === 'pelanggar'
                    ? 'bg-[#80ED99] text-[#005944] shadow-sm'
                    : 'bg-[#007359] hover:bg-[#00634c] text-white border border-emerald-400/30'
                }`}
              >
                Top 10 Pelanggar
              </button>
            </div>

            <button 
              onClick={() => onChangeModule('keamanan')}
              className="p-1.5 text-emerald-200 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs font-extrabold"
              title="Buka Modul Keamanan"
            >
              <span className="hidden sm:inline">Modul Keamanan</span>
              <ArrowUpRight className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* List Content - RATA ATAS dengan rounded-full pill items dan scrollable */}
          <div className="space-y-2 overflow-y-auto max-h-[210px] pr-1 flex-1">
            {violationsTab === 'pelanggaran' ? (
              topViolationTypes.length > 0 ? (
                topViolationTypes.slice(0, 10).map((item, idx) => {
                  const rank = idx + 1;
                  let rankNumColor = 'text-[#008265]';
                  if (rank === 1) rankNumColor = 'text-[#FF3B3B]';
                  else if (rank === 2) rankNumColor = 'text-[#FF8C00]';
                  else if (rank === 3) rankNumColor = 'text-[#EAB308]';

                  return (
                    <div 
                      key={idx}
                      onClick={() => onChangeModule('keamanan')}
                      className="bg-[#12A07E] hover:bg-[#0F9172] border border-emerald-400/20 rounded-full py-2 px-3.5 flex items-center justify-between cursor-pointer transition-all group shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-7 h-7 rounded-full bg-white ${rankNumColor} font-black flex items-center justify-center text-sm shrink-0 shadow-xs`}>
                          {rank}
                        </span>
                        <span className="text-white font-extrabold text-sm md:text-base truncate group-hover:text-yellow-200 transition-colors">
                          {item.jenis}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[#80ED99] font-black text-sm md:text-base">{item.count}x</span>
                        <span className="text-white/90 text-xs font-semibold italic mr-1">Kejadian</span>
                        <span className="text-[#80ED99] font-black text-sm md:text-base">{item.poin}</span>
                        <span className="text-white/90 text-xs font-semibold italic">Poin</span>
                        <ArrowUpRight className="w-4 h-4 text-white ml-1 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform stroke-[2.5]" />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-10 text-white/80 text-xs font-semibold">
                  <span>Belum ada data catatan pelanggaran</span>
                </div>
              )
            ) : (
              topViolators.length > 0 ? (
                topViolators.slice(0, 10).map((item, idx) => {
                  const rank = idx + 1;
                  let rankNumColor = 'text-[#008265]';
                  if (rank === 1) rankNumColor = 'text-[#FF3B3B]';
                  else if (rank === 2) rankNumColor = 'text-[#FF8C00]';
                  else if (rank === 3) rankNumColor = 'text-[#EAB308]';

                  return (
                    <div 
                      key={idx}
                      onClick={() => {
                        const found = santriList.find(s => s.nama.toLowerCase() === item.nama.toLowerCase());
                        if (found) {
                          setSelectedSantriForDetail(found);
                        } else {
                          setSelectedSantriForDetail({
                            id: 'fallback-' + idx,
                            nis: '-',
                            nama: item.nama,
                            kelas: '-',
                            kamar: '-',
                            asal: '-',
                            gender: 'Putra',
                            tanggalMasuk: '-',
                            statusKeanggotaan: 'Aktif'
                          });
                        }
                      }}
                      className="bg-[#12A07E] hover:bg-[#0F9172] border border-emerald-400/20 rounded-full py-2 px-3.5 flex items-center justify-between cursor-pointer transition-all group shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-7 h-7 rounded-full bg-white ${rankNumColor} font-black flex items-center justify-center text-sm shrink-0 shadow-xs`}>
                          {rank}
                        </span>
                        <span className="text-white font-extrabold text-sm md:text-base truncate group-hover:text-yellow-200 transition-colors">
                          {item.nama}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[#80ED99] font-black text-sm md:text-base">{item.poin}</span>
                        <span className="text-white/90 text-xs font-semibold italic mr-1">Poin</span>
                        <span className="text-[#80ED99] font-black text-sm md:text-base">{item.count}x</span>
                        <span className="text-white/90 text-xs font-semibold italic">Pelanggaran</span>
                        <ArrowUpRight className="w-4 h-4 text-white ml-1 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform stroke-[2.5]" />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-10 text-white/80 text-xs font-semibold">
                  <span>Belum ada data santri pelanggar</span>
                </div>
              )
            )}
          </div>
        </div>

      </div>



      {/* MODAL TAMBAH TUGAS (DENGAN INPUT DURASI & DEADLINE) */}
      <AnimatePresence>
        {isAddTaskModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-5 md:p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-50 text-[#0D8A68]">
                    <Timer className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-800">Tambah Tugas Baru</h3>
                </div>
                <button 
                  onClick={() => setIsAddTaskModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddTaskSubmit} className="space-y-4">
                {/* Judul Tugas */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Judul / Nama Tugas <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="Contoh: Cetak rekap iuran bulanan..."
                    value={taskFormText}
                    onFocus={(e) => e.target.select()}
                    onClick={(e) => e.currentTarget.select()}
                    onChange={(e) => setTaskFormText(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:border-[#0D8A68] focus:bg-white"
                    autoFocus
                  />
                </div>

                {/* Deskripsi Detail (Opsional) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Deskripsi Detail (Opsional)
                  </label>
                  <textarea 
                    rows={2}
                    placeholder="Tambahkan detail instruksi atau catatan tugas..."
                    value={taskFormDesc}
                    onFocus={(e) => e.target.select()}
                    onClick={(e) => e.currentTarget.select()}
                    onChange={(e) => setTaskFormDesc(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-800 focus:outline-none focus:border-[#0D8A68] focus:bg-white resize-none"
                  />
                </div>

                {/* Input Durasi Pengerjaan */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Durasi Pengerjaan / Target Time</span>
                    <span className="text-[10px] text-emerald-700 font-extrabold">Hitung otomatis</span>
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block mb-0.5 text-center">Hari</span>
                      <input 
                        type="number"
                        min="0"
                        max="365"
                        value={taskFormDays}
                        onFocus={(e) => e.target.select()}
                        onClick={(e) => e.currentTarget.select()}
                        onChange={(e) => setTaskFormDays(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full text-xs p-2 rounded-xl bg-slate-50 border border-slate-200 font-extrabold text-slate-800 text-center focus:outline-none focus:border-[#0D8A68] focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block mb-0.5 text-center">Jam</span>
                      <input 
                        type="number"
                        min="0"
                        max="23"
                        value={taskFormHours}
                        onFocus={(e) => e.target.select()}
                        onClick={(e) => e.currentTarget.select()}
                        onChange={(e) => setTaskFormHours(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full text-xs p-2 rounded-xl bg-slate-50 border border-slate-200 font-extrabold text-slate-800 text-center focus:outline-none focus:border-[#0D8A68] focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block mb-0.5 text-center">Menit</span>
                      <input 
                        type="number"
                        min="0"
                        max="59"
                        value={taskFormMinutes}
                        onFocus={(e) => e.target.select()}
                        onClick={(e) => e.currentTarget.select()}
                        onChange={(e) => setTaskFormMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                        className="w-full text-xs p-2 rounded-xl bg-slate-50 border border-slate-200 font-extrabold text-slate-800 text-center focus:outline-none focus:border-[#0D8A68] focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block mb-0.5 text-center">Detik</span>
                      <input 
                        type="number"
                        min="0"
                        max="59"
                        value={taskFormSeconds}
                        onFocus={(e) => e.target.select()}
                        onClick={(e) => e.currentTarget.select()}
                        onChange={(e) => setTaskFormSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                        className="w-full text-xs p-2 rounded-xl bg-slate-50 border border-slate-200 font-extrabold text-slate-800 text-center focus:outline-none focus:border-[#0D8A68] focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1 font-medium">
                    <Clock className="w-3 h-3 text-[#0D8A68]" />
                    <span>
                      Target Deadline: <strong className="text-slate-700">{new Date(Date.now() + (((taskFormDays * 86400) + (taskFormHours * 3600) + (taskFormMinutes * 60) + taskFormSeconds) * 1000)).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</strong> ({taskFormDays > 0 ? `${taskFormDays}h ` : ''}{taskFormHours}j {taskFormMinutes}m {taskFormSeconds}d dari sekarang)
                    </span>
                  </p>
                </div>

                {/* Prioritas / Warna Card */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kategori / Tingkat Prioritas
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setTaskFormColor('yellow')}
                      className={`py-2 px-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                        taskFormColor === 'yellow'
                          ? 'bg-amber-100 text-amber-900 border-amber-400 ring-2 ring-amber-400/20'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-amber-50'
                      }`}
                    >
                      Penting (Kuning)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaskFormColor('blue')}
                      className={`py-2 px-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                        taskFormColor === 'blue'
                          ? 'bg-sky-100 text-sky-900 border-sky-400 ring-2 ring-sky-400/20'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-sky-50'
                      }`}
                    >
                      Mendesak (Biru)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaskFormColor('green')}
                      className={`py-2 px-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                        taskFormColor === 'green'
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-400 ring-2 ring-emerald-400/20'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50'
                      }`}
                    >
                      Santai (Hijau)
                    </button>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setIsAddTaskModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2 text-xs font-extrabold bg-[#0D8A68] hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Simpan Tugas
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DETAIL TUGAS (KLIK KOTAK TUGAS DENGAN WAKTU BERGERAK LIVE) */}
      <AnimatePresence>
        {selectedTaskDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-5 md:p-6 w-full max-w-lg shadow-2xl border border-slate-100 space-y-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-3 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                      selectedTaskDetail.status === 'done'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedTaskDetail.color === 'yellow'
                        ? 'bg-amber-100 text-amber-800'
                        : selectedTaskDetail.color === 'blue'
                        ? 'bg-sky-100 text-sky-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {selectedTaskDetail.status === 'done' ? 'Selesai' : 'Pending'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      ID: #{selectedTaskDetail.id.slice(-6)}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-800 leading-snug">
                    {selectedTaskDetail.text}
                  </h3>
                </div>

                <button 
                  onClick={() => setSelectedTaskDetail(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Live Time Ticking Card */}
              {(() => {
                const timeInfo = formatTaskTime(selectedTaskDetail.deadlineTimestamp, now);
                return (
                  <div className={`p-4 rounded-2xl border ${
                    selectedTaskDetail.status === 'done'
                      ? 'bg-emerald-50 border-emerald-200'
                      : timeInfo.isOverdue
                      ? 'bg-rose-50 border-rose-300'
                      : 'bg-slate-50 border-slate-200'
                  } space-y-2`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                        <Timer className="w-4 h-4 text-[#0D8A68]" />
                        Status Waktu & Deadline:
                      </span>
                      {selectedTaskDetail.status === 'done' ? (
                        <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-3 py-0.5 rounded-full">
                          Terselesaikan
                        </span>
                      ) : timeInfo.isOverdue ? (
                        <span className="text-xs font-black text-rose-600 bg-rose-100 px-3 py-0.5 rounded-full animate-pulse">
                          ⚠️ TELAT (OUT OF TIME)
                        </span>
                      ) : (
                        <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-3 py-0.5 rounded-full">
                          ⏳ Dalam Proses
                        </span>
                      )}
                    </div>

                    <div className="text-center py-2">
                      {selectedTaskDetail.status === 'done' ? (
                        <p className="text-lg font-black text-emerald-700">Tugas sudah selesai tepat waktu!</p>
                      ) : timeInfo.isOverdue ? (
                        <div>
                          <p className="text-xs font-bold text-rose-600 uppercase tracking-wide">Tugas Melebihi Waktu Deadline (Out Of):</p>
                          <p className="text-2xl font-black text-rose-600 font-mono tracking-tight my-1">
                            +{timeInfo.formattedStr}
                          </p>
                          <p className="text-[11px] text-rose-500 font-medium">
                            Indikator waktu detik terus bergerak realtime menghitung waktu keterlambatan.
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Sisa Waktu Pengerjaan:</p>
                          <p className="text-2xl font-black text-[#0D8A68] font-mono tracking-tight my-1">
                            {timeInfo.formattedStr}
                          </p>
                          <p className="text-[11px] text-slate-500 font-medium">
                            Hitung mundur detik terus berjalan aktif.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Deskripsi & Meta */}
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-bold text-slate-500 block mb-1">Deskripsi Detail:</span>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-medium leading-relaxed min-h-[60px]">
                    {selectedTaskDetail.description || 'Tidak ada deskripsi tambahan.'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-500">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="block text-slate-400 font-bold mb-0.5">Waktu Dibuat</span>
                    <strong className="text-slate-700">
                      {new Date(selectedTaskDetail.createdAt || Date.now()).toLocaleString('id-ID')}
                    </strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="block text-slate-400 font-bold mb-0.5">Target Deadline</span>
                    <strong className="text-slate-700">
                      {selectedTaskDetail.deadlineTimestamp 
                        ? new Date(selectedTaskDetail.deadlineTimestamp).toLocaleString('id-ID')
                        : '-'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  onClick={() => deleteTask(selectedTaskDetail.id)}
                  className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  Hapus Tugas
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleTaskStatus(selectedTaskDetail.id)}
                    className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
                      selectedTaskDetail.status === 'done'
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        : 'bg-[#0D8A68] hover:bg-emerald-700 text-white shadow-xs'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    {selectedTaskDetail.status === 'done' ? 'Tandai Belum Selesai' : 'Tandai Selesai'}
                  </button>
                  <button
                    onClick={() => setSelectedTaskDetail(null)}
                    className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SANTRI DETAIL MODAL */}
      {selectedSantriForDetail && (
        <SantriDetailModal
          selectedSantri={selectedSantriForDetail}
          onClose={() => setSelectedSantriForDetail(null)}
        />
      )}

</motion.div>
  );
}
