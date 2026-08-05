import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Menu, 
  Bell, 
  MessageSquare, 
  Search, 
  X, 
  FileText, 
  Wallet, 
  BookOpen, 
  Users, 
  ShieldAlert, 
  Home as HomeIcon, 
  Settings, 
  ChevronRight, 
  GraduationCap, 
  Shield, 
  Building, 
  Bed, 
  Calendar, 
  AlertTriangle, 
  Layers, 
  Lock, 
  Database,
  User,
  Sparkles,
  ArrowRight,
  BookMarked,
  UserPlus
} from 'lucide-react';
import { Santri } from '../types';
import { renderSantriAvatar } from './SekretarisHelper';

interface MenuItemSearch {
  module: string;
  subTab: string;
  title: string;
  parent: string;
  desc: string;
  icon: React.ComponentType<any>;
  badgeColor: string;
  badgeBg: string;
}

const ALL_SEARCH_MENUS: MenuItemSearch[] = [
  { module: 'home', subTab: 'dashboard', title: 'Dashboard Utama', parent: 'Home', desc: 'Ringkasan & statistik utama pesantren', icon: HomeIcon, badgeColor: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  { module: 'sekretaris', subTab: 'overview', title: 'Overview Sekretaris', parent: 'Sekretaris', desc: 'Ringkasan demografi & statistik santri', icon: FileText, badgeColor: 'text-emerald-700', badgeBg: 'bg-emerald-50 border-emerald-200' },
  { module: 'sekretaris', subTab: 'santri', title: 'Data Induk Santri', parent: 'Sekretaris', desc: 'Direktori lengkap data santri aktif', icon: Users, badgeColor: 'text-emerald-700', badgeBg: 'bg-emerald-50 border-emerald-200' },
  { module: 'bendahara', subTab: 'syahriah', title: 'Syahriah Bulanan', parent: 'Bendahara', desc: 'Pembayaran spp & tagihan bulanan santri', icon: Wallet, badgeColor: 'text-amber-700', badgeBg: 'bg-amber-50 border-amber-200' },
  { module: 'pendidikan', subTab: 'lembaga', title: 'Aktivitas Akademik', parent: 'Pendidikan', desc: 'Kurikulum & aktivitas kelas madrasah', icon: BookOpen, badgeColor: 'text-indigo-700', badgeBg: 'bg-indigo-50 border-indigo-200' },
  { module: 'pendidikan', subTab: 'akademik', title: 'Data Akademik', parent: 'Pendidikan', desc: 'Nilai & rekapitulasi data pelajaran', icon: GraduationCap, badgeColor: 'text-indigo-700', badgeBg: 'bg-indigo-50 border-indigo-200' },
  { module: 'pendidikan', subTab: 'rombel', title: 'Rombongan Belajar', parent: 'Pendidikan', desc: 'Pengelompokan rombel & kelas santri', icon: Layers, badgeColor: 'text-indigo-700', badgeBg: 'bg-indigo-50 border-indigo-200' },
  { module: 'humasy', subTab: 'kamar', title: 'Kelola Kamar', parent: 'Humasy', desc: 'Manajemen kamar, asrama & fasilitas', icon: HomeIcon, badgeColor: 'text-purple-700', badgeBg: 'bg-purple-50 border-purple-200' },
  { module: 'humasy', subTab: 'datakamar', title: 'Data Kamar Santri', parent: 'Humasy', desc: 'Penempatan kamar & daftar penghuni', icon: Bed, badgeColor: 'text-purple-700', badgeBg: 'bg-purple-50 border-purple-200' },
  { module: 'keamanan', subTab: 'overview', title: 'Overview Keamanan', parent: 'Keamanan', desc: 'Statistik pelanggaran & perizinan', icon: Shield, badgeColor: 'text-rose-700', badgeBg: 'bg-rose-50 border-rose-200' },
  { module: 'keamanan', subTab: 'catatan', title: 'Data Pelanggaran', parent: 'Keamanan', desc: 'Buku catatan pelanggaran & takzir', icon: AlertTriangle, badgeColor: 'text-rose-700', badgeBg: 'bg-rose-50 border-rose-200' },
  { module: 'keamanan', subTab: 'bukuinduk', title: 'Buku Induk Sanksi', parent: 'Keamanan', desc: 'Rekap poin sanksi & tindakan disiplin', icon: BookMarked, badgeColor: 'text-rose-700', badgeBg: 'bg-rose-50 border-rose-200' },
  { module: 'keamanan', subTab: 'perizinan', title: 'Perizinan Santri', parent: 'Keamanan', desc: 'Izin pulang & keluar kompleks pesantren', icon: ShieldAlert, badgeColor: 'text-rose-700', badgeBg: 'bg-rose-50 border-rose-200' },
  { module: 'pengaturan', subTab: 'keamanan', title: 'Profil dan Akun', parent: 'Pengaturan', desc: 'Pengaturan kata sandi & profil user', icon: User, badgeColor: 'text-slate-700', badgeBg: 'bg-slate-100 border-slate-200' },
  { module: 'pengaturan', subTab: 'profil', title: 'Profil Pesantren', parent: 'Pengaturan', desc: 'Identitas, logo, & alamat pesantren', icon: Building, badgeColor: 'text-slate-700', badgeBg: 'bg-slate-100 border-slate-200' },
  { module: 'pengaturan', subTab: 'akses', title: 'Panel Akses & Otoritas', parent: 'Pengaturan', desc: 'Kelola hak akses & kewenangan peran', icon: Lock, badgeColor: 'text-slate-700', badgeBg: 'bg-slate-100 border-slate-200' },
];

interface HeaderProps {
  activeModule: string;
  activeSubTab?: string;
  onOpenDrawer: () => void;
  onOpenChat?: () => void;
  unreadChatCount?: number;
  hasMentionNotification?: boolean;
  pendingRegistrationsCount?: number;
  onOpenPendingModal?: () => void;
  santriList?: Santri[];
  onChangeModule?: (mod: string, subTab?: string) => void;
  onSelectSantri?: (santri: Santri) => void;
}

export default function Header({ 
  activeModule, 
  activeSubTab, 
  onOpenDrawer,
  onOpenChat,
  unreadChatCount = 0,
  hasMentionNotification = false,
  pendingRegistrationsCount = 0,
  onOpenPendingModal,
  santriList = [],
  onChangeModule,
  onSelectSantri
}: HeaderProps) {
  const [query, setQuery] = useState('');
  const [isOpenSearch, setIsOpenSearch] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close search overlay and notification dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsOpenSearch(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl+K / Cmd+K to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpenSearch(true);
      } else if (e.key === 'Escape') {
        setIsOpenSearch(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter Menus
  const filteredMenus = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return ALL_SEARCH_MENUS.filter(item => 
      item.title.toLowerCase().includes(q) ||
      item.parent.toLowerCase().includes(q) ||
      item.desc.toLowerCase().includes(q) ||
      item.subTab.toLowerCase().includes(q)
    );
  }, [query]);

  // Filter Santri
  const filteredSantri = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return santriList.filter(s => {
      const nama = s.nama ? s.nama.toLowerCase() : '';
      const nis = s.nis ? String(s.nis).toLowerCase() : '';
      const nisn = s.nisn ? String(s.nisn).toLowerCase() : '';
      const kamar = s.kamar ? s.kamar.toLowerCase() : '';
      const kelas = s.kelas ? s.kelas.toLowerCase() : '';
      const kota = (s.kabupaten || s.asal || '').toLowerCase();
      return nama.includes(q) || nis.includes(q) || nisn.includes(q) || kamar.includes(q) || kelas.includes(q) || kota.includes(q);
    }).slice(0, 8); // Top 8 santri
  }, [query, santriList]);

  const handleSelectMenu = (mod: string, subTab: string) => {
    if (onChangeModule) {
      onChangeModule(mod, subTab);
    }
    setIsOpenSearch(false);
    setQuery('');
  };

  const handleSelectSantriItem = (s: Santri) => {
    if (onSelectSantri) {
      onSelectSantri(s);
    } else if (onChangeModule) {
      onChangeModule('sekretaris', 'santri');
    }
    setIsOpenSearch(false);
    setQuery('');
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-slate-50/90 backdrop-blur-md border-b border-slate-200/60 shadow-2xs">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        
        {/* Header Layout */}
        <div className="flex h-16 w-full items-center justify-between gap-3">
          
          {/* Mobile Drawer Toggle (No Box) */}
          <button
            id="btn-open-drawer"
            onClick={onOpenDrawer}
            className="inline-flex md:hidden items-center justify-center p-2 text-slate-700 hover:text-emerald-700 active:scale-95 transition-all cursor-pointer rounded-xl hover:bg-slate-100"
            aria-label="Buka Menu"
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Long Aesthetic Global Search Box (Replaces Left Breadcrumb Title) */}
          <div ref={searchContainerRef} className="relative flex-1 max-w-2xl">
            <div className={`group relative flex items-center w-full rounded-2xl border transition-all duration-200 ${
              isOpenSearch 
                ? 'border-emerald-500 bg-white shadow-lg ring-2 ring-emerald-500/15' 
                : 'border-slate-200/90 bg-white/90 hover:border-emerald-300 hover:bg-white shadow-2xs'
            }`}>
              {/* Search Icon */}
              <div className="pl-3.5 pr-2 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-600 transition-colors">
                <Search className="h-4.5 w-4.5" />
              </div>

              {/* Input Field */}
              <input
                ref={inputRef}
                id="global-header-search-input"
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setIsOpenSearch(true);
                }}
                onFocus={() => setIsOpenSearch(true)}
                placeholder="Cari data santri, menu, atau halaman..."
                className="w-full bg-transparent py-2.5 pr-9 text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none"
              />

              {/* Clear / Shortcut Badge */}
              <div className="absolute right-2.5 flex items-center gap-1">
                {query ? (
                  <button
                    id="btn-clear-global-search"
                    onClick={() => {
                      setQuery('');
                      inputRef.current?.focus();
                    }}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                    title="Bersihkan Pencarian"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : (
                  <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-400 select-none">
                    <span className="text-[9px]">⌘</span>K
                  </kbd>
                )}
              </div>
            </div>

            {/* Aesthetic Search Results Dropdown Overlay */}
            {isOpenSearch && (
              <div 
                id="global-search-dropdown-overlay"
                className="absolute left-0 right-0 top-full mt-2 z-[100] max-h-[80vh] overflow-y-auto rounded-2xl border border-slate-200/90 bg-white/98 p-3 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150"
              >
                {!query.trim() ? (
                  /* Quick Shortcuts state when search input is empty */
                  <div className="p-2 text-left">
                    <div className="flex items-center gap-1.5 px-2 pb-2.5 text-[11px] font-bold tracking-wider text-slate-400 uppercase border-b border-slate-100">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Menu Pintas &amp; Navigasi Cepat</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2.5">
                      {ALL_SEARCH_MENUS.slice(0, 6).map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={`${item.module}-${item.subTab}`}
                            onClick={() => handleSelectMenu(item.module, item.subTab)}
                            className="flex items-center gap-3 p-2.5 rounded-xl border border-transparent hover:border-slate-200 hover:bg-slate-50 text-left transition-all cursor-pointer group"
                          >
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.badgeBg} ${item.badgeColor} group-hover:scale-105 transition-transform`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 transition-colors truncate">
                                {item.title}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {item.parent}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 px-2 flex items-center justify-between text-[11px] text-slate-400">
                      <span>💡 Ketik nama santri, NIS, atau nama menu untuk mencari.</span>
                      <span className="hidden sm:inline font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                        {santriList.length} Santri Terdaftar
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Results list when typing */
                  <div className="space-y-4 p-1 text-left">
                    {/* SECTION 1: MENUS */}
                    {filteredMenus.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between px-2 pb-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                          <span>Menu &amp; Halaman ({filteredMenus.length})</span>
                          <span className="text-[10px] text-emerald-600 font-semibold lowercase">Navigasi Langsung</span>
                        </div>
                        <div className="mt-1.5 space-y-1">
                          {filteredMenus.map((item) => {
                            const Icon = item.icon;
                            return (
                              <button
                                key={`search-menu-${item.module}-${item.subTab}`}
                                onClick={() => handleSelectMenu(item.module, item.subTab)}
                                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all text-left cursor-pointer group"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${item.badgeBg} ${item.badgeColor}`}>
                                    <Icon className="h-4.5 w-4.5" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                                        {item.title}
                                      </span>
                                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md border ${item.badgeBg} ${item.badgeColor}`}>
                                        {item.parent}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                      {item.desc}
                                    </p>
                                  </div>
                                </div>
                                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* SECTION 2: SANTRI DATA */}
                    {filteredSantri.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between px-2 pb-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                          <span>Data Santri ({filteredSantri.length})</span>
                          <span className="text-[10px] text-indigo-600 font-semibold lowercase">Klik untuk Detail</span>
                        </div>
                        <div className="mt-1.5 space-y-1">
                          {filteredSantri.map((s) => (
                            <button
                              key={`search-santri-${s.id}`}
                              onClick={() => handleSelectSantriItem(s)}
                              className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all text-left cursor-pointer group"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-9 w-9 shrink-0 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
                                  {renderSantriAvatar(s, "h-9 w-9")}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-800 transition-colors truncate">
                                      {s.nama}
                                    </span>
                                    {s.nis && (
                                      <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-semibold">
                                        NIS: {s.nis}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                                    <span>Kamar: {s.kamar || '-'}</span>
                                    <span>•</span>
                                    <span>Kelas: {s.kelas || '-'}</span>
                                    <span>•</span>
                                    <span className="capitalize">{s.gender || '-'}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  s.statusKeanggotaan === 'Aktif' || (s as any).status === 'Aktif'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}>
                                  {s.statusKeanggotaan || (s as any).status || 'Aktif'}
                                </span>
                                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* EMPTY STATE */}
                    {filteredMenus.length === 0 && filteredSantri.length === 0 && (
                      <div className="p-6 text-center">
                        <div className="h-10 w-10 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-2">
                          <Search className="h-5 w-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-700">Tidak ada hasil pencarian</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Tidak ditemukan menu atau santri dengan kata kunci <b className="text-slate-600">"{query}"</b>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Action Buttons: Chat & Bell Notifications (No Online Users Avatar Circles) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Message Chat Button */}
            <button 
              id="btn-messages-desktop"
              onClick={onOpenChat}
              className="relative flex items-center justify-center p-2 text-slate-700 hover:text-emerald-700 transition-all active:scale-95 cursor-pointer rounded-xl hover:bg-slate-100/80"
              title="Buka Obrolan Pengurus"
            >
              <MessageSquare className="h-5 w-5 sm:h-5.5 sm:w-5.5" />
              {hasMentionNotification ? (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-purple-600 text-white font-extrabold text-[10px] shadow-xs">
                  @
                </span>
              ) : unreadChatCount > 0 ? (
                <span className="absolute top-1 right-1 flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
              ) : null}
            </button>

            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button 
                id="btn-notifications-desktop"
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className={`relative flex items-center justify-center p-2 transition-colors rounded-xl cursor-pointer ${
                  showNotifDropdown ? 'bg-slate-100 text-purple-700' : 'text-slate-600 hover:text-emerald-600 hover:bg-slate-100/80'
                }`}
                title="Notifikasi Sistem"
              >
                <Bell className="h-5 w-5 sm:h-5.5 sm:w-5.5" />
                {pendingRegistrationsCount > 0 ? (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-600 text-white font-extrabold text-[10px] shadow-xs animate-pulse">
                    {pendingRegistrationsCount}
                  </span>
                ) : (
                  <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500"></span>
                  </span>
                )}
              </button>

              {/* Notification Popover Dropdown */}
              {showNotifDropdown && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-3.5 px-4 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-amber-400" />
                      <span className="font-bold text-xs text-white">Notifikasi Sistem</span>
                    </div>
                    {pendingRegistrationsCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-300 text-[10px] font-bold border border-rose-400/30">
                        {pendingRegistrationsCount} Pendaftaran Baru
                      </span>
                    )}
                  </div>

                  <div className="p-3 space-y-2.5 max-h-80 overflow-y-auto">
                    {/* Pending Registrations Card */}
                    {pendingRegistrationsCount > 0 ? (
                      <div className="p-3 rounded-xl bg-purple-50/80 border border-purple-200/80 flex flex-col gap-2">
                        <div className="flex items-start gap-2.5">
                          <div className="p-2 rounded-lg bg-purple-600 text-white shrink-0 mt-0.5">
                            <UserPlus className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-bold text-xs text-purple-950">
                              Pendaftaran Akun Baru ({pendingRegistrationsCount})
                            </p>
                            <p className="text-[11px] text-purple-800 mt-0.5 leading-relaxed">
                              Terdapat {pendingRegistrationsCount} permohonan akun pengurus baru yang membutuhkan persetujuan Superadmin.
                            </p>
                          </div>
                        </div>

                        {onOpenPendingModal && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowNotifDropdown(false);
                              onOpenPendingModal();
                            }}
                            className="w-full mt-1 py-1.5 px-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <span>Tinjau Pendaftar</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-slate-400">
                        <Bell className="h-8 w-8 mx-auto text-slate-300 mb-1.5" />
                        <p className="text-xs font-bold text-slate-600">Tidak ada pemberitahuan baru</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Semua sistem berjalan normal</p>
                      </div>
                    )}
                  </div>

                  <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                    <span className="text-[10px] text-slate-400 font-medium">SmartSantri Attaroqqy Notifications</span>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </header>
  );
}
