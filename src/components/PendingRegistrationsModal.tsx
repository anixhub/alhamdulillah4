import React, { useState } from 'react';
import { UserPlus, Check, X, Shield, Clock, AlertCircle, Sparkles } from 'lucide-react';

interface PendingAccount {
  id: string;
  username: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at?: string;
  createdAt?: string;
}

interface PendingRegistrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingList: PendingAccount[];
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onRefresh?: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Superadmin',
  sekretaris_putra: 'Sekretaris Putra',
  sekretaris_putri: 'Sekretaris Putri',
  bendahara_putra: 'Bendahara Putra',
  bendahara_putri: 'Bendahara Putri',
  humas_putra: 'Humas Putra',
  humas_putri: 'Humas Putri',
  pendidikan_putra: 'Pendidikan Putra',
  pendidikan_putri: 'Pendidikan Putri',
  keamanan_putra: 'Keamanan Putra',
  keamanan_putri: 'Keamanan Putri',
  pengurus: 'Pengurus Pesantren'
};

export default function PendingRegistrationsModal({
  isOpen,
  onClose,
  pendingList,
  onApprove,
  onReject,
}: PendingRegistrationsModalProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);

  if (!isOpen || pendingList.length === 0) return null;

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setProcessingId(id);
    try {
      if (action === 'approve') {
        await onApprove(id);
      } else {
        await onReject(id);
      }
    } catch (err) {
      console.error('Gagal memproses pendaftaran:', err);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-slate-800 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md text-amber-300 ring-1 ring-white/20">
              <UserPlus className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Pendaftaran Akun Baru</h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold ring-1 ring-amber-400/30">
                  {pendingList.length} Menunggu Persetujuan
                </span>
              </div>
              <p className="text-xs text-purple-100/80 mt-0.5">
                Ada permohonan akun pengurus baru yang memerlukan tindakan Superadmin.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Tutup & Proses Nanti"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-3.5 flex-1 bg-slate-50/50">
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-900">Pemberitahuan Pendaftar Akun</p>
              <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
                Anda dapat menyetujui atau menolak pendaftaran di bawah ini secara langsung, atau menutup modal ini untuk memprosesnya nanti dari menu <b>Pengaturan &gt; Kelola Akun Pengurus</b>.
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {pendingList.map((account) => {
              const isProcessing = processingId === account.id;
              const dateStr = account.created_at || account.createdAt;
              const formattedDate = dateStr 
                ? new Date(dateStr).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
                : 'Baru saja';

              const roleDisplay = ROLE_LABELS[account.role] || account.role || 'Pengurus';

              return (
                <div 
                  key={account.id}
                  className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-purple-200 transition-all"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-sm truncate">
                        {account.username}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-extrabold border border-purple-200/60 shrink-0">
                        {roleDisplay}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Daftar: {formattedDate}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleAction(account.id, 'reject')}
                      className="flex-1 sm:flex-initial px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Tolak</span>
                    </button>

                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleAction(account.id, 'approve')}
                      className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <Check className="h-4 w-4" />
                      <span>Setujui Akun</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <Shield className="h-3.5 w-3.5 text-purple-600" />
            <span>Hanya dapat dikelola oleh Superadmin</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            Tutup &amp; Nanti Saja
          </button>
        </div>
      </div>
    </div>
  );
}
