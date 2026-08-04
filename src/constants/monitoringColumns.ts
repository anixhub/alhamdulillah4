import { Santri } from '../types';

export interface ColumnConfig {
  key: keyof Santri;
  label: string;
  description: string;
}

export const ALL_COLUMNS: ColumnConfig[] = [
  { key: 'nis', label: 'NIS', description: 'Nomor Induk Santri' },
  { key: 'gender', label: 'Gender', description: 'Jenis Kelamin' },
  { key: 'nik', label: 'NIK', description: 'Nomor Induk Kependudukan' },
  { key: 'nisn', label: 'NISN', description: 'Nomor Induk Siswa Nasional' },
  { key: 'nism', label: 'NISM', description: 'Nomor Induk Santri Madrasah' },
  { key: 'noKk', label: 'No KK', description: 'Nomor Kartu Keluarga' },
  { key: 'tempatLahir', label: 'Tpt Lahir', description: 'Tempat Lahir' },
  { key: 'tanggalLahir', label: 'Tgl Lahir', description: 'Tanggal Lahir' },
  { key: 'desa', label: 'Desa', description: 'Desa / Kelurahan' },
  { key: 'kecamatan', label: 'Kecamatan', description: 'Kecamatan' },
  { key: 'kabupaten', label: 'Kabupaten', description: 'Kabupaten / Kota' },
  { key: 'provinsi', label: 'Provinsi', description: 'Provinsi' },
  { key: 'pendidikanTerakhir', label: 'Pend. Terakhir', description: 'Pendidikan Terakhir' },
  { key: 'pendidikanFormal', label: 'Pend. Formal', description: 'Pendidikan Formal' },
  { key: 'namaAyah', label: 'Nama Ayah', description: 'Nama Kandung Ayah' },
  { key: 'nikAyah', label: 'NIK Ayah', description: 'NIK Ayah Kandung' },
  { key: 'pekerjaanAyah', label: 'Pekerjaan Ayah', description: 'Pekerjaan Ayah Kandung' },
  { key: 'pendidikanAyah', label: 'Pend. Ayah', description: 'Pendidikan Terakhir Ayah' },
  { key: 'namaIbu', label: 'Nama Ibu', description: 'Nama Kandung Ibu' },
  { key: 'nikIbu', label: 'NIK Ibu', description: 'NIK Ibu Kandung' },
  { key: 'pekerjaanIbu', label: 'Pekerjaan Ibu', description: 'Pekerjaan Ibu Kandung' },
  { key: 'pendidikanIbu', label: 'Pend. Ibu', description: 'Pendidikan Terakhir Ibu' },
  { key: 'statusKeanggotaan', label: 'Status Anggota', description: 'Status Keanggotaan' },
  { key: 'noHp', label: 'No HP', description: 'Nomor HP Aktif' },
  { key: 'tanggalMasuk', label: 'Tgl Masuk', description: 'Tanggal Masuk Pesantren' },
  { key: 'statusEmis', label: 'Status EMIS', description: 'Status Pendataan EMIS Kemenag' },
  { key: 'kelas', label: 'Kelas', description: 'Kelas Pendidikan Formal' },
  { key: 'kamar', label: 'Kamar', description: 'Asrama Kamar Santri' },
  { key: 'asal', label: 'Asal Sekolah', description: 'Asal Sekolah / Lembaga Sebelumnya' },
  { key: 'statusDomisili', label: 'Status Domisili', description: 'Status Mukim / Kampung' },
  { key: 'anakKe', label: 'Anak Ke', description: 'Anak nomor ke-berapa' },
  { key: 'dariBersaudara', label: 'Dari Bersaudara', description: 'Jumlah saudara kandung' },
  { key: 'alamat', label: 'Alamat', description: 'Alamat Jalan/Dusun' },
  { key: 'rt', label: 'RT', description: 'Rukun Tetangga' },
  { key: 'rw', label: 'RW', description: 'Rukun Warga' },
  { key: 'jarakRumah', label: 'Jarak Rumah', description: 'Jarak Rumah ke Pesantren (km)' },
  { key: 'nomorLemari', label: 'No Lemari', description: 'Nomor Lemari Inventaris' },
  { key: 'statusVerval', label: 'Status Verval', description: 'Status Verval Kemdikbud/Kemenag' },
  { key: 'tanggalKeluar', label: 'Tgl Keluar', description: 'Tanggal Keluar Pesantren' },
  { key: 'catatan', label: 'Catatan', description: 'Catatan Khusus Keterangan Santri' },
];

export const DEFAULT_TABLE_COLUMNS: (keyof Santri)[] = [
  'nis',
  'nik',
  'nisn',
  'statusKeanggotaan',
  'pendidikanTerakhir',
  'statusEmis',
  'pendidikanFormal'
];

export const DEFAULT_WAJIB_KEYS: (keyof Santri)[] = [
  'nis',
  'nik',
  'nisn',
  'statusKeanggotaan',
  'pendidikanTerakhir',
  'statusEmis',
  'pendidikanFormal',
  'namaAyah',
  'namaIbu',
  'desa',
  'kecamatan',
  'kabupaten',
  'provinsi'
];

export const isFieldFilled = (value: any): boolean => {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim() !== '' && value.trim() !== '-';
  if (typeof value === 'number') return !isNaN(value);
  return true;
};
