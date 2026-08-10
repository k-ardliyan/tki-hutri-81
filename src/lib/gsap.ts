import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Single registration point — import '~/lib/gsap' in any component that needs GSAP.
gsap.registerPlugin(ScrollTrigger)

export { gsap, ScrollTrigger }
export default gsap

export function shouldReduceMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}
