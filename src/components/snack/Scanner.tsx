/**
 * Scanner — wrapper html5-qrcode (browser-only, dynamic import).
 * Features:
 * - Dark mode camera selection dropdown & restart button
 * - Restart camera control when camera stream stops or errors
 * - Improved responsive desktop/mobile layout
 */

import type { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { CameraOff, Keyboard, Loader2, RotateCcw, Search, Video } from 'lucide-react';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Combobox, type ComboboxOption } from '../ui/combobox';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface CameraDevice {
  id: string;
  label: string;
}

export interface ScannerHandle {
  /** Resume scanning setelah parent menampilkan modal "kode tidak dikenal". */
  resume: () => Promise<void>;
}

interface ScannerProps {
  onScan: (kode: string) => Promise<boolean> | boolean;
  onError?: (err: string) => void;
}

const isMobile = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(pointer: coarse)').matches ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));

const DECODE_COOLDOWN_MS = 1200;

const Scanner = forwardRef<ScannerHandle, ScannerProps>(function Scanner({ onScan, onError }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instRef = useRef<Html5Qrcode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);
  const cooldownRef = useRef(0);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const [starting, setStarting] = useState(true);
  const [camError, setCamError] = useState<string | null>(null);
  const [manual, setManual] = useState('');
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [currentCamIdx, setCurrentCamIdx] = useState(0);
  const [mobile, setMobile] = useState(false);

  const cameraOptions = useMemo<ComboboxOption[]>(
    () => cameras.map((c, i) => ({ value: String(i), label: c.label })),
    [cameras]
  );

  const killCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (instRef.current) {
      try {
        instRef.current.stop().catch(() => {});
      } catch {
        /* ignore */
      }
      instRef.current = null;
    }
    if (containerRef.current) {
      containerRef.current.querySelectorAll('video').forEach((v) => {
        v.srcObject = null;
      });
      containerRef.current.innerHTML = '';
    }
  }, []);

  const startScanner = useCallback(
    async (camIdx?: number) => {
      if (typeof window === 'undefined') return;

      killCamera();
      if (!mountedRef.current) return;
      setStarting(true);
      setCamError(null);

      try {
        const mod = await import('html5-qrcode');
        if (!mountedRef.current) return;
        const Html5QrcodeClass: typeof Html5Qrcode = mod.Html5Qrcode;
        const fmt = mod.Html5QrcodeSupportedFormats as typeof Html5QrcodeSupportedFormats;

        const devices = await Html5QrcodeClass.getCameras();
        if (!mountedRef.current) return;
        const camList: CameraDevice[] = devices.map((d) => ({
          id: d.id,
          label: d.label || `Kamera ${d.id}`,
        }));
        setCameras(camList);

        if (!containerRef.current || !mountedRef.current) return;

        instRef.current = new Html5QrcodeClass('snack-qr-reader', {
          formatsToSupport: [fmt.QR_CODE],
        } as never);
        const inst = instRef.current;

        const idx = camIdx ?? 0;
        const cam = camList[idx];
        const cameraConfig = mobile
          ? { facingMode: idx % 2 === 0 ? 'environment' : 'user' }
          : cam
            ? cam.id
            : { facingMode: 'environment' };

        await inst.start(
          cameraConfig,
          { fps: 10, qrbox: { width: 230, height: 230 } },
          async (decodedText: string) => {
            const code = decodedText.trim().toUpperCase();
            if (cooldownRef.current > Date.now()) return;
            cooldownRef.current = Date.now() + DECODE_COOLDOWN_MS;

            try {
              await inst.pause(true);
            } catch {
              /* ignore */
            }

            try {
              await onScanRef.current(code);
            } catch {
              try {
                await inst.resume();
              } catch {
                /* ignore */
              }
            }
          },
          () => {}
        );

        if (!mountedRef.current) {
          killCamera();
          return;
        }

        const video = containerRef.current?.querySelector('video') ?? null;
        const stream = video?.srcObject as MediaStream | null;
        streamRef.current = stream;

        if (stream) {
          stream.getTracks().forEach((t) => {
            t.addEventListener('ended', () => {
              streamRef.current = null;
            });
          });
        }

        setStarting(false);
        setCamError(null);
      } catch (e) {
        if (!mountedRef.current) return;
        const msg = e instanceof Error ? e.message : 'Kamera tidak tersedia';
        setCamError(msg);
        setStarting(false);
        onError?.(msg);
      }
    },
    [mobile, onError, killCamera]
  );

  useImperativeHandle(ref, () => ({
    resume: async () => {
      if (!instRef.current || !mountedRef.current) return;
      try {
        await instRef.current.resume();
        if (!mountedRef.current) return;
        setStarting(false);
        setCamError(null);
      } catch {
        /* ignore */
      }
    },
  }));

  useEffect(() => {
    mountedRef.current = true;
    setMobile(isMobile());
    void startScanner(0);
    return () => {
      mountedRef.current = false;
      killCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchCamera = async () => {
    const nextIdx = cameras.length > 0 ? (currentCamIdx + 1) % cameras.length : 0;
    setCurrentCamIdx(nextIdx);
    await startScanner(nextIdx);
  };

  const handleRestartCamera = async () => {
    await startScanner(currentCamIdx);
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* Camera Viewport Card */}
      <Card className="overflow-hidden border border-border shadow-xs">
        <div className="relative aspect-square w-full bg-slate-950 overflow-hidden">
          <div
            id="snack-qr-reader"
            ref={containerRef}
            className="flex h-full w-full items-center justify-center"
          />

          {/* Switch Camera Mobile Button */}
          {mobile && !starting && !camError && cameras.length > 1 && (
            <button
              type="button"
              onClick={switchCamera}
              className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-xs transition hover:bg-black/80 active:scale-95"
              aria-label="Ganti kamera"
            >
              <RotateCcw size={15} />
            </button>
          )}

          {/* Loading Camera State */}
          {starting && !camError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-slate-950/80 text-white/90 backdrop-blur-xs">
              <Loader2 size={28} className="animate-spin text-primary" />
              <p className="text-xs font-bold">Menyiapkan kamera...</p>
            </div>
          )}

          {/* Error Camera State */}
          {camError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/95 p-6 text-center text-white">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/20 text-muted-foreground">
                <CameraOff size={22} />
              </div>
              <div className="space-y-1 max-w-xs">
                <p className="text-xs font-bold text-slate-200">{camError}</p>
                <p className="text-[11px] text-slate-400">
                  Kamera tidak aktif atau izin ditolak. Gunakan pencarian manual atau muat ulang.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRestartCamera}
                className="mt-1 border-slate-700 bg-slate-800 text-xs font-bold text-white hover:bg-slate-700"
              >
                <RotateCcw size={13} className="mr-1.5" /> Coba Muat Ulang Kamera
              </Button>
            </div>
          )}
        </div>

        {/* Camera Selector & Restart Controls Bar */}
        <div className="flex items-center justify-between gap-2 p-3 bg-card border-t border-border">
          {cameras.length > 1 ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Video size={14} className="text-primary shrink-0" />
              <Combobox
                options={cameraOptions}
                value={String(currentCamIdx)}
                onValueChange={(val) => {
                  const idx = Number(val);
                  setCurrentCamIdx(idx);
                  void startScanner(idx);
                }}
                showSearch={false}
                size="sm"
                triggerClassName="flex-1 text-xs h-8"
              />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Video size={14} className="text-primary shrink-0" />
              <span>Status Kamera</span>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleRestartCamera}
            disabled={starting}
            className="h-8 text-xs font-semibold shrink-0"
          >
            <RotateCcw size={13} className="mr-1.5" />
            Restart
          </Button>
        </div>
      </Card>

      {/* Manual Input Card (QR Rusak) */}
      <Card className="p-4 space-y-2.5 border border-border">
        <div className="flex items-center gap-2">
          <Keyboard size={15} className="text-primary" />
          <Label htmlFor="manual-code" className="text-xs font-bold text-foreground">
            QR Rusak? Ketik Kode Tim Manual
          </Label>
        </div>
        <div className="flex gap-2">
          <Input
            id="manual-code"
            type="text"
            value={manual}
            onChange={(e) => setManual(e.target.value.toUpperCase())}
            placeholder="Contoh: PUTRA-1 / PANITIA"
            className="flex-1 uppercase font-mono text-xs h-9 bg-background"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && manual.trim()) onScan(manual.trim());
            }}
          />
          <Button
            onClick={() => manual.trim() && onScan(manual.trim())}
            className="h-9 font-bold px-4 text-xs"
          >
            <Search size={14} className="mr-1" />
            Cari
          </Button>
        </div>
      </Card>
    </div>
  );
});

export default Scanner;
