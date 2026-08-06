/**
 * GelangPrint — kartu gelang per anggota tim, real-like CSS bracelet.
 * QR = kode tim (satu QR, dicetak per orang).
 * Warna kategori: putra=brand-red, putri=rose-500, panitia=amber-500.
 * A4: grid kartu, auto-fit. Print via browser Ctrl+P.
 */
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import type { SnackTeam } from '../../server/functions/snack'

const KATEGORI_COLORS: Record<string, { strip: string; bg: string; ring: string; text: string }> = {
  putra: { strip: 'bg-brand-red', bg: 'from-brand-red/5 to-white', ring: 'border-brand-red/30', text: 'text-brand-red' },
  putri: { strip: 'bg-rose-500', bg: 'from-rose-50 to-white', ring: 'border-rose-300', text: 'text-rose-600' },
  panitia: { strip: 'bg-amber-500', bg: 'from-amber-50 to-white', ring: 'border-amber-300', text: 'text-amber-600' },
}

function getColor(kategori: string) {
  return KATEGORI_COLORS[kategori] ?? KATEGORI_COLORS.putra
}

interface GelangPrintProps {
  team: SnackTeam
}

export default function GelangPrint({ team }: GelangPrintProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const colors = getColor(team.kategori)

  useEffect(() => {
    let cancelled = false
    if (!team.kode) return
    QRCode.toDataURL(team.kode, { width: 200, margin: 1 })
      .then((url) => { if (!cancelled) setQrDataUrl(url) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [team.kode])

  return (
    <div>
      {/* Print header (hidden on screen, shown on print) */}
      <div className="mb-3 hidden items-center justify-between print:flex">
        <p className="text-lg font-extrabold text-slate-900">Gelang Snack — {team.nama}</p>
        <p className="text-xs text-slate-500">HUT RI ke-81 · PT TKI x PT FTP</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-3 print:gap-2">
        {team.members.map((m) => (
          <div
            key={m.employeeId}
            className={`relative overflow-hidden rounded-2xl border-2 ${colors.ring} bg-gradient-to-b ${colors.bg} print:border print:break-inside-avoid print:shadow-none`}
          >
            {/* Strip warna kategori (atas) */}
            <div className={`${colors.strip} h-1.5 w-full`} />

            {/* Lubang gelang (ring hole) */}
            <div className="flex justify-center -mt-0">
              <div className={`h-4 w-4 rounded-full border-2 ${colors.ring} bg-white`} />
            </div>

            {/* Konten gelang */}
            <div className="flex flex-col items-center gap-1 px-3 pt-1 pb-3 text-center">
              {/* Badge kategori */}
              <span className={`rounded-full bg-white/80 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider ${colors.text} ${colors.ring} border`}>
                {team.kategori === 'panitia' ? 'PANITIA' : team.nama}
              </span>

              {/* QR */}
              <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-white p-1 shadow-sm">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt={`QR ${team.kode}`} className="h-full w-full object-contain" />
                ) : (
                  <span className="text-[9px] text-slate-300">QR</span>
                )}
              </div>

              {/* Kode tim */}
              <p className={`text-[9px] font-bold uppercase tracking-wider ${colors.text}`}>{team.kode}</p>

              {/* Nama anggota */}
              <p className="text-sm font-bold leading-tight text-slate-900">{m.nama}</p>

              {/* Divisi + NIP */}
              <p className="text-[9px] text-slate-400">{m.divisi ?? ''}{m.nip ? ` · ${m.nip}` : ''}</p>

              {/* Event label */}
              <p className="text-[7px] font-semibold text-slate-300 uppercase tracking-widest">HUT RI ke-81</p>
            </div>
          </div>
        ))}
      </div>

      {/* Print button (screen only) */}
      <div className="mt-4 flex gap-2 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="flex-1 cursor-pointer rounded-[var(--radius-md)] bg-brand-red px-4 py-3 text-sm font-bold text-white shadow-lg shadow-brand-red/15 transition hover:brightness-110 active:scale-[0.98]"
        >
          <i className="fa-solid fa-print mr-1.5" />
          Cetak Gelang
        </button>
      </div>
    </div>
  )
}
