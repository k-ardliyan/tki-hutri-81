/**
 * BarcodeAll — QR semua tim snack.
 * - Download PNG: satu gambar grid semua tim.
 * - Download ZIP: satu file PNG per tim (PUTRA-1.png, PUTRA-2.png, dst).
 */
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import JSZip from 'jszip'
import { getTeamsWithMembers } from '../../server/functions/snack'

interface TeamBrief {
  id: number
  nama: string
  kode: string
}

const CELL = 340
const COLS = 3

export default function BarcodeAll() {
  const [teams, setTeams] = useState<TeamBrief[]>([])
  const [qrMap, setQrMap] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<'png' | 'zip' | null>(null)

  useEffect(() => {
    void getTeamsWithMembers().then((t) =>
      setTeams(t.map((x) => ({ id: x.id, nama: x.nama, kode: x.kode ?? '' }))),
    )
  }, [])

  // Generate QR per tim saat load
  useEffect(() => {
    if (teams.length === 0) return
    let cancelled = false
    const gen = async () => {
      const map: Record<string, string> = {}
      for (const t of teams) {
        if (!t.kode) continue
        try { map[t.kode] = await QRCode.toDataURL(t.kode, { width: 240, margin: 1 }) } catch { /* ignore */ }
      }
      if (!cancelled) setQrMap(map)
    }
    void gen()
    return () => { cancelled = true }
  }, [teams])

  const loadImg = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = reject
      i.src = src
    })

  const ensureQrMap = async (map: Record<string, string>) => {
    for (const t of teams) {
      if (t.kode && !map[t.kode]) {
        try { map[t.kode] = await QRCode.toDataURL(t.kode, { width: 240, margin: 1 }) } catch { /* ignore */ }
      }
    }
    return map
  }

  /** Draw satu sel kartu barcode (QR + kode + nama) ke canvas. */
  const drawCell = (ctx: CanvasRenderingContext2D, x: number, y: number, team: TeamBrief, qrImg: HTMLImageElement | null) => {
    // Border sel
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 2
    ctx.strokeRect(x + 10, y + 10, CELL - 20, CELL - 20)
    // QR
    if (qrImg) {
      const qs = 190
      ctx.drawImage(qrImg, x + (CELL - qs) / 2, y + 24, qs, qs)
    }
    // Label kode (PUTRA-1)
    ctx.fillStyle = '#0f172a'
    ctx.font = 'bold 30px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(team.kode, x + CELL / 2, y + CELL - 74)
    // Nama tim
    ctx.font = '16px Inter, sans-serif'
    ctx.fillStyle = '#64748b'
    ctx.fillText(team.nama, x + CELL / 2, y + CELL - 44)
  }

  const toBlob = (canvas: HTMLCanvasElement) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))

  /** Kartu barcode SVG lengkap (border + QR + kode + nama) — ringan & scalable. */
  const buildCardSvg = (team: TeamBrief, qrSvg: string): string => {
    // Extract viewBox QR (default 0 0 33 33) untuk scale ke 190px
    const vb = qrSvg.match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 33 33'
    const parts = vb.split(/\s+/).map(Number)
    const qrSize = parts[2] || 33
    const scale = 190 / qrSize
    const qrInner = qrSvg.replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '')
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${CELL}" height="${CELL}" viewBox="0 0 ${CELL} ${CELL}">
  <rect width="${CELL}" height="${CELL}" fill="#ffffff"/>
  <rect x="10" y="10" width="${CELL - 20}" height="${CELL - 20}" fill="none" stroke="#e2e8f0" stroke-width="2"/>
  <g transform="translate(${(CELL - 190) / 2}, 24) scale(${scale})">${qrInner}</g>
  <text x="${CELL / 2}" y="${CELL - 74}" font-family="Inter, sans-serif" font-size="30" font-weight="bold" fill="#0f172a" text-anchor="middle">${team.kode}</text>
  <text x="${CELL / 2}" y="${CELL - 44}" font-family="Inter, sans-serif" font-size="16" fill="#64748b" text-anchor="middle">${team.nama}</text>
</svg>`
  }

  /** Download satu PNG grid semua tim. */
  const downloadPng = async () => {
    if (teams.length === 0) return
    setBusy('png')
    try {
      const map = await ensureQrMap({ ...qrMap })
      const rows = Math.ceil(teams.length / COLS)
      const canvas = document.createElement('canvas')
      canvas.width = COLS * CELL
      canvas.height = rows * CELL
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const imgs = await Promise.all(
        teams.map(async (t) => (t.kode && map[t.kode] ? loadImg(map[t.kode]).catch(() => null) : null)),
      )
      teams.forEach((t, idx) => {
        const col = idx % COLS
        const row = Math.floor(idx / COLS)
        drawCell(ctx, col * CELL, row * CELL, t, imgs[idx])
      })

      const dataUrl = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = 'barcode-snack-semua-tim.png'
      a.click()
    } finally {
      setBusy(null)
    }
  }

  /** Download ZIP — per tim: PNG (kartu raster) + SVG (ringan, scalable). */
  const downloadZip = async () => {
    if (teams.length === 0) return
    setBusy('zip')
    try {
      const map = await ensureQrMap({ ...qrMap })
      const zip = new JSZip()

      for (const t of teams) {
        if (!t.kode) continue
        // SVG — QR murni, scalable, ukuran kecil
        try {
          const qrSvg = await QRCode.toString(t.kode, { type: 'svg', width: 240, margin: 1 })
          zip.file(`${t.kode}.svg`, buildCardSvg(t, qrSvg))
        } catch { /* ignore */ }
        // PNG — kartu raster (canvas)
        const qrImg = map[t.kode] ? await loadImg(map[t.kode]).catch(() => null) : null
        const canvas = document.createElement('canvas')
        canvas.width = CELL
        canvas.height = CELL
        const ctx = canvas.getContext('2d')
        if (!ctx) continue
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, CELL, CELL)
        drawCell(ctx, 0, 0, t, qrImg)
        const blob = await toBlob(canvas)
        if (blob) zip.file(`${t.kode}.png`, blob)
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'barcode-snack-per-tim.zip'
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="surface-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-xs font-bold text-slate-600">Barcode Semua Tim</p>
          <p className="text-[10px] text-slate-400">{teams.length} tim · PNG grid, atau ZIP per tim (PNG + SVG)</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void downloadZip()}
            disabled={teams.length === 0 || busy !== null}
            className="rounded-[var(--radius-md)] border border-brand-red/30 bg-brand-red/5 px-3 py-2 text-xs font-bold text-brand-red transition hover:bg-brand-red/10 active:scale-95 disabled:opacity-40"
          >
            {busy === 'zip' ? <i className="fa-solid fa-spinner fa-spin" /> : <><i className="fa-solid fa-file-zipper mr-1.5" />Download ZIP</>}
          </button>
          <button
            type="button"
            onClick={() => void downloadPng()}
            disabled={teams.length === 0 || busy !== null}
            className="rounded-[var(--radius-md)] bg-brand-red px-3 py-2 text-xs font-bold text-white transition hover:brightness-110 active:scale-95 disabled:opacity-40"
          >
            {busy === 'png' ? <i className="fa-solid fa-spinner fa-spin" /> : <><i className="fa-solid fa-download mr-1.5" />Download PNG</>}
          </button>
        </div>
      </div>

      {/* Grid preview */}
      {teams.length > 0 && (
        <div className="grid grid-cols-3 gap-2 px-4 pb-4 sm:grid-cols-4 lg:grid-cols-5">
          {teams.map((t) => (
            <div key={t.id} className="flex flex-col items-center rounded-[var(--radius-md)] border border-slate-200 bg-white px-2 py-2 text-center">
              <div className="flex h-16 w-16 items-center justify-center bg-white">
                {qrMap[t.kode] ? (
                  <img src={qrMap[t.kode]} alt={`Barcode ${t.kode}`} className="h-full w-full object-contain" />
                ) : (
                  <span className="text-[8px] text-slate-300">QR</span>
                )}
              </div>
              <p className="mt-1 text-[9px] font-extrabold text-brand-red">{t.kode}</p>
              <p className="truncate text-[8px] text-slate-400">{t.nama}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
