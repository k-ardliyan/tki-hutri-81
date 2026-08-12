/**
 * Scanner — wrapper html5-qrcode (browser-only, dynamic import).
 * Features:
 * - Default to back camera (facingMode: environment)
 * - Auto camera switching (await track cleanup before re-init)
 * - Clear camera labels and SwitchCamera icon
 * - Dark mode camera selection dropdown & restart control
 * - Mobile-first viewfinder guides & touch-friendly ergonomics
 */

import type { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  CameraOff,
  CornerDownLeft,
  Keyboard,
  Loader2,
  RotateCcw,
  SwitchCamera,
  Video,
} from 'lucide-react';
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
  isBack: boolean;
  isFront: boolean;
}

export interface ScannerHandle {
  /** Resume scanning setelah parent menampilkan modal "kode tidak dikenal". */
  resume: () => Promise<void>;
}

interface ScannerProps {
  onScan: (kode: string) => Promise<boolean> | boolean;
  onError?: (err: string) => void;
}

const DECODE_COOLDOWN_MS = 1200;

function parseCameraDevice(d: { id: string; label: string }, idx: number): CameraDevice {
  const rawLabel = d.label || '';
  const lower = rawLabel.toLowerCase();
  const isBack =
    lower.includes('back') ||
    lower.includes('rear') ||
    lower.includes('environment') ||
    lower.includes('belakang') ||
    lower.includes('facing back') ||
    lower.includes('outer');
  const isFront =
    lower.includes('front') ||
    lower.includes('user') ||
    lower.includes('selfie') ||
    lower.includes('depan') ||
    lower.includes('facing front');

  let label = rawLabel;
  if (!label || label.trim() === '') {
    label = isBack
      ? `Kamera Belakang (${idx + 1})`
      : isFront
        ? `Kamera Depan (${idx + 1})`
        : `Kamera ${idx + 1}`;
  } else {
    if (isBack && !lower.includes('belakang')) {
      label = `${rawLabel} (Belakang)`;
    } else if (isFront && !lower.includes('depan')) {
      label = `${rawLabel} (Depan)`;
    }
  }

  return {
    id: d.id,
    label,
    isBack,
    isFront,
  };
}

const Scanner = forwardRef<ScannerHandle, ScannerProps>(function Scanner({ onScan, onError }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instRef = useRef<Html5Qrcode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);
  const isStartingRef = useRef(false);
  const cooldownRef = useRef(0);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const [starting, setStarting] = useState(true);
  const [camError, setCamError] = useState<string | null>(null);
  const [manual, setManual] = useState('');
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [currentCamIdx, setCurrentCamIdx] = useState(0);

  const cameraOptions = useMemo<ComboboxOption[]>(
    () => cameras.map((c, i) => ({ value: String(i), label: c.label })),
    [cameras]
  );

  const killCamera = useCallback(async () => {
    if (instRef.current) {
      try {
        await instRef.current.stop();
      } catch {
        /* ignore */
      }
      try {
        instRef.current.clear();
      } catch {
        /* ignore */
      }
      instRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        t.stop();
      });
      streamRef.current = null;
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
      if (isStartingRef.current) return;
      isStartingRef.current = true;

      await killCamera();
      if (!mountedRef.current) {
        isStartingRef.current = false;
        return;
      }
      setStarting(true);
      setCamError(null);

      try {
        const mod = await import('html5-qrcode');
        if (!mountedRef.current) {
          isStartingRef.current = false;
          return;
        }
        const Html5QrcodeClass: typeof Html5Qrcode = mod.Html5Qrcode;
        const fmt = mod.Html5QrcodeSupportedFormats as typeof Html5QrcodeSupportedFormats;

        const devices = await Html5QrcodeClass.getCameras();
        if (!mountedRef.current) {
          isStartingRef.current = false;
          return;
        }

        const camList: CameraDevice[] = devices.map((d, i) => parseCameraDevice(d, i));
        setCameras(camList);

        if (!containerRef.current || !mountedRef.current) {
          isStartingRef.current = false;
          return;
        }

        // Determine camera index (default: back camera)
        let selectedIdx = camIdx;
        if (selectedIdx === undefined || selectedIdx < 0 || selectedIdx >= camList.length) {
          const backIndex = camList.findIndex((c) => c.isBack);
          selectedIdx = backIndex !== -1 ? backIndex : 0;
        }

        setCurrentCamIdx(selectedIdx);

        instRef.current = new Html5QrcodeClass('snack-qr-reader', {
          formatsToSupport: [fmt.QR_CODE],
        } as never);
        const inst = instRef.current;

        const selectedCam = camList[selectedIdx];
        const cameraConfig = selectedCam?.id
          ? selectedCam.id
          : { facingMode: selectedCam?.isFront ? 'user' : 'environment' };

        await inst.start(
          cameraConfig,
          { fps: 10, qrbox: { width: 220, height: 220 } },
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
          await killCamera();
          isStartingRef.current = false;
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
        if (!mountedRef.current) {
          isStartingRef.current = false;
          return;
        }
        const raw = e instanceof Error ? e.message : '';
        const msg = /NotAllowedError|Permission|denied/i.test(raw)
          ? 'Izin kamera ditolak. Izinkan akses kamera di browser, lalu coba lagi.'
          : /NotFoundError|no camera|Requested device not found/i.test(raw)
            ? 'Kamera tidak ditemukan di perangkat ini.'
            : /NotReadableError|in use/i.test(raw)
              ? 'Kamera sedang dipakai aplikasi lain. Tutup aplikasi lain, lalu coba lagi.'
              : 'Kamera tidak tersedia. Gunakan pencarian manual atau muat ulang.';
        setCamError(msg);
        setStarting(false);
        onError?.(msg);
      } finally {
        isStartingRef.current = false;
      }
    },
    [onError, killCamera]
  );

  useImperativeHandle(ref, () => ({
    resume: async () => {
      if (!instRef.current || !mountedRef.current) return;
      cooldownRef.current = 0;
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
    void startScanner();
    return () => {
      mountedRef.current = false;
      isStartingRef.current = false;
      void killCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startScanner, killCamera]);

  const switchCamera = async () => {
    if (cameras.length <= 1 || isStartingRef.current) return;
    const nextIdx = (currentCamIdx + 1) % cameras.length;
    await startScanner(nextIdx);
  };

  const handleRestartCamera = async () => {
    await startScanner(currentCamIdx);
  };

  const submitManual = (code: string) => {
    if (!code.trim()) return;
    void (async () => {
      try {
        await instRef.current?.pause(true);
      } catch {
        /* ignore */
      }
      await onScan(code.trim());
    })();
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-3">
      {/* Camera Viewport Card */}
      <Card className="overflow-hidden border border-border shadow-md rounded-2xl">
        <div className="relative aspect-[4/3] sm:aspect-square w-full bg-slate-950 overflow-hidden flex items-center justify-center">
          <div
            id="snack-qr-reader"
            ref={containerRef}
            className="flex h-full w-full items-center justify-center [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
          />

          {/* Viewfinder Target Visual Overlay */}
          {!starting && !camError && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative size-48 sm:size-56 rounded-2xl border-2 border-dashed border-white/40 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]">
                {/* Corner accents */}
                <div className="absolute -top-0.5 -left-0.5 size-5 border-t-3 border-l-3 border-primary rounded-tl-lg" />
                <div className="absolute -top-0.5 -right-0.5 size-5 border-t-3 border-r-3 border-primary rounded-tr-lg" />
                <div className="absolute -bottom-0.5 -left-0.5 size-5 border-b-3 border-l-3 border-primary rounded-bl-lg" />
                <div className="absolute -bottom-0.5 -right-0.5 size-5 border-b-3 border-r-3 border-primary rounded-br-lg" />
              </div>
            </div>
          )}

          {/* Switch Camera Overlay Button */}
          {cameras.length > 1 && !starting && !camError && (
            <button
              type="button"
              onClick={switchCamera}
              className="absolute top-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition hover:bg-black/80 active:scale-90 shadow-lg border border-white/20"
              aria-label="Ganti kamera"
              title="Ganti Kamera (Depan/Belakang)"
            >
              <SwitchCamera size={19} />
            </button>
          )}

          {/* Loading Camera State */}
          {starting && !camError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/85 text-white/90 backdrop-blur-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary">
                <Loader2 size={26} className="animate-spin" />
              </div>
              <p className="text-xs font-bold tracking-wide">Menyiapkan kamera...</p>
            </div>
          )}

          {/* Error Camera State */}
          {camError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/95 p-6 text-center text-white">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/20 text-destructive">
                <CameraOff size={24} />
              </div>
              <div className="space-y-1.5 max-w-xs">
                <p className="text-sm font-bold text-slate-100">{camError}</p>
                <p className="text-xs text-slate-400">
                  Gunakan pencarian nama/NIP di bawah atau coba muat ulang kamera.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRestartCamera}
                className="mt-1 h-9 rounded-xl border-slate-700 bg-slate-800 text-xs font-bold text-white hover:bg-slate-700 active:scale-95"
              >
                <RotateCcw size={14} className="mr-1.5" /> Muat Ulang Kamera
              </Button>
            </div>
          )}
        </div>

        {/* Camera Selector & Restart Controls Bar */}
        <div className="flex items-center justify-between gap-2.5 p-2.5 sm:p-3 bg-card border-t border-border">
          {cameras.length > 1 ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Video size={15} className="text-primary shrink-0" />
              <Combobox
                options={cameraOptions}
                value={String(currentCamIdx)}
                onValueChange={(val) => {
                  const idx = Number(val);
                  void startScanner(idx);
                }}
                showSearch={false}
                size="sm"
                triggerClassName="flex-1 text-xs h-8.5 rounded-lg"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <Video size={15} className="text-primary shrink-0" />
              <span>Kamera Siap</span>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleRestartCamera}
            disabled={starting}
            className="h-8.5 text-xs font-semibold shrink-0 rounded-lg px-2.5"
          >
            <RotateCcw size={13} className="mr-1" />
            Restart
          </Button>
        </div>
      </Card>

      {/* Manual Input Card (QR Rusak) */}
      <Card className="p-3.5 space-y-2 border border-border/80 shadow-xs rounded-2xl bg-card">
        <div className="flex items-center gap-2">
          <Keyboard size={15} className="text-primary shrink-0" />
          <Label htmlFor="manual-code" className="text-xs font-bold text-foreground">
            QR Rusak / Buram? Ketik Kode Tim
          </Label>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="manual-code"
              type="text"
              value={manual}
              onChange={(e) => setManual(e.target.value.toUpperCase())}
              placeholder="Contoh: PUTRA-1 / PANITIA"
              className="uppercase font-mono font-bold text-xs sm:text-sm h-10 bg-background rounded-xl pr-8"
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitManual(manual);
              }}
            />
            {manual && (
              <button
                type="button"
                onClick={() => setManual('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground text-xs font-bold p-1"
              >
                ×
              </button>
            )}
          </div>
          <Button
            onClick={() => submitManual(manual)}
            disabled={!manual.trim()}
            className="h-10 font-bold px-4 text-xs rounded-xl shadow-xs shrink-0"
          >
            <CornerDownLeft size={14} className="mr-1" />
            Cek Tim
          </Button>
        </div>
      </Card>
    </div>
  );
});

export default Scanner;
