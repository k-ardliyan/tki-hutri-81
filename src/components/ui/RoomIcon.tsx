/**
 * RoomIcon — peta ikon ruangan (dari rooms.json, nilai lama fa-*) ke lucide dengan pewarnaan yang kaya.
 */
import { Cog, Cpu, Handshake, Network, Server } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const MAP: Record<string, { icon: LucideIcon; colorCls: string }> = {
  'fa-gears': { icon: Cog, colorCls: 'text-emerald-600 dark:text-emerald-400' },
  'fa-handshake': { icon: Handshake, colorCls: 'text-amber-600 dark:text-amber-400' },
  'fa-microchip': { icon: Cpu, colorCls: 'text-purple-600 dark:text-purple-400' },
  'fa-network-wired': { icon: Network, colorCls: 'text-cyan-600 dark:text-cyan-400' },
  'fa-server': { icon: Server, colorCls: 'text-blue-600 dark:text-blue-400' },
};

export default function RoomIcon({
  name,
  size = 16,
  className = '',
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const item = MAP[name] ?? { icon: Cog, colorCls: 'text-primary' };
  const Icon = item.icon;
  const combinedCls = className ? `${item.colorCls} ${className}` : item.colorCls;

  return <Icon size={size} className={combinedCls} />;
}
