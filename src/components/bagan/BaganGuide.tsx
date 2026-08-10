/**
 * BaganGuide — petunjuk pemakaian dalam modal (ResponsiveDialog).
 * Context-aware: fase aktif = status bracket saat ini; panitia bisa ganti fase.
 * Copy simpel, ikon lucide, tanpa em-dash.
 */

import { HelpCircle, ListOrdered, Settings2, Swords, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { ResponsiveDialog } from '../ui/responsive-dialog';

export type BaganGuideStatus = 'setup' | 'draft' | 'berlangsung' | 'selesai';

const PHASES: Array<{ key: BaganGuideStatus; label: string; icon: typeof Settings2 }> = [
  { key: 'setup', label: 'Setup', icon: Settings2 },
  { key: 'draft', label: 'Undian', icon: ListOrdered },
  { key: 'berlangsung', label: 'Input Hasil', icon: Swords },
  { key: 'selesai', label: 'Selesai', icon: Trophy },
];

const STEPS: Record<BaganGuideStatus, Array<{ title: string; desc?: string }>> = {
  setup: [
    { title: 'Cek daftar peserta', desc: 'Semua tim kategori ini ikut serta secara otomatis.' },
    {
      title: 'Pilih seeding',
      desc: 'Acak = undian. Urutan Daftar = sesuai nomor. Manual = atur posisi sendiri.',
    },
    {
      title: 'Atur Perebutan Juara 3',
      desc: 'Aktif = kalah semifinal bertanding dulu untuk juara 3.',
    },
    {
      title: 'Klik Generate Bagan',
      desc: 'Struktur dibuat otomatis sesuai jumlah peserta. Masih draft, bisa diulang.',
    },
  ],
  draft: [
    { title: 'Cek panel Undian Seed', desc: 'Slot 1-2 = Match 1. S = urutan undian.' },
    {
      title: 'Tim dapat BYE otomatis maju',
      desc: 'Peserta ganjil membuat sebagian tim langsung lolos tanpa bertanding.',
    },
    {
      title: 'Kurang cocok? Acak Ulang',
      desc: 'Undian diganti. Bisa juga Hapus lalu generate ulang dengan seeding Manual.',
    },
    { title: 'Publish Bagan', desc: 'Struktur terkunci setelah publish. Hasil baru bisa diinput.' },
  ],
  berlangsung: [
    { title: 'Klik Input Hasil di match berstatus Siap', desc: 'Pilih pemenang. Skor opsional.' },
    { title: 'Walkover / diskualifikasi', desc: 'Lewat menu Tipe Hasil di dialog input.' },
    { title: 'Pemenang otomatis lanjut', desc: 'Masuk ke match berikutnya tanpa aksi tambahan.' },
    { title: 'Match Menunggu', desc: 'Pemenang pertandingan sebelumnya belum diisi.' },
    { title: 'Status BYE', desc: 'Tim maju tanpa bertanding karena kekurangan peserta.' },
    {
      title: 'Salah input? Koreksi',
      desc: 'Jika match berikutnya sudah dimainkan, koreksi membatalkan hasil berikutnya.',
    },
  ],
  selesai: [
    {
      title: 'Podium otomatis',
      desc: 'Juara 1/2/3 dihitung dari hasil final dan perebutan juara 3.',
    },
    {
      title: 'Isi hadiah',
      desc: 'Panel Hadiah Juara per peringkat. Hadiah ikut tampil di podium.',
    },
  ],
};

export function BaganGuide({ status }: { status: BaganGuideStatus }) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<BaganGuideStatus>(status);

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
        title="Cara Pakai Bagan"
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
