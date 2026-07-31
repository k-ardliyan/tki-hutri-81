import logoTkiBlue from "./logo-tki-blue.svg";
import logoTkiWhite from "./logo-tki-white.svg";
import logoHutRi81Svg from "./brand/logo-hut-ri-81.svg";
import tuguJamSalatigaSvg from "./brand/tugu-jam-salatiga.svg";
import tuguJamSalatiga from "./brand/tugu-jam-salatiga.png";
import ringkasanBanner from "./brand/ringkasan-banner.png";
import imgDekor5r from "./lomba/dekor-5r.png";
import imgBalon from "./lomba/estafet-balon.png";
import imgAir from "./lomba/estafet-air.png";
import imgFoam from "./galeri/foam-tape.png";
import imgNoNail from "./galeri/no-nail.png";
import imgCable from "./galeri/cable-tidy.png";

export const assets = {
  /** Fallback raster refs (prefer <LogoTki /> / <LogoHutRi81 />) */
  logoTki: logoTkiBlue,
  logoTkiBlue,
  logoTkiWhite,
  logoHutRi81Svg,
  tuguJamSalatigaSvg,
  tuguJamSalatiga,
  ringkasanBanner,
  lomba: {
    "dekor-5r": imgDekor5r,
    balon: imgBalon,
    air: imgAir,
  },
  galeri: [
    {
      id: "foam",
      image: imgFoam,
      badge: "Rekomendasi",
      badgeClass: "bg-emerald-100 text-emerald-800",
      title: "Pakai foam tape / tape kertas",
      desc: "Perekat aman yang tidak merusak cat tembok saat dilepas.",
    },
    {
      id: "nonail",
      image: imgNoNail,
      badge: "Dilarang",
      badgeClass: "bg-red-100 text-red-800",
      title: "Tanpa paku & tanpa cat dinding",
      desc: "Jangan membuat lubang baru atau mengoles cat tambahan di dinding gedung.",
    },
    {
      id: "cable",
      image: imgCable,
      badge: "Budaya 5R",
      badgeClass: "bg-sky-100 text-sky-800",
      title: "Kabel rapi & meja bersih",
      desc: "Ikat kabel dengan cable tie dan bersihkan sisa potongan hiasan setiap hari.",
    },
  ],
};
