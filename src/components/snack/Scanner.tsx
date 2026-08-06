/**
 * Scanner — wrapper html5-qrcode (browser-only, dynamic import).
 * Mempertahankan sepenuhnya logika kamera (killCamera, mountedRef, instance baru).
 * Hanya styling diarahkan ke token shadcn.
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { RotateCcw, CameraOff, Loader2, Video } from 'lucide-react'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Input } from '../ui/input'
import { NativeSelect, NativeSelectOption } from '../ui/native-select'
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
  const streamRef = useRef<MediaStream | null>(null)
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

  const killCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (instRef.current) {
      try { instRef.current.stop().catch(() => {}) } catch { /* ignore */ }
      instRef.current = null
    }
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

          try { await inst.pause(true) } catch { /* ignore */ }

          try {
            await onScanRef.current(code)
          } catch {
            try { await inst.resume() } catch { /* ignore */ }
          }
        },
        () => {},
      )

      if (!mountedRef.current) {
        killCamera()
        return
      }

      const video = containerRef.current?.querySelector('video') ?? null
      const stream = video?.srcObject as MediaStream | null
      streamRef.current = stream

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
      <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-lg border border-border bg-slate-900">
        <div id="snack-qr-reader" ref={containerRef} className="flex h-full w-full items-center justify-center" />

        {mobile && !starting && !camError && (
          <button
            type="button"
            onClick={switchCamera}
            className="absolute top-2 right-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
            aria-label="Ganti kamera"
          >
            <RotateCcw size={14} />
          </button>
        )}

        {starting && !camError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80">
            <Loader2 size={24} className="animate-spin" />
            <p className="text-xs font-semibold">Menyiapkan kamera...</p>
          </div>
        )}
        {camError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/90 p-4 text-center">
            <CameraOff size={24} className="text-slate-400" />
            <p className="text-xs font-semibold text-slate-300">{camError}</p>
            <p className="text-[10px] text-slate-400">Gunakan pencarian manual di bawah.</p>
          </div>
        )}
      </div>

      {!mobile && cameras.length > 1 && !starting && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2">
          <Video size={14} className="text-muted-foreground" />
          <NativeSelect
            className="flex-1"
            value={currentCamIdx}
            onChange={(e) => { setCurrentCamIdx(Number(e.target.value)); void startScanner(Number(e.target.value)) }}
          >
            {cameras.map((c, i) => (
              <NativeSelectOption key={c.id} value={i}>{c.label}</NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      )}

      <Card className="p-3">
        <label className="block text-xs font-bold text-muted-foreground">QR rusak? Ketik kode tim manual</label>
        <div className="mt-1.5 flex gap-2">
          <Input
            type="text"
            value={manual}
            onChange={(e) => setManual(e.target.value.toUpperCase())}
            placeholder="PUTRA-1 / PANITIA"
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && manual.trim()) onScan(manual.trim())
            }}
          />
          <Button onClick={() => manual.trim() && onScan(manual.trim())}>
            Cari
          </Button>
        </div>
      </Card>
    </div>
  )
})

export default Scanner