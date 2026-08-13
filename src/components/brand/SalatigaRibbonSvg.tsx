import type { CSSProperties } from 'react';
import { assets } from '../../assets';

/**
 * Salatiga Tugu Jam decorative vector — infinite loops via CSS keyframes (zero JS).
 * Replaces GSAP: tugu float (animate-float-y), clock glow (animate-clock-pulse),
 * ribbons wave (animate-ribbon-red/white), particles (particleFloat w/ CSS vars).
 */
export default function SalatigaRibbonSvg({ className = 'h-full w-full' }) {
  return (
    <div className={`pointer-events-none ${className}`}>
      <svg
        viewBox="0 0 800 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full"
      >
        <defs>
          <linearGradient id="salatigaRibbonRed" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF4D4D" opacity="0.65" />
            <stop offset="50%" stopColor="#E11D48" opacity="0.55" />
            <stop offset="100%" stopColor="#9F1239" opacity="0.4" />
          </linearGradient>
          <radialGradient id="clockGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FCD34D" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#F59E0B" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* LAYER 1 (BEHIND): Waving Red-and-White Silk Ribbons */}
        <g id="ribbons-group">
          <path
            className="animate-ribbon-red"
            d="M -50 90 Q 220 170 480 70 T 850 150 L 850 210 Q 550 130 200 230 T -50 150 Z"
            fill="url(#salatigaRibbonRed)"
          />
          <path
            className="animate-ribbon-white"
            style={{ animationDelay: '0.2s' }}
            d="M -50 150 Q 220 230 580 130 T 850 210 L 850 255 Q 520 175 160 275 T -50 195 Z"
            fill="#FFFFFF"
            opacity="0.35"
          />
        </g>

        {/* LAYER 2 (FOREGROUND): Responsive Tugu Jam Group */}
        <g className="animate-float-y" style={{ animationDuration: '3.2s' }}>
          {/* Mobile & Tablet Layout (< 1024px) — Zoomed in, cropped bottom, matching hero aesthetic */}
          <g className="lg:hidden">
            {assets.tuguJamSalatigaSvg && (
              <image
                href={assets.tuguJamSalatigaSvg}
                xlinkHref={assets.tuguJamSalatigaSvg}
                x="370"
                y="-75"
                width="560"
                height="940"
                preserveAspectRatio="xMaxYMin slice"
                opacity="0.82"
                className="drop-shadow-2xl"
              />
            )}
            <circle cx="635" cy="150" r="60" fill="url(#clockGlow)" />
          </g>

          {/* Desktop Layout (>= 1024px) — Ultra Massive & Shifted Further Right */}
          <g className="hidden lg:inline">
            {assets.tuguJamSalatigaSvg && (
              <image
                href={assets.tuguJamSalatigaSvg}
                xlinkHref={assets.tuguJamSalatigaSvg}
                x="455"
                y="-90"
                width="700"
                height="1220"
                preserveAspectRatio="xMidYMin slice"
                opacity="0.85"
                className="drop-shadow-2xl"
              />
            )}
            <circle
              className="animate-clock-pulse"
              cx="805"
              cy="225"
              r="75"
              fill="url(#clockGlow)"
            />
          </g>
        </g>

        {/* LAYER 3: Floating Confetti / Sparkles */}
        <g id="particles-group">
          <circle
            className="particle-dot"
            style={
              { '--dx': '8px', '--dy': '-14px', '--dur': '2.5s', '--delay': '0s' } as CSSProperties
            }
            cx="160"
            cy="110"
            r="3"
            fill="#FCD34D"
          />
          <circle
            className="particle-dot"
            style={
              {
                '--dx': '-12px',
                '--dy': '-22px',
                '--dur': '3.2s',
                '--delay': '0.15s',
              } as CSSProperties
            }
            cx="290"
            cy="75"
            r="2.5"
            fill="#FFFFFF"
          />
          <circle
            className="particle-dot"
            style={
              {
                '--dx': '12px',
                '--dy': '-14px',
                '--dur': '2.5s',
                '--delay': '0.3s',
              } as CSSProperties
            }
            cx="430"
            cy="150"
            r="4"
            fill="#F59E0B"
          />
          <circle
            className="particle-dot"
            style={
              {
                '--dx': '-16px',
                '--dy': '-22px',
                '--dur': '3.2s',
                '--delay': '0.45s',
              } as CSSProperties
            }
            cx="550"
            cy="85"
            r="3"
            fill="#FCD34D"
          />
          <circle
            className="particle-dot"
            style={
              {
                '--dx': '8px',
                '--dy': '-30px',
                '--dur': '3.9s',
                '--delay': '0.6s',
              } as CSSProperties
            }
            cx="690"
            cy="130"
            r="2"
            fill="#FFFFFF"
          />
          <circle
            className="particle-dot"
            style={
              {
                '--dx': '-8px',
                '--dy': '-22px',
                '--dur': '3.2s',
                '--delay': '0.75s',
              } as CSSProperties
            }
            cx="370"
            cy="210"
            r="3.5"
            fill="#F59E0B"
          />
        </g>
      </svg>
    </div>
  );
}
