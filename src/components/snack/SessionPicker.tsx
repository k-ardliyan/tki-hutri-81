/**
 * SessionPicker — combobox sesi snack (shadcn Popover + Command).
 * Menampilkan status efektif sesi (aktif/dijadwalkan/ditutup) + sisa stok.
 */

import { Check, ChevronsUpDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import type { SessionEffectiveStatus, SnackSessionWithMeta } from '../../server/functions/snack';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

export type SessionOption = SnackSessionWithMeta;

interface SessionPickerProps {
  sessions: SessionOption[];
  value: number | null;
  /** null = semua sesi / kembali ke sesi otomatis (per konteks halaman). */
  onChange: (id: number | null) => void;
  placeholder?: string;
  /** Label opsi "all" (value null). Default 'Semua Sesi'. */
  allLabel?: string;
}

const STATUS_BADGE: Record<SessionEffectiveStatus, { label: string; className: string }> = {
  draft: { label: 'DRAF', className: 'bg-muted text-muted-foreground' },
  scheduled: { label: 'DIJADWALKAN', className: 'bg-primary/10 text-primary' },
  active: { label: 'AKTIF', className: 'bg-success/10 text-success' },
  paused: { label: 'DIJEDA', className: 'bg-warning/10 text-warning' },
  closed: { label: 'DITUTUP', className: 'bg-muted text-muted-foreground' },
  archived: { label: 'ARSIP', className: 'bg-muted text-muted-foreground' },
};

export default function SessionPicker({
  sessions,
  value,
  onChange,
  placeholder = 'Pilih sesi...',
  allLabel = 'Semua Sesi',
}: SessionPickerProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const selected = sessions.find((s) => s.id === value) ?? null;

  useEffect(() => {
    if (!open) setQ('');
  }, [open]);

  const filtered = q.trim()
    ? sessions.filter((s) => s.name.toLowerCase().includes(q.trim().toLowerCase()))
    : sessions;

  const pick = (s: SessionOption | null) => {
    onChange(s?.id ?? null);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal sm:w-64"
        >
          {selected ? selected.name : placeholder}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Cari sesi..." value={q} onValueChange={setQ} />
          <CommandList className="max-h-64">
            <CommandEmpty>Tidak ada sesi cocok.</CommandEmpty>
            <CommandGroup>
              {/* Opsi "Semua Sesi" — clear filter / kembali ke sesi otomatis */}
              <CommandItem
                value="__all__"
                onSelect={() => pick(null)}
                className="flex items-center justify-between gap-2"
              >
                <span className="min-w-0 flex-1">
                  <span
                    className={cn('block truncate font-semibold', value === null && 'text-primary')}
                  >
                    {allLabel}
                  </span>
                  <span className="block text-[10px] text-muted-foreground">
                    {sessions.length} sesi terdaftar
                  </span>
                </span>
                {value === null && <Check className="size-4 shrink-0 text-primary" />}
              </CommandItem>
              {filtered.map((s) => {
                const isSelected = s.id === value;
                const st = STATUS_BADGE[s.effectiveStatus];
                return (
                  <CommandItem
                    key={s.id}
                    value={s.name}
                    onSelect={() => pick(s)}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn('block truncate font-semibold', isSelected && 'text-primary')}
                      >
                        {s.name}
                      </span>
                      <span className="block text-[10px] text-muted-foreground">
                        {s.remaining !== null && s.remaining > 0
                          ? `Sisa ${s.remaining}`
                          : s.remaining === 0 && (s.stockQuota ?? 0) > 0
                            ? 'Habis'
                            : s.entitled > 0
                              ? `${s.entitled} berhak`
                              : 'Tanpa stok'}
                      </span>
                    </span>
                    <Badge className={cn('shrink-0', st.className)}>{st.label}</Badge>
                    {isSelected && <Check className="size-4 shrink-0 text-primary" />}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
