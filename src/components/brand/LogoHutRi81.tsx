import { useEffect, useRef } from 'react';
import { assets } from '../../assets';
import { gsap, shouldReduceMotion } from '../../lib/gsap';

/**
 * Logo resmi HUT RI ke-81 — Uses 100% authentic original SVG file with CSS color filter.
 * Accepts `variant="white"` for all-white appearance on dark/red backgrounds.
 */
export default function LogoHutRi81({
  className = 'h-full w-full',
  animate = true,
  variant = 'default',
  title = 'Logo resmi HUT RI ke-81',
}) {
  const containerRef = useRef(null);
  const isWhite = variant === 'white';

  useEffect(() => {
    if (!animate || !containerRef.current || shouldReduceMotion()) return undefined;

    // ✅ FIX: Kill any stale tween from a previous render before creating a new one.
    // This prevents duplicate infinite tweens when the component re-mounts (e.g. tab switches).
    gsap.killTweensOf(containerRef.current);

    const ctx = gsap.context(() => {
      // Smooth idle breathing pulse
      gsap.to(containerRef.current, {
        scale: 1.035,
        duration: 2.4,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
        transformOrigin: 'center center',
      });
    }, containerRef);

    return () => ctx.revert();
  }, [animate]);

  return (
    <div
      ref={containerRef}
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
    >
      <img
        src={assets.logoHutRi81Svg}
        alt={title}
        title={title}
        className={`h-full w-auto max-w-full object-contain ${
          isWhite ? 'brightness-0 invert' : ''
        }`}
      />
    </div>
  );
}
