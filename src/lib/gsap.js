import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// ─── Global GSAP Configuration ────────────────────────────────────────────────
gsap.config({
  autoSleep: 60,
  force3D: false,
  nullTargetWarn: false,
})

// Prevent "catch up" frames after tab-switch (causes animations to appear frozen)
gsap.ticker.lagSmoothing(0)

// overwrite: 'auto' — When two tweens animate the same property on the same target,
// GSAP automatically kills only the conflicting property instead of letting them fight.
// This prevents invisible cards caused by stacked conflicting tweens.
gsap.defaults({ overwrite: 'auto' })

export { gsap, ScrollTrigger }

export function shouldReduceMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}