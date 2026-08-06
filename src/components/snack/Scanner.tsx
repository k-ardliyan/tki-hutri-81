/**
 * Scanner — wrapper html5-qrcode (browser-only, dynamic import).
 *
 * Key design decisions:
 * - SIMPAN MediaStream langsung → stop track = pasti mati kamera.
 * - JANGAN rely on html5-qrcode stop/clear untuk release kamera.
 * - mountedRef guard: kalau unmount saat async init, jangan start kamera.
 * - Instance baru setiap mount (jangan reuse).
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

interface CameraDevice {
  id: string
  label: string
}

export interface ScannerHandle {
  /** Resume scanning setelah parent menampilkan modal "kode tidak dikenal". */
  resume: () => Promise<void>
}

interface ScannerProps {
  /** Return true kalau kode dikenali (parent lanjut), false kalau tidak (parent show modal). */
  onScan: (kode: string) => Promise<boolean> | boolean
  onError?: (err: string) => void
}

const isMobile = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent))

const DECODE_COOLDOWN_MS = 1200

const Scanner = forwardRef<ScannerHandle, ScannerProps>(function Scanner({ onScan, onError }, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const instRef = useRef<Html5Qrcode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)  // simpan stream langsung
  const mountedRef = useRef(true)
  const cooldownRef = useRef(0)
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  const [starting, setStarting] = useState(true)
  const [camError, setCamError] = useState<string | null>(null)
  const [manual, setManual] = useState('')
  const [cameras, setCameras] = useState<CameraDevice[]>([])
  const [currentCamIdx, setCurrentCamIdx] = useState(0)
  const [mobile, setMobile] = useState(false)

  /**
   * Stop kamera — PASTI mati.
   * Strategy: stop MediaStream tracks langsung (bukan rely on html5-qrcode).
   */
  const killCamera = useCallback(() => {
    // 1. Stop stream langsung — ini yang bikin lampu kamera mati
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    // 2. Stop instance html5-qrcode (opsional, untuk cleanup internal state)
    if (instRef.current) {
      try { instRef.current.stop().catch(() => {}) } catch { /* ignore */ }
      instRef.current = null
    }
    // 3. Clear container — hapus video element
    if (containerRef.current) {
      containerRef.current.querySelectorAll('video').forEach((v) => {
        v.srcObject = null
      })
      containerRef.current.innerHTML = ''
    }
  }, [])

  const startScanner = useCallback(async (camIdx?: number) => {
    if (typeof window === 'undefined') return

    killCamera()
    if (!mountedRef.current) return

    try {
      const mod = await import('html5-qrcode')
      if (!mountedRef.current) return
      const Html5QrcodeClass: typeof Html5Qrcode = mod.Html5Qrcode
      const fmt = mod.Html5QrcodeSupportedFormats as typeof Html5QrcodeSupportedFormats

      const devices = await Html5QrcodeClass.getCameras()
      if (!mountedRef.current) return
      const camList: CameraDevice[] = devices.map((d) => ({ id: d.id, label: d.label || `Kamera ${d.id}` }))
      setCameras(camList)

      if (!containerRef.current || !mountedRef.current) return

      // Selalu buat instance baru
      instRef.current = new Html5QrcodeClass('snack-qr-reader', { formatsToSupport: [fmt.QR_CODE] } as never)
      const inst = instRef.current

      const idx = camIdx ?? 0
      const cam = camList[idx]
      const cameraConfig = mobile
        ? { facingMode: idx % 2 === 0 ? 'environment' : 'user' }
        : cam ? cam.id : { facingMode: 'environment' }

      await inst.start(
        cameraConfig,
        { fps: 10, qrbox: { width: 230, height: 230 } },
        async (decodedText: string) => {
          const code = decodedText.trim().toUpperCase()
          if (cooldownRef.current > Date.now()) return
          cooldownRef.current = Date.now() + DECODE_COOLDOWN_MS

          // Pause — jangan reset apapun, stream masih hidup
          try { await inst.pause(true) } catch { /* ignore */ }

          try {
            await onScanRef.current(code)
          } catch {
            // onScan error — resume supaya scanner tidak stuck paused
            try { await inst.resume() } catch { /* ignore */ }
          }
        },
        () => {},
      )

      if (!mountedRef.current) {
        // Unmount saat inst.start() — matikan sekarang
        killCamera()
        return
      }

      // Simpan stream setelah start berhasil
      const video = containerRef.current?.querySelector('video') ?? null
      const stream = video?.srcObject as MediaStream | null
      streamRef.current = stream

      // Listen trackended — kalau browser stop track, sync state
      if (stream) {
        stream.getTracks().forEach((t) => {
          t.addEventListener('ended', () => {
            streamRef.current = null
          })
        })
      }

      setStarting(false)
      setCamError(null)
    } catch (e) {
      if (!mountedRef.current) return
      const msg = e instanceof Error ? e.message : 'Kamera tidak tersedia'
      setCamError(msg)
      setStarting(false)
      onError?.(msg)
    }
  }, [mobile, onError, killCamera])

  // Expose resume()
  useImperativeHandle(ref, () => ({
    resume: async () => {
      if (!instRef.current || !mountedRef.current) return
      try {
        await instRef.current.resume()
        if (!mountedRef.current) return
        setStarting(false)
        setCamError(null)
      } catch { /* ignore */ }
    },
  }))

  // Init
  useEffect(() => {
    mountedRef.current = true
    setMobile(isMobile())
    void startScanner(0)
    return () => {
      mountedRef.current = false
      killCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Switch kamera
  const switchCamera = async () => {
    setStarting(true)
    setCamError(null)
    const nextIdx = cameras.length > 0 ? (currentCamIdx + 1) % cameras.length : 0
    setCurrentCamIdx(nextIdx)
    await startScanner(nextIdx)
  }

  return (
    <div className="space-y-3">
      {/* Camera area */}
      <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-[var(--radius-lg)] border border-slate-200 bg-slate-900">
        <div id="snack-qr-reader" ref={containerRef} className="flex h-full w-full items-center justify-center" />

        {mobile && !starting && !camError && (
          <button
            type="button"
            onClick={switchCamera}
            className="absolute top-2 right-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
            aria-label="Ganti kamera"
          >
            <i className="fa-solid fa-camera-rotate text-sm" />
          </button>
        )}

        {starting && !camError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80">
            <i className="fa-solid fa-spinner fa-spin text-2xl" />
            <p className="text-xs font-semibold">Menyiapkan kamera...</p>
          </div>
        )}
        {camError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/90 p-4 text-center">
            <i className="fa-solid fa-camera-slash text-2xl text-slate-400" />
            <p className="text-xs font-semibold text-slate-300">{camError}</p>
            <p className="text-[10px] text-slate-400">Gunakan pencarian manual di bawah.</p>
          </div>
        )}
      </div>

      {!mobile && cameras.length > 1 && !starting && (
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-slate-200 bg-white px-3 py-2">
          <i className="fa-solid fa-video text-xs text-slate-400" />
          <select
            value={currentCamIdx}
            onChange={(e) => { setCurrentCamIdx(Number(e.target.value)); void startScanner(Number(e.target.value)) }}
            className="flex-1 bg-transparent text-xs font-semibold text-slate-700 outline-none"
          >
            {cameras.map((c, i) => (
              <option key={c.id} value={i}>{c.label}</option>
            ))}
          </select>
        </div>
      )}

      <div className="rounded-[var(--radius-md)] border border-slate-200 bg-white p-3">
        <label className="block text-xs font-bold text-slate-600">QR rusak? Ketik kode tim manual</label>
        <div className="mt-1.5 flex gap-2">
          <input
            type="text"
            value={manual}
            onChange={(e) => setManual(e.target.value.toUpperCase())}
            placeholder="PUTRA-1 / PANITIA"
            className="flex-1 rounded-[var(--radius-md)] border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-300 focus:border-brand-red focus:ring-2 focus:ring-brand-red/15"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && manual.trim()) onScan(manual.trim())
            }}
          />
          <button
            type="button"
            onClick={() => manual.trim() && onScan(manual.trim())}
            className="rounded-[var(--radius-md)] bg-brand-red px-4 py-2 text-xs font-bold text-white transition hover:brightness-110 active:scale-95"
          >
            Cari
          </button>
        </div>
      </div>
    </div>
  )
})

export default Scanner
