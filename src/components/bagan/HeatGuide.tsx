/**
 * HeatGuide — petunjuk pemakaian sistem sesi/heat dalam modal.
 * Context-aware: fase aktif = status bracket saat ini.
 * Copy simpel, ikon lucide, tanpa em-dash.
 */

import { HelpCircle, ListOrdered, Settings2, Swords, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { ResponsiveDialog } from '../ui/responsive-dialog';

export type HeatGuideStatus = 'setup' | 'draft' | 'berlangsung' | 'selesai';

const PHASES: Array<{ key: HeatGuideStatus; label: string; icon: typeof Settings2 }> = [
  { key: 'setup', label: 'Setup', icon: Settings2 },
  { key: 'draft', label: 'Review', icon: ListOrdered },
  { key: 'berlangsung', label: 'Input Hasil', icon: Swords },
  { key: 'selesai', label: 'Selesai', icon: Trophy },
];

const STEPS: Record<HeatGuideStatus, Array<{ title: string; desc?: string }>> = {
  setup: [
    { title: 'Cek daftar peserta', desc: 'Semua tim kategori ini ikut serta secara otomatis.' },
    {
      title: 'Atur tim maksimum / sesi',
      desc: 'Berapa tim bertanding dalam satu sesi. Contoh: 4 tim sekaligus. Lolos & final terisi otomatis, bisa diubah.',
    },
    {
      title: 'Atur tim lolos / sesi',
      desc: 'Berapa tim terbaik dari tiap sesi lanjut ke stage berikutnya. Contoh: 2 lolos dari 4 peserta.',
    },
    {
      title: 'Atur ukuran final',
      desc: 'Jumlah maksimum peserta di babak final. Contoh: 4 tim bertanding bareng di final.',
    },
    {
      title: 'Pilih seeding & mode hasil',
      desc: 'Acak / urutan daftar / serpentine / manual. Hasil bisa input peringkat, waktu, atau skor.',
    },
    {
      title: 'Cek preview lalu Generate',
      desc: 'Preview menunjukkan stage dan distribusi peserta (mis. 4-4-4 atau 4-3-3). Masih draft, bisa diulang.',
    },
  ],
  draft: [
    {
      title: 'Cek struktur stage',
      desc: 'Stage = babak (Penyisihan, Semifinal, Final). Sesi = pertandingan kelompok.',
    },
    {
      title: 'Pembagian peserta seimbang',
      desc: 'Sistem membagi peserta merata antar sesi dan menghindari sesi satu peserta.',
    },
    {
      title: 'Kurang cocok? Acak Ulang',
      desc: 'Pembagian sesi diganti. Bisa juga Hapus lalu generate ulang.',
    },
    {
      title: 'Publish Bagan',
      desc: 'Konfigurasi terkunci setelah publish. Hasil baru bisa diinput.',
    },
  ],
  berlangsung: [
    {
      title: 'Klik Input Hasil di sesi',
      desc: 'Isi peringkat tiap peserta (1 = tercepat/terbaik).',
    },
    {
      title: 'Peserta gugur / tidak hadir',
      desc: 'Isi peringkat, atau tandai DNS/DSQ/DNF untuk tim tanpa posisi.',
    },
    {
      title: 'Semua sesi stage selesai?',
      desc: 'Klik Finalisasi Stage untuk menghitung yang lolos dan membuka stage berikutnya.',
    },
    {
      title: 'Stage berikutnya menunggu',
      desc: 'Peserta otomatis masuk stage berikutnya dari peringkat sesi sebelumnya.',
    },
    {
      title: 'Salah input? Koreksi',
      desc: 'Jika stage berikutnya sudah dimainkan, koreksi membatalkan hasil berikutnya.',
    },
  ],
  selesai: [
    {
      title: 'Podium otomatis',
      desc: 'Juara 1/2/3 dihitung dari peringkat final. Final bisa berisi lebih dari 2 tim.',
    },
    {
      title: 'Isi hadiah',
      desc: 'Panel Hadiah Juara per peringkat. Hadiah ikut tampil di podium.',
    },
  ],
};

export function HeatGuide({ status }: { status: HeatGuideStatus }) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<HeatGuideStatus>(status);

  // Ikuti status bracket terbaru (mis. setelah publish → fase Input Hasil).
  useEffect(() => {
    setPhase(status);
  }, [status]);

  const steps = STEPS[phase];

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="rounded-xl font-bold"
        onClick={() => setOpen(true)}
      >
        <HelpCircle size={14} className="mr-1.5" />
        Cara Pakai
      </Button>

      <ResponsiveDialog
        open={open}
        onOpenChange={setOpen}
        title="Cara Pakai Bagan Sesi"
        description="Panduan singkat mengikuti tahap bagan. Pilih tahap lain untuk melihat langkahnya."
      >
        <div className="space-y-4 py-1">
          {/* Fase chips */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar rounded-xl bg-muted/40 p-1.5">
            {PHASES.map((p) => {
              const Icon = p.icon;
              const active = phase === p.key;
              const isCurrent = status === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPhase(p.key)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition ${
                    active
                      ? 'bg-brand-red text-white shadow-xs'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon size={12} />
                  {p.label}
                  {isCurrent && (
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-white/90' : 'bg-emerald-500'}`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Langkah */}
          <ol className="space-y-3">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-red/10 text-[11px] font-black text-brand-red">
                  {i + 1}
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-sm font-bold text-foreground">{s.title}</p>
                  {s.desc && (
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{s.desc}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </ResponsiveDialog>
    </>
  );
}
