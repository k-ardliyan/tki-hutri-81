/**
 * SessionPicker — combobox sesi snack (shadcn Popover + Command).
 * Mobile-first: trigger menampilkan sesi terpilih, popover berisi pencarian.
 */

import { Check, ChevronsUpDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
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

export interface SessionOption {
  id: number;
  name: string;
  quota: number;
  isActive: boolean;
  redeemed?: number;
  remaining?: number;
}

interface SessionPickerProps {
  sessions: SessionOption[];
  value: number | null;
  onChange: (id: number) => void;
  placeholder?: string;
}

export default function SessionPicker({
  sessions,
  value,
  onChange,
  placeholder = 'Pilih sesi...',
}: SessionPickerProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const selected = sessions.find((s) => s.id === value) ?? null;

  // Tutup saat q berubah kosong (perilaku combobox standar)
  useEffect(() => {
    if (!open) setQ('');
  }, [open]);

  const filtered = q.trim()
    ? sessions.filter((s) => s.name.toLowerCase().includes(q.trim().toLowerCase()))
    : sessions;

  const pick = (s: SessionOption) => {
    onChange(s.id);
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
              {filtered.map((s) => {
                const isSelected = s.id === value;
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
                        {s.remaining !== undefined && s.remaining > 0
                          ? `Sisa ${s.remaining} dari ${s.quota}`
                          : s.remaining === 0 && s.quota > 0
                            ? 'Habis'
                            : `Kuota ${s.quota} porsi`}
                      </span>
                    </span>
                    {s.isActive && (
                      <Badge className="shrink-0 bg-success/10 text-success">AKTIF</Badge>
                    )}
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
