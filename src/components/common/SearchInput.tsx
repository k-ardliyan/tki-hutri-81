import { Search, X } from 'lucide-react';
import * as React from 'react';
import { Input } from '~/components/ui/input';
import { Spinner } from '~/components/ui/spinner';
import { cn } from '~/lib/utils';

export interface SearchInputProps extends Omit<React.ComponentProps<typeof Input>, 'prefix'> {
  loading?: boolean;
  onClear?: () => void;
  containerClassName?: string;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput(
    {
      className,
      containerClassName,
      loading = false,
      value,
      onChange,
      onClear,
      placeholder = 'Cari...',
      disabled,
      ...props
    },
    ref
  ) {
    const hasValue = value !== undefined && value !== null && String(value).length > 0;

    return (
      <div className={cn('relative flex items-center w-full', containerClassName)}>
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none shrink-0"
        />
        <Input
          ref={ref}
          type="text"
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            'pl-9 pr-9 h-10 text-sm rounded-xl bg-background transition-colors',
            className
          )}
          {...props}
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading ? (
            <Spinner className="size-4 animate-spin text-primary shrink-0" />
          ) : hasValue && onClear ? (
            <button
              type="button"
              onClick={onClear}
              disabled={disabled}
              className="rounded-full p-1 text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              aria-label="Bersihkan pencarian"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>
      </div>
    );
  }
);
