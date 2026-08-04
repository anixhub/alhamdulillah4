import { Santri, Lembaga, Kelas } from '../types';

export function formatBigDigit(val: any): string {
  if (val === undefined || val === null || val === '') return '';
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed === '-') return '-';
    if (/^\d+$/.test(trimmed)) {
      return trimmed;
    }
    if (trimmed.includes('e') || trimmed.includes('E')) {
      try {
        return BigInt(Math.round(Number(trimmed))).toString();
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }
  if (typeof val === 'number') {
    try {
      return BigInt(Math.round(val)).toString();
    } catch {
      return String(val);
    }
  }
  return String(val).trim();
}

export function mergeIdField(localRaw: any, remoteRaw: any): string {
  const localVal = formatBigDigit(localRaw);
  const remoteVal = formatBigDigit(remoteRaw);
  
  const localValid = Boolean(localVal && localVal !== '-');
  const remoteValid = Boolean(remoteVal && remoteVal !== '-');

  if (localValid && remoteValid) {
    return localVal.length >= remoteVal.length ? localVal : remoteVal;
  }
  if (localValid) return localVal;
  if (remoteValid) return remoteVal;
  return localVal || remoteVal || '';
}

export function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

export const PENDIDIKAN_OPTIONS = [
  'Tidak Sekolah',
  'SD/MI',
  'SMP/MTs',
  'SMA/MA/MAK',
  'D1',
  'D2',
  'D3',
  'D4',
  'S1',
  'S2',
  'S3',
  'Lainnya'
] as const;

export function normalizePendidikan(val?: string | null): string {
  if (!val || val === '-' || String(val).trim() === '') {
    return 'Tidak Sekolah';
  }

  const raw = String(val).trim();
  const lower = raw.toLowerCase();

  if (
    lower === 'tidak sekolah' ||
    lower === 'belum sekolah' ||
    lower === 'tidak/belum sekolah' ||
    lower === 'tanpa sekolah' ||
    lower === 'tidak'
  ) {
    return 'Tidak Sekolah';
  }

  // Exact option matches
  const matchedExact = PENDIDIKAN_OPTIONS.find(opt => opt.toLowerCase() === lower);
  if (matchedExact) return matchedExact;

  // SD / MI
  if (
    lower === 'sd' ||
    lower === 'mi' ||
    lower === 'sd/mi' ||
    lower === 'sd-mi' ||
    lower.includes('sekolah dasar') ||
    lower.includes('madrasah ibtidaiyah')
  ) {
    return 'SD/MI';
  }

  // SMP / MTs
  if (
    lower === 'smp' ||
    lower === 'mts' ||
    lower === 'smp/mts' ||
    lower === 'smp-mts' ||
    lower.includes('sekolah menengah pertama') ||
    lower.includes('madrasah tsanawiyah')
  ) {
    return 'SMP/MTs';
  }

  // SMA / MA / MAK / SMK / SLTA
  if (
    lower === 'sma' ||
    lower === 'ma' ||
    lower === 'mak' ||
    lower === 'smk' ||
    lower === 'slta' ||
    lower === 'aliyah' ||
    lower === 'sma/ma/mak' ||
    lower === 'sma/ma/smk' ||
    lower === 'sma/ma' ||
    lower.includes('sekolah menengah atas') ||
    lower.includes('madrasah aliyah') ||
    lower.includes('sekolah menengah kejuruan')
  ) {
    return 'SMA/MA/MAK';
  }

  // Diplomas & Degrees
  if (lower === 'd1' || lower === 'd-1' || lower === 'diploma 1') return 'D1';
  if (lower === 'd2' || lower === 'd-2' || lower === 'diploma 2') return 'D2';
  if (lower === 'd3' || lower === 'd-3' || lower === 'diploma 3') return 'D3';
  if (lower === 'd4' || lower === 'd-4' || lower === 'diploma 4') return 'D4';
  if (lower === 's1' || lower === 's-1' || lower.includes('sarjana')) return 'S1';
  if (lower === 's2' || lower === 's-2' || lower.includes('magister') || lower.includes('pascasarjana')) return 'S2';
  if (lower === 's3' || lower === 's-3' || lower.includes('doktor')) return 'S3';

  if (lower === 'lainnya' || lower === 'lain-lain' || lower === 'other') {
    return 'Lainnya';
  }

  return 'Lainnya';
}

export function formatDateDDMMYYYY(dateVal?: string | number | Date | null): string {
  if (!dateVal || dateVal === '-' || String(dateVal).trim() === '') return '-';
  const str = String(dateVal).trim();

  // If already in DD-MM-YYYY format (e.g. 25-07-2026 or 05-08-2010 or 5-8-2010)
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(str)) {
    const parts = str.split('-');
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${day}-${month}-${year}`;
  }

  // If in YYYY-MM-DD format (e.g. 2026-07-25)
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(str)) {
    const parts = str.split('-');
    const year = parts[0];
    const month = parts[1].padStart(2, '0');
    const day = parts[2].padStart(2, '0');
    return `${day}-${month}-${year}`;
  }

  // If in DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const parts = str.split('/');
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${day}-${month}-${year}`;
  }

  // If in YYYY/MM/DD
  if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(str)) {
    const parts = str.split('/');
    const year = parts[0];
    const month = parts[1].padStart(2, '0');
    const day = parts[2].padStart(2, '0');
    return `${day}-${month}-${year}`;
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  return str;
}

/**
 * Formats a class string or formal education string to extract ONLY the clean class name.
 * Example:
 * - "MTs SA Miftahul Ulum - VII Tsanawiyah A" => "VII Tsanawiyah A"
 * - "MA Miftahul Ulum - Calon Peserta Didik" => "Calon Peserta Didik"
 */
export function formatClassNameOnly(rawClassOrFormal?: string | null): string {
  if (!rawClassOrFormal || rawClassOrFormal.trim() === '' || rawClassOrFormal === 'TIDAK TERDAFTAR' || rawClassOrFormal === 'Belum / Non-Formal') {
    return 'TIDAK TERDAFTAR';
  }
  const str = rawClassOrFormal.trim();
  if (str.includes(' - ')) {
    const parts = str.split(' - ');
    const clsPart = parts.slice(1).join(' - ').trim();
    if (clsPart) return clsPart;
  }
  return str;
}

export function demoteSantriToCalonPesertaDidik(
  santri: Santri,
  lembagasList?: Lembaga[],
  kelasList?: Kelas[]
): Santri {
  const currentClasses = santri.kelas
    ? santri.kelas.split(',').map(x => x.trim()).filter(Boolean)
    : [];

  // Identify formal lembagas
  const formalLembagaIds: string[] = [];
  let formalLembagas: Lembaga[] = [];
  if (lembagasList) {
    formalLembagas = lembagasList.filter(l => {
      if (l.jenis) return l.jenis === 'Formal';
      const lower = (l.nama || '').toLowerCase();
      return !lower.includes('madin') && !lower.includes('diniyah') && !lower.includes('tpq') &&
             !lower.includes('tahfidz') && !lower.includes('pondok') && !lower.includes('kitab') &&
             !lower.includes('internal');
    });
    formalLembagaIds.push(...formalLembagas.map(l => String(l.id)));
  }

  // Identify formal class names
  const formalClassNamesSet = new Set<string>();
  if (kelasList && formalLembagaIds.length > 0) {
    kelasList.forEach(k => {
      const lemId = String(k.lembagaId || (k as any).lembaga_id || '');
      if (formalLembagaIds.includes(lemId) && k.nama) {
        formalClassNamesSet.add(k.nama.trim().toLowerCase());
      }
    });
  }

  // Filter out formal classes & old default labels from currentClasses
  const nonFormalClasses = currentClasses.filter(c => {
    const lower = c.toLowerCase();
    if (lower === 'tanpa kelas' || lower === 'calon peserta didik' || lower === 'calon pelajar') {
      return false;
    }
    if (formalClassNamesSet.has(lower)) {
      return false;
    }
    return true;
  });

  // Combine 'Calon Peserta Didik' + non-formal classes
  const newClasses = Array.from(new Set(['Calon Peserta Didik', ...nonFormalClasses]));
  const finalKelasString = newClasses.join(', ');

  // Update pendidikanFormal
  let newFormal = santri.pendidikanFormal;
  if (santri.pendidikanFormal && santri.pendidikanFormal.trim() !== '') {
    const parts = santri.pendidikanFormal.split(' - ');
    const lemName = parts[0].trim();
    if (lemName) {
      newFormal = `${lemName} - Calon Peserta Didik`;
    } else {
      newFormal = 'Calon Peserta Didik';
    }
  } else if (formalLembagas.length > 0) {
    let matchedLem: Lembaga | undefined;
    if (kelasList && currentClasses.length > 0) {
      for (const cName of currentClasses) {
        const foundCls = kelasList.find(k => k.nama.trim().toLowerCase() === cName.toLowerCase());
        if (foundCls) {
          const lemId = String(foundCls.lembagaId || (foundCls as any).lembaga_id || '');
          matchedLem = formalLembagas.find(l => String(l.id) === lemId);
          if (matchedLem) break;
        }
      }
    }
    if (matchedLem) {
      newFormal = `${matchedLem.nama} - Calon Peserta Didik`;
    }
  }

  return {
    ...santri,
    statusEmis: 'Belum',
    kelas: finalKelasString,
    pendidikanFormal: newFormal || '',
  };
}

// Smart file reader & image processor for documents and photos
// Threshold: 5 MB (5 * 1024 * 1024 bytes)
const FIVE_MB = 5 * 1024 * 1024;

export function processUploadedFile(file: File): Promise<{ originalUrl: string; thumbnailUrl: string }> {
  return new Promise((resolve, reject) => {
    // Non-image files (like PDF)
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        resolve({ originalUrl: url, thumbnailUrl: url });
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const rawBase64 = event.target?.result as string;

        // 1. Generate Thumbnail (always optimized for fast browser profile loading, e.g. max 400x400)
        const thumbCanvas = document.createElement('canvas');
        let tW = img.width;
        let tH = img.height;
        const maxThumb = 400;
        if (tW > tH) {
          if (tW > maxThumb) {
            tH = Math.round((tH * maxThumb) / tW);
            tW = maxThumb;
          }
        } else {
          if (tH > maxThumb) {
            tW = Math.round((tW * maxThumb) / tH);
            tH = maxThumb;
          }
        }
        thumbCanvas.width = tW;
        thumbCanvas.height = tH;
        const tCtx = thumbCanvas.getContext('2d');
        let thumbnailUrl = rawBase64;
        if (tCtx) {
          tCtx.drawImage(img, 0, 0, tW, tH);
          thumbnailUrl = thumbCanvas.toDataURL('image/jpeg', 0.80);
        }

        // 2. Generate Original file URL (No compression if < 5MB, light compression if >= 5MB)
        if (file.size < FIVE_MB) {
          // Keep raw original without quality degradation
          resolve({ originalUrl: rawBase64, thumbnailUrl });
        } else {
          // Light compression so file becomes < 5MB while preserving full clarity
          const origCanvas = document.createElement('canvas');
          let oW = img.width;
          let oH = img.height;
          const maxOrigDimension = 3840; // 4K max ceiling
          if (oW > maxOrigDimension || oH > maxOrigDimension) {
            if (oW > oH) {
              oH = Math.round((oH * maxOrigDimension) / oW);
              oW = maxOrigDimension;
            } else {
              oW = Math.round((oW * maxOrigDimension) / oH);
              oH = maxOrigDimension;
            }
          }
          origCanvas.width = oW;
          origCanvas.height = oH;
          const oCtx = origCanvas.getContext('2d');
          if (oCtx) {
            oCtx.drawImage(img, 0, 0, oW, oH);
            const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
            const compressedOriginal = origCanvas.toDataURL(mime, 0.92); // Light high-quality compression
            resolve({ originalUrl: compressedOriginal, thumbnailUrl });
          } else {
            resolve({ originalUrl: rawBase64, thumbnailUrl });
          }
        }
      };
      img.onerror = (err) => reject(err);
      img.src = event.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export function compressImage(file: File, maxWidth = 2048, maxHeight = 2048, quality = 0.88): Promise<string> {
  return new Promise((resolve, reject) => {
    processUploadedFile(file)
      .then((res) => resolve(res.thumbnailUrl || res.originalUrl))
      .catch((err) => reject(err));
  });
}

export function hasValidRoom(kamarStr?: string | null): boolean {
  if (!kamarStr) return false;
  const clean = kamarStr.trim().toLowerCase();
  if (
    clean === '' ||
    clean === '-' ||
    clean === 'tanpa kamar' ||
    clean === 'belum ada' ||
    clean === 'belum ada kamar' ||
    clean === 'belum dapat' ||
    clean === 'belum dapat kamar' ||
    clean === 'belum diatur' ||
    clean === 'belum diatur kamar' ||
    clean === 'tidak ada' ||
    clean === 'non-asrama'
  ) {
    return false;
  }
  return true;
}

export function parseCatatanInvalidParts(catatan?: string): { prefixNote: string; invalidReason: string; suffixNote: string } {
  if (!catatan || !catatan.trim()) {
    return { prefixNote: '', invalidReason: 'Emis Invalid: Status EMIS Invalid', suffixNote: '' };
  }

  const str = catatan.trim();
  const parts = str.split('|').map(p => p.trim());
  
  // Find index of part that starts with "emis invalid:"
  const invalidIdx = parts.findIndex(p => p.toLowerCase().startsWith('emis invalid:'));

  if (invalidIdx !== -1) {
    const prefixNote = parts.slice(0, invalidIdx).filter(Boolean).join(' | ');
    const invalidReason = parts[invalidIdx];
    const suffixNote = parts.slice(invalidIdx + 1).filter(Boolean).join(' | ');
    return { prefixNote, invalidReason, suffixNote };
  }

  // If entire string doesn't have "emis invalid:", return default invalid reason and put rest in suffix
  if (str.toLowerCase().startsWith('emis invalid:')) {
    return { prefixNote: '', invalidReason: str, suffixNote: '' };
  }

  return {
    prefixNote: '',
    invalidReason: `Emis Invalid: ${str}`,
    suffixNote: ''
  };
}

export function formatCatatanParts(prefixNote: string, invalidReason: string, suffixNote: string): string {
  let inv = invalidReason.trim();
  if (!inv) {
    inv = 'Emis Invalid: Status EMIS Invalid';
  } else if (!inv.toLowerCase().startsWith('emis invalid:')) {
    inv = `Emis Invalid: ${inv}`;
  }

  const parts = [prefixNote.trim(), inv, suffixNote.trim()].filter(Boolean);
  return parts.join(' | ');
}

export function parseCatatanInvalid(catatan?: string): { invalidReason: string; extraNote: string } {
  const { prefixNote, invalidReason, suffixNote } = parseCatatanInvalidParts(catatan);
  const extraNote = [prefixNote, suffixNote].filter(Boolean).join(' | ');
  return { invalidReason, extraNote };
}

export function formatCatatanWithInvalid(invalidReason: string, extraNote?: string): string {
  return formatCatatanParts('', invalidReason, extraNote || '');
}
