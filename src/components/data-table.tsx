import {
  type ColumnDef,
  type ColumnVisibilityState,
  columnVisibilityFeature,
  createPaginatedRowModel,
  createSortedRowModel,
  FlexRender,
  rowPaginationFeature,
  rowSortingFeature,
  type SortingState,
  tableFeatures,
  useTable,
} from '@tanstack/react-table';
import * as React from 'react';

import { Button } from '~/components/ui/button';
import { Combobox, type ComboboxOption } from '~/components/ui/combobox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { Label } from '~/components/ui/label';

const pageSizeOptions: ComboboxOption[] = [10, 15, 20, 30, 50].map((ps) => ({
  value: `${ps}`,
  label: `${ps}`,
}));

import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ChevronsUpDownIcon,
  Columns3Icon,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';

// v9: only the features used here are registered — the rest is tree-shaken.
export const features = tableFeatures({
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSortingFeature,
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
});

export type DataTableColumn<T extends Record<string, any> | Array<any> = any> = ColumnDef<
  typeof features,
  T,
  any
>;

export function DataTable<TData extends Record<string, any> | Array<any> = any>({
  data,
  columns,
  toolbar,
  getRowId,
  pageSize = 10,
}: {
  data: TData[];
  columns: DataTableColumn<TData>[];
  toolbar?: React.ReactNode;
  getRowId?: (row: TData, index: number) => string;
  pageSize?: number;
}) {
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({});
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize,
  });

  const table = useTable<typeof features, any>({
    features,
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      pagination,
    },
    getRowId: getRowId
      ? (row: unknown, index: number) => getRowId(row as TData, index)
      : (_, index) => String(index),
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
  });

  return (
    <div className="w-full space-y-4">
      {/* Table Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-semibold">
                <Columns3Icon className="size-3.5 text-muted-foreground" />
                Kolom
                <ChevronDownIcon className="size-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40 rounded-xl">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize text-xs"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
      </div>

      {/* Table Surface with Background & Card styling */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/60">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className="text-xs font-bold text-foreground"
                    >
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="flex items-center gap-1.5 font-bold hover:text-primary transition-colors"
                        >
                          <FlexRender header={header} />
                          {header.column.getIsSorted() === 'asc' ? (
                            <ArrowUpIcon className="size-3.5 text-primary" />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <ArrowDownIcon className="size-3.5 text-primary" />
                          ) : (
                            <ChevronsUpDownIcon className="size-3.5 opacity-40" />
                          )}
                        </button>
                      ) : (
                        <FlexRender header={header} />
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted/50 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-3 text-sm">
                        <FlexRender cell={cell} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-32 text-center text-sm text-muted-foreground"
                  >
                    Tidak ada data ditemukan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination Footer — Spread Out (Kanan Kiri) with Proper Margin */}
      <div className="flex flex-col-reverse items-center justify-between gap-4 pt-1 sm:flex-row px-1">
        <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
          <div className="flex items-center gap-2">
            <Label
              htmlFor="rows-per-page"
              className="flex items-center text-xs font-medium text-muted-foreground leading-none"
            >
              Baris per halaman
            </Label>
            <Combobox
              options={pageSizeOptions}
              value={`${pagination.pageSize}`}
              onValueChange={(value) => table.setPageSize(Number(value))}
              showSearch={false}
              size="sm"
              triggerClassName="h-8 w-20 text-xs font-medium"
            />
          </div>
          <div className="flex items-center leading-none">
            Halaman{' '}
            <span className="font-bold text-foreground mx-1">{pagination.pageIndex + 1}</span> dari{' '}
            <span className="font-bold text-foreground ml-1">
              {Math.max(1, table.getPageCount())}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            className="hidden size-8 sm:flex"
            size="icon"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Ke halaman pertama</span>
            <ChevronsLeftIcon className="size-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 px-3 text-xs font-medium gap-1"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeftIcon className="size-4" />
            Sebelumnya
          </Button>
          <Button
            variant="outline"
            className="h-8 px-3 text-xs font-medium gap-1"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Berikutnya
            <ChevronRightIcon className="size-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden size-8 sm:flex"
            size="icon"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Ke halaman terakhir</span>
            <ChevronsRightIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
