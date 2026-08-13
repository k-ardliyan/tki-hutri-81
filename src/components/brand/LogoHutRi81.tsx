import { assets } from '../../assets';

/**
 * Logo resmi HUT RI ke-81 — Uses 100% authentic original SVG file with CSS color filter.
 * Accepts `variant="white"` for all-white appearance on dark/red backgrounds.
 * Idle breathing pulse via CSS keyframe (zero JS).
 */
export default function LogoHutRi81({
  className = 'h-full w-full',
  animate = true,
  variant = 'default',
  title = 'Logo resmi HUT RI ke-81',
}) {
  const isWhite = variant === 'white';

  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center ${
        animate ? 'animate-breathe-logo' : ''
      } ${className}`}
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
