/**
 * GelangPrint — Pratinjau & Cetak Lembar Gelang Snack A4 HUT RI ke-81.
 * Menggunakan desain vektor murni WristbandSvg sesuai foto referensi.
 *
 * Fitur:
 * - Ukuran selebar kertas A4 (portrait) tersusun menurun ke bawah.
 * - Mode 1: Lembar Semua Tim (A4 Sheet berisi seluruh tim terdaftar).
 * - Mode 2: Per Kelompok (Gelang untuk masing-masing anggota tim).
 * - Filter kategori: Semua / Putra / Putri / Panitia.
 * - Cetak langsung A4 (CSS @media print dengan break-inside-avoid).
 * - Download: Standalone SVG, High-Res PNG (300 DPI), dan ZIP master.
 */

import JSZip from 'jszip';
import { Download, FileArchive, Filter, Loader2, Printer, Ruler } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import type { SnackTeam } from '~/server/functions/snack';
import { generateWristbandSvgString, type WristbandData, WristbandSvg } from './WristbandSvg';

interface GelangPrintProps {
  /** Tim aktif yang dipilih dari dropdown (null = Semua Tim) */
  selectedTeam?: SnackTeam | null;
  /** Daftar seluruh tim yang tersedia */
  allTeams: SnackTeam[];
}

const CATEGORY_COLORS: Record<string, string> = {
  putra: '#DC2626', // Brand Red
  putri: '#E11D48', // Rose Red
  panitia: '#D97706', // Amber Gold
};

export default function GelangPrint({ selectedTeam, allTeams }: GelangPrintProps) {
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'putra' | 'putri' | 'panitia'>(
    'all'
  );
  const [colorTheme, setColorTheme] = useState<'uniform' | 'category'>('uniform');
  const [printMode, setPrintMode] = useState<'sheet-teams' | 'sheet-members'>(
    selectedTeam ? 'sheet-members' : 'sheet-teams'
  );
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [isExporting, setIsExporting] = useState<'svg' | 'png' | 'zip' | null>(null);

  // Sync mode saat selectedTeam berubah
  useEffect(() => {
    if (selectedTeam) {
      setPrintMode('sheet-members');
    } else {
      setPrintMode('sheet-teams');
    }
  }, [selectedTeam]);

  // Filter tim yang akan dirender
  const filteredTeams = useMemo(() => {
    if (selectedTeam) return [selectedTeam];
    if (categoryFilter === 'all') return allTeams;
    return allTeams.filter((t) => t.kategori === categoryFilter);
  }, [selectedTeam, allTeams, categoryFilter]);

  // Generate daftar item gelang yang akan dicetak
  const wristbandItems = useMemo<WristbandData[]>(() => {
    if (printMode === 'sheet-members' && selectedTeam) {
      // Cetak per anggota dari tim terpilih
      return selectedTeam.members.map((m) => ({
        nama: selectedTeam.nama,
        kode: selectedTeam.kode,
        kategori: selectedTeam.kategori,
        nomor: selectedTeam.nomor,
        memberName: m.nama,
      }));
    }

    // Cetak 1 gelang per kelompok (Semua Tim)
    return filteredTeams.map((t) => ({
      nama: t.nama,
      kode: t.kode,
      kategori: t.kategori,
      nomor: t.nomor,
    }));
  }, [printMode, selectedTeam, filteredTeams]);

  // Pre-generate QR data URLs untuk seluruh kode yang tampil
  useEffect(() => {
    let cancelled = false;
    const codes = Array.from(new Set(wristbandItems.map((item) => item.kode).filter(Boolean)));
    if (codes.length === 0) return;

    const generateQrs = async () => {
      const newMap: Record<string, string> = { ...qrMap };
      let changed = false;

      for (const kode of codes) {
        if (!newMap[kode]) {
          try {
            newMap[kode] = await QRCode.toDataURL(kode, {
              width: 300,
              margin: 1,
              errorCorrectionLevel: 'M',
            });
            changed = true;
          } catch (e) {
            console.error('Failed to generate QR for', kode, e);
          }
        }
      }

      if (changed && !cancelled) {
        setQrMap(newMap);
      }
    };

    void generateQrs();
    return () => {
      cancelled = true;
    };
  }, [wristbandItems, qrMap]);

  // Helper untuk mendapatkan warna gelang
  const getWristbandColor = (item: WristbandData) => {
    if (colorTheme === 'category' && item.kategori && CATEGORY_COLORS[item.kategori]) {
      return CATEGORY_COLORS[item.kategori];
    }
    return '#DC2626'; // Default Merah HUT RI Seragam (Sesuai Desain Acuan)
  };

  /** Download SVG tunggal atau gabungan */
  const handleDownloadSvg = () => {
    setIsExporting('svg');
    try {
      if (wristbandItems.length === 1) {
        const item = wristbandItems[0];
        const svgStr = generateWristbandSvgString({
          data: item,
          qrDataUrl: qrMap[item.kode] || '',
          primaryColor: getWristbandColor(item),
        });
        const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gelang-${item.kode || 'tim'}.svg`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        // Multi-gelang stacked SVG sheet (Tinggi 132px + 10px spacing = 142px per item)
        const itemH = 132;
        const spacing = 10;
        const totalHeight = wristbandItems.length * (itemH + spacing);
        const svgs = wristbandItems
          .map((item, idx) => {
            const svgContent = generateWristbandSvgString({
              data: item,
              qrDataUrl: qrMap[item.kode] || '',
              primaryColor: getWristbandColor(item),
            });
            // Hapus tag pembuka dan penutup SVG luar untuk dimasukkan ke dalam <g>
            const inner = svgContent.replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '');
            return `<g transform="translate(0, ${idx * (itemH + spacing)})">${inner}</g>`;
          })
          .join('\n');

        const combinedSvg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1000 ${totalHeight}" width="1000" height="${totalHeight}">
${svgs}
</svg>`;

        const blob = new Blob([combinedSvg], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gelang-semua-tim-${wristbandItems.length}pcs.svg`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } finally {
      setIsExporting(null);
    }
  };

  /** Download High-Res PNG (300 DPI Canvas - Ukuran 25mm 2400x317px per gelang) */
  const handleDownloadPng = async () => {
    setIsExporting('png');
    try {
      const scale = 2.4; // 2400px width untuk cetak super tajam (1000 x 2.4 = 2400px)
      const itemH = Math.round(132 * scale); // 317px (sesuai rasio 25mm)
      const spacing = Math.round(10 * scale); // 24px spacing
      const totalH = wristbandItems.length * (itemH + spacing);

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(1000 * scale);
      canvas.height = totalH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < wristbandItems.length; i++) {
        const item = wristbandItems[i];
        const svgStr = generateWristbandSvgString({
          data: item,
          qrDataUrl: qrMap[item.kode] || '',
          primaryColor: getWristbandColor(item),
        });

        const img = new Image();
        const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);

        await new Promise<void>((resolve, _reject) => {
          img.onload = () => {
            ctx.drawImage(img, 0, i * (itemH + spacing), Math.round(1000 * scale), itemH);
            URL.revokeObjectURL(svgUrl);
            resolve();
          };
          img.onerror = () => {
            URL.revokeObjectURL(svgUrl);
            resolve();
          };
          img.src = svgUrl;
        });
      }

      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `gelang-cetak-${wristbandItems.length}pcs.png`;
      a.click();
    } catch (e) {
      console.error('Error generating PNG', e);
    } finally {
      setIsExporting(null);
    }
  };

  /** Download ZIP berisi file SVG + PNG untuk setiap tim (Format 2400x317px) */
  const handleDownloadZip = async () => {
    setIsExporting('zip');
    try {
      const zip = new JSZip();
      const folderSvg = zip.folder('svg');
      const folderPng = zip.folder('png');

      for (const item of wristbandItems) {
        const fileName = `${item.kode || 'team'}${item.memberName ? `-${item.memberName.replace(/[^a-zA-Z0-9]/g, '_')}` : ''}`;
        const svgStr = generateWristbandSvgString({
          data: item,
          qrDataUrl: qrMap[item.kode] || '',
          primaryColor: getWristbandColor(item),
        });

        folderSvg?.file(`${fileName}.svg`, svgStr);

        // Render individual PNG (2400x317px sesuai rasio 25mm)
        const canvas = document.createElement('canvas');
        canvas.width = 2400;
        canvas.height = 317;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, 2400, 317);

          const img = new Image();
          const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
          const svgUrl = URL.createObjectURL(svgBlob);

          await new Promise<void>((resolve) => {
            img.onload = () => {
              ctx.drawImage(img, 0, 0, 2400, 317);
              URL.revokeObjectURL(svgUrl);
              resolve();
            };
            img.onerror = () => {
              URL.revokeObjectURL(svgUrl);
              resolve();
            };
            img.src = svgUrl;
          });

          const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
          if (blob) {
            folderPng?.file(`${fileName}.png`, blob);
          }
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gelang-hut-ri-81-package.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      console.error('Error generating ZIP', e);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* ─── Control Bar & Action Buttons (Hidden when printing) ─── */}
      <Card className="border border-border/80 bg-card shadow-xs rounded-2xl print:hidden">
        <CardContent className="p-3.5 sm:p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Filter Kategori (Jika mode semua tim) & Mode Warna */}
            <div className="flex flex-wrap items-center gap-2.5">
              {!selectedTeam && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mr-0.5">
                    <Filter size={12} /> Filter:
                  </span>
                  {(['all', 'putra', 'putri', 'panitia'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                        categoryFilter === cat
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {cat === 'all'
                        ? `Semua (${allTeams.length})`
                        : `${cat.charAt(0).toUpperCase() + cat.slice(1)} (${
                            allTeams.filter((t) => t.kategori === cat).length
                          })`}
                    </button>
                  ))}
                </div>
              )}

              {/* Switcher Warna Gelang */}
              <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border/60">
                <button
                  type="button"
                  onClick={() => setColorTheme('uniform')}
                  className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
                    colorTheme === 'uniform'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Merah Resmi
                </button>
                <button
                  type="button"
                  onClick={() => setColorTheme('category')}
                  className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
                    colorTheme === 'category'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Warna Kategori
                </button>
              </div>
            </div>

            {/* Tombol Aksi Download & Cetak */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadSvg}
                disabled={isExporting !== null || wristbandItems.length === 0}
                className="rounded-xl h-8.5 text-xs font-bold"
              >
                {isExporting === 'svg' ? (
                  <Loader2 size={13} className="animate-spin mr-1.5" />
                ) : (
                  <Download size={13} className="mr-1.5" />
                )}
                SVG
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPng}
                disabled={isExporting !== null || wristbandItems.length === 0}
                className="rounded-xl h-8.5 text-xs font-bold"
              >
                {isExporting === 'png' ? (
                  <Loader2 size={13} className="animate-spin mr-1.5" />
                ) : (
                  <Download size={13} className="mr-1.5" />
                )}
                PNG 300 DPI
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadZip}
                disabled={isExporting !== null || wristbandItems.length === 0}
                className="rounded-xl h-8.5 text-xs font-bold"
              >
                {isExporting === 'zip' ? (
                  <Loader2 size={13} className="animate-spin mr-1.5" />
                ) : (
                  <FileArchive size={13} className="mr-1.5" />
                )}
                ZIP
              </Button>

              <Button
                size="sm"
                onClick={() => window.print()}
                disabled={wristbandItems.length === 0}
                className="rounded-xl h-8.5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
              >
                <Printer size={13} className="mr-1.5" />
                Cetak Lembar A4
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Info Ukuran Fisik Gelang (Screen Preview Only) ─── */}
      <div className="flex justify-center print:hidden">
        <div className="w-full max-w-[210mm] flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] font-semibold text-muted-foreground">
          <div className="flex items-center gap-2 bg-muted/70 px-3 py-1.5 rounded-xl border border-border/60 shadow-2xs">
            <Ruler size={14} className="text-primary shrink-0" />
            <span>
              Panjang: <strong className="text-foreground">190 mm</strong> (19 cm)
            </span>
            <span className="text-muted-foreground/30">✕</span>
            <span>
              Lebar: <strong className="text-foreground">25 mm</strong> (2.5 cm)
            </span>
            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
              Ukuran Standar 25mm
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="hidden sm:inline">Ukuran Kertas:</span>
            <span className="font-bold text-foreground bg-muted/50 px-2 py-1 rounded-lg border border-border/50">
              A4 Portrait (210 × 297 mm)
            </span>
          </div>
        </div>
      </div>

      {/* ─── Lembar Pratinjau & Cetak A4 (Canvas Print Terisolasi) ─── */}
      <div className="flex justify-center print:block print:w-full print:m-0 print:p-0">
        {/* Container Lembar A4 (Lebar 210mm di Print, Max-w di Screen) */}
        <div
          id="gelang-print-area"
          className="w-full max-w-[210mm] bg-white text-slate-900 rounded-2xl sm:border sm:border-slate-200 sm:shadow-lg p-3 sm:p-5 print:p-0 print:m-0 print:border-none print:shadow-none print:max-w-none print:w-full space-y-3 print:space-y-3"
        >
          {/* Header Cetak Formal (Hanya tampil saat Print) */}
          <div className="hidden print:flex items-center justify-between pb-1.5 border-b border-slate-300 mb-2">
            <div>
              <p className="text-[11px] font-black tracking-tight text-slate-900">
                LEMBAR GELANG SNACK — HUT RI KE-81
              </p>
              <p className="text-[9px] text-slate-500 font-medium">
                PT TKI x PT FTP ·{' '}
                {selectedTeam ? `Kelompok: ${selectedTeam.nama}` : 'Semua Kelompok'}
              </p>
            </div>
            <p className="text-[8.5px] text-slate-400 font-mono">
              Total: {wristbandItems.length} Gelang
            </p>
          </div>

          {/* Render Tiap Gelang Tersusun Menurun ke Bawah */}
          {wristbandItems.map((item, index) => {
            const qrUrl = qrMap[item.kode] || '';
            const color = getWristbandColor(item);

            return (
              <div
                key={`${item.kode}-${item.memberName || index}`}
                className="relative group bg-white print:break-inside-avoid print:page-break-inside-avoid print:block print:w-full print:my-2"
              >
                {/* Gelang SVG */}
                <div className="w-full rounded-md overflow-hidden shadow-2xs group-hover:shadow-md transition-shadow print:rounded-none print:shadow-none">
                  <WristbandSvg data={item} qrDataUrl={qrUrl} primaryColor={color} showCutBorder />
                </div>

                {/* Garis Potong Panduan Antar Gelang (Cut Guide) */}
                <div className="hidden print:flex items-center gap-1.5 pt-1.5 text-slate-300">
                  <span className="text-[8px] font-mono select-none text-slate-400">✂</span>
                  <div className="flex-1 border-b border-dashed border-slate-300" />
                </div>
              </div>
            );
          })}

          {wristbandItems.length === 0 && (
            <div className="py-12 text-center text-slate-400">
              <p className="text-sm font-semibold">Tidak ada kelompok yang cocok dengan filter.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
