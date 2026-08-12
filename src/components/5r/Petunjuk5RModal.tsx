import {
  Award,
  BookOpen,
  CheckCircle2,
  Cigarette,
  CigaretteOff,
  HelpCircle,
  Layers,
  Lock,
  Paintbrush,
  Scale,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import { Button } from '../ui/button';
import { ResponsiveDialog } from '../ui/responsive-dialog';

interface Petunjuk5RModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant?: 'publik' | 'audit';
}

export function Petunjuk5RModal({ open, onOpenChange, variant = 'audit' }: Petunjuk5RModalProps) {
  const isPublik = variant === 'publik';

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {isPublik ? <Trophy size={16} /> : <ShieldCheck size={16} />}
          </div>
          <span>
            {isPublik ? 'Panduan Lomba Dekorasi & 5R' : 'Panduan Teknis Tim Juri & Auditor'}
          </span>
        </div>
      }
      description={
        isPublik
          ? 'Informasi kriteria lomba dekorasi ruangan, budaya 5R, dan mekanisme penentuan juara HUT RI ke-81.'
          : 'Instruksi pengisian checklist, aturan frekuensi audit, panduan skala nilai, dan formula sistem.'
      }
      footer={
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={() => onOpenChange(false)}
          className="w-full text-xs font-bold"
        >
          <CheckCircle2 size={14} className="mr-1.5" />
          Saya Mengerti
        </Button>
      }
    >
      {isPublik ? (
        /* ═══════════════════ TAMPILAN PUBLIK / PESERTA ═══════════════════ */
        <div className="space-y-4 text-xs text-foreground pb-1">
          {/* Section 1: Dekorasi */}
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-3.5 space-y-2 dark:bg-amber-950/20 dark:border-amber-900/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-amber-900 dark:text-amber-300">
                <Paintbrush size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Lomba Dekorasi Ruangan</span>
              </div>
              <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-extrabold text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
                Bobot 30%
              </span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Penilaian semarak kemerdekaan HUT RI ke-81 pada area kerja masing-masing ruangan.
            </p>
            <div className="rounded-xl bg-background/80 p-2.5 space-y-1 border border-amber-200/50 dark:border-amber-900/40">
              <p className="font-bold text-foreground text-[11px]">Kriteria Penilaian:</p>
              <ul className="text-muted-foreground space-y-0.5 list-disc pl-4 text-[11px]">
                <li>Kreativitas &amp; orisinalitas tema kemerdekaan HUT RI ke-81.</li>
                <li>Kerapian, keselarasan tata ruang, dan kenyamanan lingkungan kerja.</li>
                <li>Kekompakan serta partisipasi aktif seluruh anggota tim ruangan.</li>
              </ul>
            </div>
          </div>

          {/* Section 2: Budaya 5R */}
          <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-primary">
                <Layers size={15} className="shrink-0" />
                <span>Budaya Kerja 5R</span>
              </div>
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-extrabold text-primary">
                Bobot 70%
              </span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Audit rutin berkala untuk memastikan standar lingkungan kerja yang bersih, rapi, dan
              efisien.
            </p>
            <div className="grid grid-cols-5 gap-1.5 pt-1 text-center font-bold">
              <div className="rounded-lg bg-background p-1.5 border border-border">
                <p className="text-primary text-[10px]">Ringkas</p>
                <p className="text-[9px] text-muted-foreground font-normal">Pilah barang</p>
              </div>
              <div className="rounded-lg bg-background p-1.5 border border-border">
                <p className="text-primary text-[10px]">Rapi</p>
                <p className="text-[9px] text-muted-foreground font-normal">Tata letak</p>
              </div>
              <div className="rounded-lg bg-background p-1.5 border border-border">
                <p className="text-primary text-[10px]">Resik</p>
                <p className="text-[9px] text-muted-foreground font-normal">Kebersihan</p>
              </div>
              <div className="rounded-lg bg-background p-1.5 border border-border">
                <p className="text-primary text-[10px]">Rawat</p>
                <p className="text-[9px] text-muted-foreground font-normal">Standar kerja</p>
              </div>
              <div className="rounded-lg bg-background p-1.5 border border-border">
                <p className="text-primary text-[10px]">Rajin</p>
                <p className="text-[9px] text-muted-foreground font-normal">Disiplin diri</p>
              </div>
            </div>
          </div>

          {/* Section 3: Penentuan Juara */}
          <div className="rounded-2xl border border-border bg-card p-3.5 space-y-2">
            <div className="flex items-center gap-2 font-black text-foreground">
              <Scale size={15} className="text-amber-500 shrink-0" />
              <span>Penentuan Juara Rekapitulasi</span>
            </div>
            <div className="rounded-xl bg-muted/60 p-2.5 text-center font-mono font-bold text-xs text-foreground border border-border/80">
              Skor Akhir = (70% × Rata-rata 5R) + (30% × Rata-rata Dekorasi)
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Ruangan yang masuk dalam papan peringkat utama adalah ruangan yang telah dinilai
              lengkap (memiliki skor 5R dan Dekorasi).
            </p>
          </div>

          {/* Section 4: Predikat Nilai */}
          <div className="rounded-2xl border border-border bg-card p-3.5 space-y-2">
            <div className="flex items-center gap-2 font-black text-foreground">
              <Award size={15} className="text-rose-500 shrink-0" />
              <span>Kategori Predikat Nilai</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-300">
                <p className="font-extrabold text-xs">80 - 100</p>
                <p className="text-[10px] font-semibold mt-0.5">Sangat Baik</p>
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-2 text-amber-900 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-300">
                <p className="font-extrabold text-xs">60 - 79</p>
                <p className="text-[10px] font-semibold mt-0.5">Cukup</p>
              </div>
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-2 text-rose-900 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-300">
                <p className="font-extrabold text-xs">&lt; 60</p>
                <p className="text-[10px] font-semibold mt-0.5">Perlu Peningkatan</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ═══════════════════ TAMPILAN TIM AUDIT & ADMIN ═══════════════════ */
        <div className="space-y-4 text-xs text-foreground pb-1">
          {/* Section 1: Aturan Frekuensi */}
          <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-primary">
                <ShieldCheck size={15} className="shrink-0" />
                <span>1. Aturan Frekuensi &amp; Akses Form</span>
              </div>
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-extrabold text-primary">
                Wajib Auditor
              </span>
            </div>
            <div className="space-y-2 text-[11px] text-muted-foreground">
              <div className="rounded-xl bg-background p-2.5 border border-border space-y-1">
                <p className="font-bold text-foreground">Checklist 5R (Mingguan):</p>
                <p>
                  Dinilai <strong>1 kali per ruangan per minggu</strong> oleh masing-masing auditor.
                  Form pada minggu aktif terbuka, sedangkan minggu lampau dan depan terkunci
                  otomatis.
                </p>
              </div>
              <div className="rounded-xl bg-background p-2.5 border border-border space-y-1">
                <p className="font-bold text-foreground">Form Lomba Dekorasi (Sekali Total):</p>
                <p>
                  Dinilai <strong>1 kali saja per ruangan</strong> oleh masing-masing juri/auditor
                  selama seluruh masa perlombaan berlangsung (bebas di minggu kapan pun).
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Pemetaan Form 5R Berdasarkan Area */}
          <div className="rounded-2xl border border-border bg-card p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-foreground">
                <BookOpen size={15} className="text-primary shrink-0" />
                <span>2. Rekomendasi Form 5R (Area Luar vs Dalam)</span>
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                Panduan Form
              </span>
            </div>
            <div className="space-y-2 text-[11px]">
              <div className="rounded-xl border border-amber-300/70 bg-amber-50/60 p-2.5 space-y-1 dark:bg-amber-950/20 dark:border-amber-900/40">
                <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-300">
                  <Cigarette size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Area Luar / Terbuka → Form Office Smoking</span>
                </div>
                <p className="text-muted-foreground">
                  Digunakan untuk <strong>IT Luar</strong>. Memuat kriteria tambahan terkait
                  pengelolaan asbak, pembuangan puntung rokok, dan ventilasi asap.
                </p>
              </div>

              <div className="rounded-xl border border-emerald-300/70 bg-emerald-50/60 p-2.5 space-y-1 dark:bg-emerald-950/20 dark:border-emerald-900/40">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900 dark:text-emerald-300">
                  <CigaretteOff
                    size={13}
                    className="text-emerald-600 dark:text-emerald-400 shrink-0"
                  />
                  <span>Area Dalam / Ber-AC → Form Office Non-Smoking</span>
                </div>
                <p className="text-muted-foreground">
                  Digunakan untuk{' '}
                  <strong>
                    CS &amp; Implementator, Hardware/Finance/Legal, Sales Marketing, dan IT Dalam
                  </strong>
                  . Memuat standar kebersihan dan kerapian ruang kerja ber-AC bebas asap rokok.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Panduan Skala Nilai 1-5 */}
          <div className="rounded-2xl border border-border bg-card p-3.5 space-y-2">
            <div className="flex items-center gap-2 font-black text-foreground">
              <Award size={15} className="text-amber-500 shrink-0" />
              <span>3. Panduan Skala Nilai Objektif (1 s/d 5)</span>
            </div>

            <div className="space-y-1 text-[11px]">
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-2.5 py-1.5">
                <span className="font-bold text-foreground">1 - Tidak Ada / Sangat Buruk</span>
                <span className="text-muted-foreground">
                  Tidak ada kepatuhan / temuan mayor berat (0-20%)
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-2.5 py-1.5">
                <span className="font-bold text-foreground">2 - Sangat Kurang</span>
                <span className="text-muted-foreground">
                  Upaya minim, banyak temuan ketidaksesuaian (21-40%)
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-2.5 py-1.5">
                <span className="font-bold text-foreground">3 - Kurang</span>
                <span className="text-muted-foreground">
                  Memenuhi standar dasar, belum konsisten (41-60%)
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-2.5 py-1.5">
                <span className="font-bold text-foreground">4 - Baik</span>
                <span className="text-muted-foreground">
                  Rapi, bersih, dan konsisten diterapkan (61-80%)
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-2.5 py-1.5 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/40">
                <span className="font-bold text-emerald-700 dark:text-emerald-300">
                  5 - Sangat Baik / Sempurna
                </span>
                <span className="text-emerald-800/80 dark:text-emerald-400">
                  Benchmark teladan bagi ruangan lain (81-100%)
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Mekanisme Draft & Periode */}
          <div className="rounded-2xl border border-border bg-card p-3.5 space-y-2">
            <div className="flex items-center gap-2 font-black text-foreground">
              <Lock size={15} className="text-rose-500 shrink-0" />
              <span>4. Sistem Draft &amp; Validasi Periode</span>
            </div>
            <ul className="text-muted-foreground space-y-1 list-disc pl-4 text-[11px] leading-relaxed">
              <li>
                <strong>Draft Otomatis</strong>: Setiap pilihan nilai tersimpan di penyimpanan
                browser lokal sehingga aman jika koneksi terputus.
              </li>
              <li>
                <strong>Validasi Nama Auditor</strong>: Nama penilai otomatis terisi dari akun sesi
                login Anda.
              </li>
              <li>
                <strong>Batas Akhir (Deadline)</strong>: Pengisian otomatis terkunci jika masa
                penilaian telah melewati batas tanggal akhir yang diatur admin.
              </li>
            </ul>
          </div>

          {/* Section 5: Formula Agregasi */}
          <div className="rounded-2xl border border-border bg-card p-3.5 space-y-2">
            <div className="flex items-center gap-2 font-black text-foreground">
              <Scale size={15} className="text-primary shrink-0" />
              <span>5. Formula Agregasi Skor Sistem</span>
            </div>
            <div className="rounded-xl bg-muted/60 p-2.5 text-center font-mono font-bold text-xs text-foreground border border-border/80">
              Skor Total = (70% × Rerata 5R) + (30% × Rerata Dekorasi)
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Nilai 5R ruangan dihitung dari rata-rata seluruh form 5R yang diisi oleh seluruh
              auditor. Nilai Dekorasi dihitung dari rata-rata skor seluruh juri.
            </p>
          </div>
        </div>
      )}
    </ResponsiveDialog>
  );
}
