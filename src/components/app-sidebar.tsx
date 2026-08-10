/**
 * AppSidebar — sidebar block (sidebar-07 pattern) dengan nav grouped per section.
 * Collapse-to-icon di desktop, Sheet drawer di mobile.
 */
import * as React from 'react'
import { useLocation } from '@tanstack/react-router'
import { ArrowLeft, ClipboardCheck } from 'lucide-react'
import type { NavSection } from '~/lib/nav'
import { NavUser } from '~/components/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '~/components/ui/sidebar'

export function AppSidebar({
  sections,
  title,
  subtitle = 'HUT RI ke-81',
  userName = 'User',
  roleLabel,
  dark,
  onToggleDark,
  onNav,
  onLogout,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  sections: NavSection[]
  title: string
  subtitle?: string
  userName?: string
  roleLabel?: string
  dark: boolean
  onToggleDark: () => void
  onNav: (path: string) => void
  onLogout: () => void
}) {
  const { pathname } = useLocation()
  const { setOpenMobile } = useSidebar()

  const active =
    sections
      .flatMap((s) => s.items)
      .filter(
        (n) =>
          pathname === n.path ||
          pathname.startsWith(`${n.path}/`) ||
          pathname.startsWith(n.path),
      )
      .sort((a, b) => b.path.length - a.path.length)[0]?.id ?? null

  const go = (path: string) => {
    setOpenMobile(false)
    onNav(path)
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-2 py-1.5 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary/10 text-sidebar-primary">
            <ClipboardCheck size={16} />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-bold text-sidebar-foreground">{title}</p>
            <p className="truncate text-[10px] text-sidebar-foreground/60">{subtitle}</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {sections.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
            <SidebarMenu>
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive = active === item.id
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      tooltip={item.label}
                      isActive={isActive}
                      onClick={() => go(item.path)}
                    >
                      <Icon />
                      <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Kembali ke Situs">
              <a href="/">
                <ArrowLeft />
                <span className="group-data-[collapsible=icon]:hidden">Kembali ke Situs</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <NavUser
          user={{
            name: userName,
            role: roleLabel,
          }}
          dark={dark}
          onToggleDark={onToggleDark}
          onLogout={onLogout}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

