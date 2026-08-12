/**
 * WristbandSvg — Vektor SVG murni Gelang Snack HUT RI ke-81.
 * Spesifikasi Dimensi Fisik: 190 mm (Panjang) x 25 mm (Lebar)
 * Rasio viewBox: 1000 x 132 (~7.6 : 1)
 *
 * Menggunakan 100% path vektor autentik dari gelangpng.svg:
 * 1. Left Red Tab + 9 Kolom Garis Gelombang Perforasi Abu-Abu (#A9A8A7) (Rata tengah Y=66)
 * 2. Kotak Putih QR Code tim + 4 pasang bulir padi putih & 4 pasang bulir padi biru (Rata tengah Y=66 sejajar QR)
 * 3. Cutout putih diagonal bergerigi halus (fine sawtooth) dengan Nama & Nomor Tim (Rata tengah Y=66)
 * 4. Ornamen HUT RI:
 *    - Logo 81 Hijau Neon (#C5D93D) + Lotus Biru (#4A6CB2) (Rata tengah Y=66)
 *    - Pita Kurva "S" Ungu (#7855A1) (Rata tengah Y=66)
 *    - Teks branding 3 baris: "PITULASAN WARGA TKI - FTP" (Rata tengah Y=66)
 * 5. Fastener 4 panah petunjuk arah (Rata tengah Y=66) + Tab Merah Ujung Kanan
 */

import type React from 'react';

export interface WristbandData {
  nama: string;
  kode: string;
  kategori?: string;
  nomor?: number | string | null;
  memberName?: string;
}

export interface WristbandSvgProps extends React.SVGProps<SVGSVGElement> {
  data: WristbandData;
  qrDataUrl?: string;
  /** Warna latar utama gelang (default: Merah Resmi #ED323E) */
  primaryColor?: string;
  /** Teks baris sub-branding (default: PITULASAN, WARGA, TKI - FTP) */
  brandLines?: [string, string, string];
  /** Tampilkan garis batas potong luar jika diperlukan */
  showCutBorder?: boolean;
}

/** Helper untuk memecah nama tim menjadi judul dan nomor jika belum dipisah */
export function parseTeamName(data: WristbandData): { line1: string; line2: string } {
  if (data.memberName) {
    return {
      line1: data.nama.toUpperCase(),
      line2: data.memberName.toUpperCase(),
    };
  }

  const rawName = data.nama.trim().toUpperCase();

  // Pola: "TIM PUTRI 1" -> "TIM PUTRI" & "1"
  const matchNum = rawName.match(/^(.*?)[\s\-_]+(\d+)$/);
  if (matchNum) {
    return {
      line1: matchNum[1].trim(),
      line2: matchNum[2].trim(),
    };
  }

  // Pola jika ada nomor eksplisit di data.nomor
  if (data.nomor !== undefined && data.nomor !== null && data.nomor !== '') {
    return {
      line1: rawName,
      line2: String(data.nomor),
    };
  }

  // Jika nama tim panjang (> 12 char), pisahkan 2 baris kata
  if (rawName.includes(' ') && rawName.length > 11) {
    const words = rawName.split(' ');
    const mid = Math.ceil(words.length / 2);
    return {
      line1: words.slice(0, mid).join(' '),
      line2: words.slice(mid).join(' '),
    };
  }

  return {
    line1: rawName,
    line2: '',
  };
}

/**
 * Generator kurva gerigi diagonal murni (fine sawtooth) untuk tinggi 25mm (H=132):
 * - Sisi kiri miring: (505, 0) -> (400, 132) dengan 13 gerigi tajam.
 * - Sisi kanan miring: (618, 132) -> (724, 0) dengan 13 gerigi tajam.
 */
function buildAccurateSawtoothPath(): string {
  const numTeeth = 13;
  const H = 132;
  // Sisi kiri miring: (505, 0) ke (400, H)
  let path = `M 505,0 `;
  for (let i = 0; i < numTeeth; i++) {
    const yMid = ((i + 0.5) / numTeeth) * H;
    const y1 = ((i + 1) / numTeeth) * H;
    const xBase0 = 505 - (i / numTeeth) * 105;
    const xBase1 = 505 - ((i + 1) / numTeeth) * 105;
    const xTip = (xBase0 + xBase1) / 2 - 8;
    path += `L ${xTip.toFixed(1)},${yMid.toFixed(1)} L ${xBase1.toFixed(1)},${y1.toFixed(1)} `;
  }

  // Sisi bawah ke kanan
  path += `L 618,${H} `;

  // Sisi kanan miring: (618, H) ke (724, 0)
  for (let i = numTeeth; i > 0; i--) {
    const yMid = ((i - 0.5) / numTeeth) * H;
    const yTop = ((i - 1) / numTeeth) * H;
    const xBaseBottom = 618 + ((numTeeth - i) / numTeeth) * 106;
    const xBaseTop = 618 + ((numTeeth - (i - 1)) / numTeeth) * 106;
    const xTip = (xBaseBottom + xBaseTop) / 2 - 8;
    path += `L ${xTip.toFixed(1)},${yMid.toFixed(1)} L ${xBaseTop.toFixed(1)},${yTop.toFixed(1)} `;
  }

  path += 'Z';
  return path;
}

const ACCURATE_SAWTOOTH_PATH = buildAccurateSawtoothPath();

/** Hitung ukuran font & posisi Y baris 1 (tinggi 25mm, rata tengah) */
function getLine1Props(text: string): { fontSize: number; y: number } {
  const len = text.length;
  if (len <= 10) return { fontSize: 18, y: 52 };
  if (len <= 14) return { fontSize: 16, y: 52 };
  if (len <= 18) return { fontSize: 14, y: 52 };
  return { fontSize: 12.5, y: 52 };
}

/** Hitung ukuran font & posisi Y baris 2 (tinggi 25mm, rata tengah) */
function getLine2Props(text: string): { fontSize: number; y: number } {
  const isNumber = /^\d+$/.test(text.trim());
  if (isNumber) {
    return { fontSize: 34, y: 98 };
  }
  const len = text.length;
  if (len <= 8) return { fontSize: 17, y: 86 };
  if (len <= 12) return { fontSize: 15, y: 86 };
  if (len <= 16) return { fontSize: 13.5, y: 86 };
  if (len <= 20) return { fontSize: 12, y: 86 };
  if (len <= 25) return { fontSize: 10.5, y: 86 };
  return { fontSize: 9.5, y: 86 };
}

export function WristbandSvg({
  data,
  qrDataUrl,
  primaryColor = '#ED323E',
  brandLines = ['PITULASAN', 'WARGA', 'TKI - FTP'],
  showCutBorder = false,
  className,
  style,
  ...props
}: WristbandSvgProps) {
  const { line1, line2 } = parseTeamName(data);
  const line1Props = getLine1Props(line1);
  const line2Props = line2 ? getLine2Props(line2) : null;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1000 132"
      width="100%"
      height="100%"
      className={`select-none overflow-visible ${className ?? ''}`}
      style={{ aspectRatio: '1000 / 132', display: 'block', ...style }}
      {...props}
    >
      <defs>
        {/* Clip path pengaman agar teks 100% berada di dalam area putih */}
        <clipPath id="center-cutout-clip">
          <path d={ACCURATE_SAWTOOTH_PATH} />
        </clipPath>
      </defs>

      {/* ─── 0. BASE LATAR MERAH KESELURUHAN (Tinggi 132 ~ 25mm) ─── */}
      <rect x="0" y="0" width="1000" height="132" fill={primaryColor} />

      {/* ─── 1. TAB UJUNG KIRI (Merah) ─── */}
      <rect x="0" y="0" width="31" height="132" fill={primaryColor} />

      {/* ─── 2. ZONA PENGAMAN PERFORASI (Putih + 9 Kolom Gelombang Zigzag - Rata Tengah Y=66) ─── */}
      <rect x="31" y="0" width="177" height="132" fill="#FEFEFE" />
      {[44, 62, 80, 98, 116, 134, 152, 170, 188].map((gx) => (
        <path
          key={gx}
          d={`M ${gx},18 L ${gx - 4},26 L ${gx + 4},34 L ${gx - 4},42 L ${gx + 4},50 L ${gx - 4},58 L ${gx + 4},66 L ${gx - 4},74 L ${gx + 4},82 L ${gx - 4},90 L ${gx + 4},98 L ${gx - 4},106 L ${gx},114`}
          stroke="#A9A8A7"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.9"
        />
      ))}

      {/* ─── 3. ZONA KIRI: KOTAK QR CODE & MOTIF PADI (Rata Tengah Sempurna Y=66) ─── */}
      {/* Kotak Putih QR (Tengah Y=66, y=18..114) */}
      <rect x="226" y="18" width="96" height="96" rx="4" fill="#FFFFFF" />
      {qrDataUrl ? (
        <image
          href={qrDataUrl}
          x="230"
          y="22"
          width="88"
          height="88"
          preserveAspectRatio="xMidYMid meet"
        />
      ) : (
        <g transform="translate(230, 22)">
          <rect width="88" height="88" fill="#F8FAFC" rx="3" />
          <text
            x="44"
            y="49"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontSize="11"
            fontWeight="bold"
            fill="#94A3B8"
            textAnchor="middle"
          >
            QR CODE
          </text>
        </g>
      )}

      {/* Kolom Padi Putih (4 pasang autentik - Rata Tengah Y=66 sejajar QR) */}
      <g fill="#FEFEFE" transform="translate(340, 66) scale(0.72) translate(-530, -86.85)">
        <path d="M 518.96 55.98 C 525.52 50.54 535.94 50.98 542.03 56.94 C 545.76 60.24 547.29 65.17 547.81 69.98 C 539.21 69.97 531.46 63.51 529.96 55.03 C 528.39 63.48 520.72 69.97 512.11 69.99 C 512.56 64.68 514.59 59.28 518.96 55.98 Z" />
        <path d="M 518.20 74.20 C 524.72 68.04 535.96 68.27 542.22 74.70 C 545.86 77.99 547.31 82.87 547.81 87.61 C 539.06 87.47 531.26 80.88 529.89 72.21 C 528.75 80.94 520.75 87.47 512.08 87.60 C 512.57 82.62 514.26 77.52 518.20 74.20 Z" />
        <path d="M 519.58 90.62 C 526.33 85.48 536.65 86.35 542.49 92.48 C 545.93 95.73 547.23 100.44 547.84 104.99 C 539.16 105.21 531.44 98.50 529.92 90.05 C 528.49 98.54 520.71 105.12 512.09 105.04 C 512.57 99.49 514.85 93.85 519.58 90.62 Z" />
        <path d="M 521.76 106.81 C 529.61 102.47 540.36 105.42 544.93 113.13 C 546.81 115.98 547.30 119.42 547.81 122.73 C 539.06 122.55 531.14 115.96 529.93 107.20 C 528.78 115.97 520.82 122.55 512.09 122.72 C 512.45 116.23 515.81 109.79 521.76 106.81 Z" />
      </g>

      {/* Kolom Padi Biru (#4A6CB2 - 4 pasang autentik - Rata Tengah Y=66 sejajar QR) */}
      <g fill="#4A6CB2" transform="translate(385, 66) scale(0.72) translate(-595.7, -88.06)">
        <path d="M 577.93 51.95 C 582.33 52.38 586.87 53.62 590.12 56.80 C 593.31 59.54 594.87 63.58 595.86 67.56 C 595.10 68.34 594.35 69.12 593.59 69.88 C 589.59 68.92 585.54 67.37 582.79 64.17 C 579.60 60.92 578.33 56.37 577.93 51.95 Z M 600.11 58.06 C 603.42 54.10 608.56 52.43 613.54 51.86 C 613.14 56.21 612.00 60.70 608.90 63.96 C 605.62 67.87 600.54 69.54 595.62 70.11 C 595.96 65.78 596.99 61.29 600.11 58.06 Z" />
        <path d="M 577.83 69.56 C 586.54 69.55 594.69 76.19 595.61 85.00 C 596.72 80.12 599.20 75.37 603.53 72.63 C 606.47 70.53 610.11 69.98 613.59 69.45 C 613.13 74.35 611.55 79.38 607.71 82.70 C 601.40 88.85 590.49 88.93 584.04 82.96 C 580.06 79.66 578.43 74.52 577.83 69.56 Z" />
        <path d="M 577.98 86.99 C 586.68 87.32 594.95 93.89 595.61 102.88 C 596.53 98.17 598.77 93.56 602.78 90.73 C 605.84 88.25 609.82 87.52 613.63 87.04 C 613.15 92.98 610.51 99.02 605.23 102.17 C 597.71 107.22 586.56 105.09 581.44 97.62 C 579.10 94.57 578.31 90.73 577.98 86.99 Z" />
        <path d="M 577.86 104.64 C 586.58 104.65 594.54 111.30 595.69 120.01 C 597.01 111.32 604.86 104.68 613.62 104.61 C 613.06 109.21 611.77 113.98 608.27 117.25 C 602.35 123.53 591.75 124.26 585.02 118.86 C 580.46 115.59 578.39 110.05 577.86 104.64 Z" />
      </g>

      {/* ─── 4. ZONA TENGAH: CUTOUT PUTIH BERGERIGI & NAMA TIM ─── */}
      <path d={ACCURATE_SAWTOOTH_PATH} fill="#FEFEFE" />

      {/* Teks Nama Tim & Nomor (Proporsional alami, tidak gepeng) */}
      <g
        fontFamily="'Plus Jakarta Sans', system-ui, -apple-system, Inter, sans-serif"
        textAnchor="middle"
        fill="#3A3738"
        clipPath="url(#center-cutout-clip)"
      >
        {line2 ? (
          <>
            <text
              x="562"
              y={line1Props.y}
              fontSize={line1Props.fontSize}
              fontWeight="900"
              letterSpacing="0.4"
            >
              {line1}
            </text>
            <text
              x="562"
              y={line2Props?.y ?? 86}
              fontSize={line2Props?.fontSize ?? 13.5}
              fontWeight="900"
              letterSpacing="0.3"
            >
              {line2}
            </text>
          </>
        ) : (
          <text
            x="562"
            y="72"
            fontSize={line1.length > 14 ? 17 : 20}
            fontWeight="900"
            letterSpacing="0.5"
          >
            {line1}
          </text>
        )}
      </g>

      {/* ─── 5. ZONA KANAN: ORNAMEN HUT RI 81 & TEKS BRANDING (Rata Tengah Sempurna Y=66) ─── */}
      {/* 5a. Logo Grafis 81 Hijau Neon (#C5D93D) + Lotus Biru (#4A6CB2) - Cluster Terpusat Y=66 */}
      <g transform="translate(675, 66) scale(0.68) translate(-1055, -91.53)">
        {/* Logo 81 Hijau Neon */}
        <g fill="#C5D93D">
          <path d="M 1130.07 43.04 C 1134.41 43.01 1138.75 43.01 1143.10 43.04 C 1140.60 47.83 1138.05 52.58 1135.53 57.35 C 1133.79 60.61 1132.33 64.09 1129.78 66.83 C 1125.70 67.86 1121.45 67.24 1117.30 67.30 C 1121.41 59.14 1125.83 51.14 1130.07 43.04 Z" />
          <path d="M 1143.20 66.78 C 1147.21 58.80 1151.64 50.92 1155.81 42.98 C 1160.14 43.02 1164.48 43.03 1168.83 43.05 C 1165.22 49.74 1161.66 56.46 1158.16 63.20 C 1157.18 64.76 1156.36 66.80 1154.43 67.34 C 1150.69 67.48 1146.85 67.72 1143.20 66.78 Z" />
          <path d="M 1130.10 68.01 C 1133.82 66.94 1138.25 66.33 1141.80 68.18 C 1142.36 69.49 1141.33 70.60 1140.84 71.73 C 1137.19 78.26 1133.76 84.92 1130.25 91.53 C 1125.91 91.57 1121.57 91.58 1117.23 91.59 C 1120.60 84.88 1124.29 78.32 1127.69 71.62 C 1128.39 70.37 1128.98 68.98 1130.10 68.01 Z" />
          <path d="M 1153.12 72.01 C 1154.02 70.30 1154.53 68.11 1156.57 67.39 C 1160.61 66.84 1164.71 67.22 1168.78 67.24 C 1164.45 75.37 1160.24 83.56 1155.77 91.62 C 1151.49 91.56 1147.21 91.57 1142.93 91.57 C 1146.17 84.96 1149.88 78.61 1153.12 72.01 Z" />
        </g>
        {/* Lotus Biru */}
        <g fill="#4A6CB2">
          <path d="M 1087.31 101.38 C 1090.11 99.88 1093.74 100.81 1095.77 103.17 C 1098.95 106.60 1099.30 111.58 1099.01 116.02 C 1098.68 122.06 1096.26 127.68 1094.04 133.22 C 1099.26 126.75 1104.75 119.60 1113.05 117.07 C 1117.01 115.68 1122.42 116.51 1124.41 120.62 C 1126.28 124.92 1123.68 129.62 1120.25 132.25 C 1113.43 137.61 1104.49 139.01 1096.08 139.63 C 1085.57 140.09 1074.55 139.67 1064.89 135.08 C 1060.25 132.80 1055.39 128.63 1055.67 122.98 C 1056.00 118.12 1061.54 115.56 1065.88 116.66 C 1075.28 118.64 1081.69 126.62 1087.00 134.04 C 1084.15 127.04 1081.10 119.76 1081.61 112.04 C 1081.91 107.97 1083.40 103.34 1087.31 101.38 Z" />
        </g>
      </g>

      {/* 5b. Pita Kurva "S" Ungu (#7855A1) - Rata Tengah Y=66 */}
      <g fill="#7855A1" transform="translate(755, 66) scale(0.68) translate(-1183, -90.38)">
        <path d="M 1252.71 60.65 C 1264.20 55.61 1278.46 57.75 1287.85 66.13 C 1295.12 72.30 1299.15 81.66 1299.47 91.12 C 1293.68 91.39 1287.89 91.64 1282.10 91.71 C 1281.37 87.03 1279.95 82.10 1275.99 79.12 C 1269.34 73.30 1258.03 74.78 1253.08 82.09 C 1248.86 87.49 1250.68 94.74 1248.64 100.88 C 1244.76 114.63 1231.28 124.83 1217.00 124.82 C 1203.17 125.16 1189.83 115.95 1185.20 102.92 C 1183.79 99.27 1183.31 95.36 1183.09 91.49 C 1188.88 91.34 1194.67 91.16 1200.47 91.05 C 1200.95 96.47 1203.34 101.98 1208.21 104.81 C 1215.03 109.36 1225.04 107.22 1229.57 100.44 C 1232.60 96.56 1232.24 91.44 1232.84 86.82 C 1234.23 75.40 1242.12 65.11 1252.71 60.65 Z" />
      </g>

      {/* 5c. Teks Branding Putih 3 Baris - Rata Tengah Y=66 */}
      <g
        fontFamily="'Plus Jakarta Sans', system-ui, -apple-system, Inter, sans-serif"
        fontWeight="900"
        fontSize="14.5"
        fill="#FDFAFA"
        letterSpacing="0.4"
        textAnchor="start"
      >
        <text x="838" y="42">
          {brandLines[0]}
        </text>
        <text x="838" y="66">
          {brandLines[1]}
        </text>
        <text x="838" y="90">
          {brandLines[2]}
        </text>
      </g>

      {/* ─── 6. ZONA FASTENER KANAN: PANAH PETUNJUK ARAH (Rata Tengah Y=66) ─── */}
      <rect x="932" y="0" width="36" height="132" fill="#FEFEFE" />
      {[36, 56, 76, 96].map((arrowY) => (
        <g
          key={arrowY}
          stroke="#A9A8A7"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="938" y1={arrowY} x2="962" y2={arrowY} />
          <polyline points={`956,${arrowY - 4} 962,${arrowY} 956,${arrowY + 4}`} />
        </g>
      ))}

      {/* ─── 7. TAB UJUNG KANAN (Merah) ─── */}
      <rect x="968" y="0" width="32" height="132" fill={primaryColor} />

      {/* Border opsional batas potong cetak */}
      {showCutBorder && (
        <rect
          x="0.5"
          y="0.5"
          width="999"
          height="131"
          fill="none"
          stroke="#CBD5E1"
          strokeWidth="1"
          strokeDasharray="4 3"
        />
      )}
    </svg>
  );
}

/**
 * Generate string XML SVG standalone murni untuk keperluan ekspor file .svg mandiri (190x25mm).
 */
export function generateWristbandSvgString({
  data,
  qrDataUrl = '',
  primaryColor = '#ED323E',
  brandLines = ['PITULASAN', 'WARGA', 'TKI - FTP'],
}: {
  data: WristbandData;
  qrDataUrl?: string;
  primaryColor?: string;
  brandLines?: [string, string, string];
}): string {
  const { line1, line2 } = parseTeamName(data);
  const line1Props = getLine1Props(line1);
  const line2Props = line2 ? getLine2Props(line2) : null;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1000 132" width="1000" height="132">
  <defs>
    <clipPath id="center-cutout-clip">
      <path d="${ACCURATE_SAWTOOTH_PATH}" />
    </clipPath>
  </defs>
  <rect x="0" y="0" width="1000" height="132" fill="${primaryColor}" />
  <rect x="0" y="0" width="31" height="132" fill="${primaryColor}" />
  <rect x="31" y="0" width="177" height="132" fill="#FEFEFE" />
  <g stroke="#A9A8A7" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.9">
    <path d="M 44,18 L 40,26 L 48,34 L 40,42 L 48,50 L 40,58 L 48,66 L 40,74 L 48,82 L 40,90 L 48,98 L 40,106 L 44,114" />
    <path d="M 62,18 L 58,26 L 66,34 L 58,42 L 66,50 L 58,58 L 66,66 L 58,74 L 66,82 L 58,90 L 66,98 L 58,106 L 62,114" />
    <path d="M 80,18 L 76,26 L 84,34 L 76,42 L 84,50 L 76,58 L 84,66 L 76,74 L 84,82 L 76,90 L 84,98 L 76,106 L 80,114" />
    <path d="M 98,18 L 94,26 L 102,34 L 94,42 L 102,50 L 94,58 L 102,66 L 94,74 L 102,82 L 94,90 L 102,98 L 94,106 L 98,114" />
    <path d="M 116,18 L 112,26 L 120,34 L 112,42 L 120,50 L 112,58 L 120,66 L 112,74 L 120,82 L 112,90 L 120,98 L 112,106 L 116,114" />
    <path d="M 134,18 L 130,26 L 138,34 L 130,42 L 138,50 L 130,58 L 138,66 L 130,74 L 138,82 L 130,90 L 138,98 L 130,106 L 134,114" />
    <path d="M 152,18 L 148,26 L 156,34 L 148,42 L 156,50 L 148,58 L 156,66 L 148,74 L 156,82 L 148,90 L 156,98 L 148,106 L 152,114" />
    <path d="M 170,18 L 166,26 L 174,34 L 166,42 L 174,50 L 166,58 L 174,66 L 166,74 L 174,82 L 166,90 L 174,98 L 166,106 L 170,114" />
    <path d="M 188,18 L 184,26 L 192,34 L 184,42 L 192,50 L 184,58 L 192,66 L 184,74 L 192,82 L 184,90 L 192,98 L 184,106 L 188,114" />
  </g>
  <rect x="226" y="18" width="96" height="96" rx="4" fill="#FFFFFF" />
  ${qrDataUrl ? `<image href="${qrDataUrl}" x="230" y="22" width="88" height="88" preserveAspectRatio="xMidYMid meet" />` : ''}
  <g fill="#FEFEFE" transform="translate(340, 66) scale(0.72) translate(-530, -86.85)">
    <path d="M 518.96 55.98 C 525.52 50.54 535.94 50.98 542.03 56.94 C 545.76 60.24 547.29 65.17 547.81 69.98 C 539.21 69.97 531.46 63.51 529.96 55.03 C 528.39 63.48 520.72 69.97 512.11 69.99 C 512.56 64.68 514.59 59.28 518.96 55.98 Z" />
    <path d="M 518.20 74.20 C 524.72 68.04 535.96 68.27 542.22 74.70 C 545.86 77.99 547.31 82.87 547.81 87.61 C 539.06 87.47 531.26 80.88 529.89 72.21 C 528.75 80.94 520.75 87.47 512.08 87.60 C 512.57 82.62 514.26 77.52 518.20 74.20 Z" />
    <path d="M 519.58 90.62 C 526.33 85.48 536.65 86.35 542.49 92.48 C 545.93 95.73 547.23 100.44 547.84 104.99 C 539.16 105.21 531.44 98.50 529.92 90.05 C 528.49 98.54 520.71 105.12 512.09 105.04 C 512.57 99.49 514.85 93.85 519.58 90.62 Z" />
    <path d="M 521.76 106.81 C 529.61 102.47 540.36 105.42 544.93 113.13 C 546.81 115.98 547.30 119.42 547.81 122.73 C 539.06 122.55 531.14 115.96 529.93 107.20 C 528.78 115.97 520.82 122.55 512.09 122.72 C 512.45 116.23 515.81 109.79 521.76 106.81 Z" />
  </g>
  <g fill="#4A6CB2" transform="translate(385, 66) scale(0.72) translate(-595.7, -88.06)">
    <path d="M 577.93 51.95 C 582.33 52.38 586.87 53.62 590.12 56.80 C 593.31 59.54 594.87 63.58 595.86 67.56 C 595.10 68.34 594.35 69.12 593.59 69.88 C 589.59 68.92 585.54 67.37 582.79 64.17 C 579.60 60.92 578.33 56.37 577.93 51.95 Z M 600.11 58.06 C 603.42 54.10 608.56 52.43 613.54 51.86 C 613.14 56.21 612.00 60.70 608.90 63.96 C 605.62 67.87 600.54 69.54 595.62 70.11 C 595.96 65.78 596.99 61.29 600.11 58.06 Z" />
    <path d="M 577.83 69.56 C 586.54 69.55 594.69 76.19 595.61 85.00 C 596.72 80.12 599.20 75.37 603.53 72.63 C 606.47 70.53 610.11 69.98 613.59 69.45 C 613.13 74.35 611.55 79.38 607.71 82.70 C 601.40 88.85 590.49 88.93 584.04 82.96 C 580.06 79.66 578.43 74.52 577.83 69.56 Z" />
    <path d="M 577.98 86.99 C 586.68 87.32 594.95 93.89 595.61 102.88 C 596.53 98.17 598.77 93.56 602.78 90.73 C 605.84 88.25 609.82 87.52 613.63 87.04 C 613.15 92.98 610.51 99.02 605.23 102.17 C 597.71 107.22 586.56 105.09 581.44 97.62 C 579.10 94.57 578.31 90.73 577.98 86.99 Z" />
    <path d="M 577.86 104.64 C 586.58 104.65 594.54 111.30 595.69 120.01 C 597.01 111.32 604.86 104.68 613.62 104.61 C 613.06 109.21 611.77 113.98 608.27 117.25 C 602.35 123.53 591.75 124.26 585.02 118.86 C 580.46 115.59 578.39 110.05 577.86 104.64 Z" />
  </g>
  <path d="${ACCURATE_SAWTOOTH_PATH}" fill="#FEFEFE" />
  <g font-family="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" text-anchor="middle" fill="#3A3738" clip-path="url(#center-cutout-clip)">
    ${
      line2
        ? `<text x="562" y="${line1Props.y}" font-size="${line1Props.fontSize}" font-weight="900" letter-spacing="0.4">${line1}</text>
    <text x="562" y="${line2Props?.y ?? 86}" font-size="${line2Props?.fontSize ?? 13.5}" font-weight="900" letter-spacing="0.3">${line2}</text>`
        : `<text x="562" y="72" font-size="${line1.length > 14 ? 17 : 20}" font-weight="900" letter-spacing="0.5">${line1}</text>`
    }
  </g>
  <g transform="translate(675, 66) scale(0.68) translate(-1055, -91.53)">
    <g fill="#C5D93D">
      <path d="M 1130.07 43.04 C 1134.41 43.01 1138.75 43.01 1143.10 43.04 C 1140.60 47.83 1138.05 52.58 1135.53 57.35 C 1133.79 60.61 1132.33 64.09 1129.78 66.83 C 1125.70 67.86 1121.45 67.24 1117.30 67.30 C 1121.41 59.14 1125.83 51.14 1130.07 43.04 Z" />
      <path d="M 1143.20 66.78 C 1147.21 58.80 1151.64 50.92 1155.81 42.98 C 1160.14 43.02 1164.48 43.03 1168.83 43.05 C 1165.22 49.74 1161.66 56.46 1158.16 63.20 C 1157.18 64.76 1156.36 66.80 1154.43 67.34 C 1150.69 67.48 1146.85 67.72 1143.20 66.78 Z" />
      <path d="M 1130.10 68.01 C 1133.82 66.94 1138.25 66.33 1141.80 68.18 C 1142.36 69.49 1141.33 70.60 1140.84 71.73 C 1137.19 78.26 1133.76 84.92 1130.25 91.53 C 1125.91 91.57 1121.57 91.58 1117.23 91.59 C 1120.60 84.88 1124.29 78.32 1127.69 71.62 C 1128.39 70.37 1128.98 68.98 1130.10 68.01 Z" />
      <path d="M 1153.12 72.01 C 1154.02 70.30 1154.53 68.11 1156.57 67.39 C 1160.61 66.84 1164.71 67.22 1168.78 67.24 C 1164.45 75.37 1160.24 83.56 1155.77 91.62 C 1151.49 91.56 1147.21 91.57 1142.93 91.57 C 1146.17 84.96 1149.88 78.61 1153.12 72.01 Z" />
    </g>
    <g fill="#4A6CB2">
      <path d="M 1087.31 101.38 C 1090.11 99.88 1093.74 100.81 1095.77 103.17 C 1098.95 106.60 1099.30 111.58 1099.01 116.02 C 1098.68 122.06 1096.26 127.68 1094.04 133.22 C 1099.26 126.75 1104.75 119.60 1113.05 117.07 C 1117.01 115.68 1122.42 116.51 1124.41 120.62 C 1126.28 124.92 1123.68 129.62 1120.25 132.25 C 1113.43 137.61 1104.49 139.01 1096.08 139.63 C 1085.57 140.09 1074.55 139.67 1064.89 135.08 C 1060.25 132.80 1055.39 128.63 1055.67 122.98 C 1056.00 118.12 1061.54 115.56 1065.88 116.66 C 1075.28 118.64 1081.69 126.62 1087.00 134.04 C 1084.15 127.04 1081.10 119.76 1081.61 112.04 C 1081.91 107.97 1083.40 103.34 1087.31 101.38 Z" />
    </g>
  </g>
  <g fill="#7855A1" transform="translate(755, 66) scale(0.68) translate(-1183, -90.38)">
    <path d="M 1252.71 60.65 C 1264.20 55.61 1278.46 57.75 1287.85 66.13 C 1295.12 72.30 1299.15 81.66 1299.47 91.12 C 1293.68 91.39 1287.89 91.64 1282.10 91.71 C 1281.37 87.03 1279.95 82.10 1275.99 79.12 C 1269.34 73.30 1258.03 74.78 1253.08 82.09 C 1248.86 87.49 1250.68 94.74 1248.64 100.88 C 1244.76 114.63 1231.28 124.83 1217.00 124.82 C 1203.17 125.16 1189.83 115.95 1185.20 102.92 C 1183.79 99.27 1183.31 95.36 1183.09 91.49 C 1188.88 91.34 1194.67 91.16 1200.47 91.05 C 1200.95 96.47 1203.34 101.98 1208.21 104.81 C 1215.03 109.36 1225.04 107.22 1229.57 100.44 C 1232.60 96.56 1232.24 91.44 1232.84 86.82 C 1234.23 75.40 1242.12 65.11 1252.71 60.65 Z" />
  </g>
  <g font-family="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" font-weight="900" font-size="14.5" fill="#FDFAFA" letter-spacing="0.4" text-anchor="start">
    <text x="838" y="42">${brandLines[0]}</text>
    <text x="838" y="66">${brandLines[1]}</text>
    <text x="838" y="90">${brandLines[2]}</text>
  </g>
  <rect x="932" y="0" width="36" height="132" fill="#FEFEFE" />
  <g stroke="#A9A8A7" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <line x1="938" y1="36" x2="962" y2="36" />
    <polyline points="956,32 962,36 956,40" />
    <line x1="938" y1="56" x2="962" y2="56" />
    <polyline points="956,52 962,56 956,60" />
    <line x1="938" y1="76" x2="962" y2="76" />
    <polyline points="956,72 962,76 956,80" />
    <line x1="938" y1="96" x2="962" y2="96" />
    <polyline points="956,92 962,96 956,100" />
  </g>
  <rect x="968" y="0" width="32" height="132" fill="${primaryColor}" />
</svg>`;
}

export default WristbandSvg;
