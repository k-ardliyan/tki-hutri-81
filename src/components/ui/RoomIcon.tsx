/**
 * RoomIcon — peta ikon ruangan (dari rooms.json, nilai lama fa-*) ke lucide.
 */
import { Cog, Cpu, Handshake, Network, Server } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const MAP: Record<string, LucideIcon> = {
  'fa-gears': Cog,
  'fa-handshake': Handshake,
  'fa-microchip': Cpu,
  'fa-network-wired': Network,
  'fa-server': Server,
}

export default function RoomIcon({ name, size = 16, className }: { name: string; size?: number; className?: string }) {
  const Icon = MAP[name] ?? Cog
  return <Icon size={size} className={className} />
}
