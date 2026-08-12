import { useLocation } from '@tanstack/react-router';
import { Badge } from '~/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '~/components/ui/breadcrumb';
import { Separator } from '~/components/ui/separator';
import { SidebarTrigger } from '~/components/ui/sidebar';

const ROUTE_LABELS: Record<string, string> = {
  '/audit': 'Dashboard',
  '/audit/isi': 'Isi Penilaian',
  '/audit/hasil': 'Hasil Audit',
  '/admin': 'Dashboard',
  '/admin/bagan': 'Bagan Pertandingan',
  '/admin/isi': 'Isi Penilaian',
  '/admin/hasil': 'Hasil Penilaian',
  '/admin/employees': 'Data Karyawan',
  '/admin/teams': 'Data Tim',
  '/admin/users': 'Manajemen Akun',
  '/snack/distribution': 'Distribusi Snack',
  '/snack/dashboard': 'Dashboard Snack',
  '/snack/history': 'Riwayat Distribusi',
  '/snack/sessions': 'Sesi Snack',
  '/snack/gelang': 'Gelang & QR',
};

export function SiteHeader({ title = 'Dashboard' }: { title?: string }) {
  const { pathname } = useLocation();
  const pageLabel = ROUTE_LABELS[pathname] ?? ROUTE_LABELS[pathname.replace(/\/$/, '')] ?? title;

  return (
    <header className="sticky top-0 z-10 flex h-(--header-height) shrink-0 items-center justify-between border-b bg-background/95 backdrop-blur-xs transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex items-center gap-2 px-4 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4 my-auto self-center" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden sm:inline-flex">
              <span className="text-xs text-muted-foreground font-medium">{title}</span>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden sm:inline-block" />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-sm font-semibold text-foreground">
                {pageLabel}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="mr-4 flex items-center gap-2 lg:mr-6">
        <Badge variant="outline" className="text-[10px] font-bold text-muted-foreground">
          HUT RI ke-81
        </Badge>
      </div>
    </header>
  );
}
