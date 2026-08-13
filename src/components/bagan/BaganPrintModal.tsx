/**
 * BaganPrintModal — Modal Dialog Pratinjau & Cetak / Ekspor PDF Bagan Pertandingan.
 * Memungkinkan panitia dan publik mengkustomisasi opsi cetak sebelum mencetak langsung atau simpan ke PDF.
 */

import {
  Award,
  Check,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Layers,
  LayoutGrid,
  Maximize2,
  Printer,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import {
  BaganPrintDocument,
  type BaganPrintDocumentProps,
} from '~/components/bagan/BaganPrintDocument';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';
import { ResponsiveDialog } from '~/components/ui/responsive-dialog';
import { cn } from '~/lib/utils';

export interface BaganPrintModalProps extends Omit<BaganPrintDocumentProps, 'options'> {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function BaganPrintModal({
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  title,
  kategori,
  format,
  status,
  singleBracket,
  heatBracket,
  teams,
  prizes,
}: BaganPrintModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = setControlledOpen !== undefined ? setControlledOpen : setInternalOpen;

  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [showPrizes, setShowPrizes] = useState(true);
  const [showSummaryTable, setShowSummaryTable] = useState(true);
  const [showSignatures, setShowSignatures] = useState(true);

  const handlePrint = () => {
    const printSheet = document.getElementById('bagan-print-sheet');
    if (!printSheet) {
      window.print();
      return;
    }

    // Buat iframe terisolasi agar bebas dari parent modal/dialog styling & overflow
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    // Ambil stylesheet dan style tags dari dokumen utama
    const styleTags = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((el) => el.outerHTML)
      .join('\n');

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="utf-8">
          <title>${title} - Bagan Pertandingan HUT RI 81</title>
          ${styleTags}
          <style>
            @page {
              size: A4 ${orientation};
              margin: 6mm 6mm;
            }
            @media print {
              html, body {
                width: 100% !important;
                height: auto !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #0f172a !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              header, footer, header.print-include, footer.print-include {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
              }
              #bagan-print-sheet {
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 auto !important;
                padding: 0 !important;
                box-shadow: none !important;
                border: none !important;
                background: #ffffff !important;
              }
            }
          </style>
        </head>
        <body class="bg-white text-slate-900 font-sans p-0 m-0">
          <div style="width: 100%; margin: 0 auto;">
            ${printSheet.outerHTML}
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 3000);
    }, 400);
  };

  return (
    <>
      {trigger && (
        <span onClick={() => setIsOpen(true)} className="cursor-pointer">
          {trigger}
        </span>
      )}

      <ResponsiveDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        title={
          <div className="flex items-center gap-2.5 text-foreground font-black text-base sm:text-lg">
            <span className="flex size-8 items-center justify-center rounded-xl bg-red-600 text-white shadow-xs">
              <Printer size={16} />
            </span>
            <div>
              <span>Pratinjau & Cetak PDF Bagan Resmi</span>
            </div>
          </div>
        }
        description={`Format dokumen resmi turnamen HUT RI ke-81: ${title} (${kategori === 'putra' ? 'Putra' : 'Putri'}).`}
        className="sm:max-w-[1280px]! w-[96vw]! h-[92vh]! max-h-[92vh]! p-0 flex flex-col overflow-hidden bg-background rounded-2xl border border-border shadow-2xl"
        contentClassName="flex-1 flex flex-col min-h-0 overflow-hidden py-0 max-h-none"
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* ─── Control Bar & Customization Toolbar ─── */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3 sm:px-6 sm:py-3.5 shrink-0">
            {/* Options Toggle */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
              {/* Orientation Switcher */}
              <div className="flex items-center rounded-xl bg-background border border-border p-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setOrientation('landscape')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-bold transition-all text-xs',
                    orientation === 'landscape'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Maximize2 size={12} className="rotate-45" />
                  Landscape (A4)
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation('portrait')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-bold transition-all text-xs',
                    orientation === 'portrait'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Maximize2 size={12} />
                  Portrait (A4)
                </button>
              </div>

              {/* Toggles */}
              <button
                type="button"
                onClick={() => setShowPrizes(!showPrizes)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors',
                  showPrizes
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300'
                    : 'bg-background border-border text-muted-foreground'
                )}
              >
                <Trophy
                  size={13}
                  className={showPrizes ? 'text-amber-500' : 'text-muted-foreground'}
                />
                <span>Hadiah Juara</span>
                {showPrizes && <Check size={12} className="ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={() => setShowSummaryTable(!showSummaryTable)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors',
                  showSummaryTable
                    ? 'bg-blue-500/10 border-blue-500/40 text-blue-700 dark:text-blue-300'
                    : 'bg-background border-border text-muted-foreground'
                )}
              >
                <FileSpreadsheet
                  size={13}
                  className={showSummaryTable ? 'text-blue-500' : 'text-muted-foreground'}
                />
                <span>Tabel Rekap Skor</span>
                {showSummaryTable && <Check size={12} className="ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={() => setShowSignatures(!showSignatures)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors',
                  showSignatures
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                    : 'bg-background border-border text-muted-foreground'
                )}
              >
                <FileCheck2
                  size={13}
                  className={showSignatures ? 'text-emerald-500' : 'text-muted-foreground'}
                />
                <span>Lembar Tanda Tangan</span>
                {showSignatures && <Check size={12} className="ml-0.5" />}
              </button>
            </div>

            {/* Print Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="rounded-xl h-9 text-xs font-bold"
              >
                Tutup
              </Button>
              <Button
                size="sm"
                onClick={handlePrint}
                className="rounded-xl h-9 px-4 text-xs font-black bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
              >
                <Printer size={14} className="mr-1.5" />
                Cetak / Simpan ke PDF
              </Button>
            </div>
          </div>

          {/* ─── Scrollable Document Preview Area (Simulasi Lembar Kertas A4 Fisik) ─── */}
          <div className="flex-1 overflow-x-auto overflow-y-auto p-4 sm:p-8 bg-slate-200/80 dark:bg-slate-950 flex justify-center items-start">
            <div
              id="bagan-print-sheet"
              className={cn(
                'w-full bg-white text-slate-900 shadow-2xl rounded-xs border border-slate-300 transition-all p-6 sm:p-8 space-y-5 mx-auto shrink-0',
                orientation === 'landscape'
                  ? 'max-w-[285mm] min-h-[200mm]'
                  : 'max-w-[200mm] min-h-[285mm]'
              )}
            >
              <BaganPrintDocument
                title={title}
                kategori={kategori}
                format={format}
                status={status}
                singleBracket={singleBracket}
                heatBracket={heatBracket}
                teams={teams}
                prizes={prizes}
                options={{
                  showPrizes,
                  showSummaryTable,
                  showSignatures,
                  orientation,
                }}
              />
            </div>
          </div>
        </div>
      </ResponsiveDialog>
    </>
  );
}
