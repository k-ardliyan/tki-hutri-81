function titleCase(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .replace(/\bMoh\./g, 'Moh.')
    .replace(/\bPt\b/g, 'PT')
}

function buildGroups(headers, columns, kategori) {
  return headers.map((header, colIdx) => {
    const anggota = columns
      .map((row) => row[colIdx])
      .filter(Boolean)
      .map(titleCase)
    const nomor = colIdx + 1
    return {
      id: `${kategori}-${nomor}`,
      kategori,
      nomor,
      nama: header.replace(/^Kelompok\s+/i, 'Tim '),
      anggota,
    }
  })
}

// Sumber: KELOMPOK_PESERTA_LOMBA (2).xlsx — 1 kolom = 1 kelompok, baris 1 header, baris 2+ anggota
const putraHeaders = [
  'Kelompok Putra 1',
  'Kelompok Putra 2',
  'Kelompok Putra 3',
  'Kelompok Putra 4',
  'Kelompok Putra 5',
  'Kelompok Putra 6',
  'Kelompok Putra 7',
  'Kelompok Putra 8',
]

const putraRows = [
  ['ARIF ARINTO', 'IRFAN KURNIA', 'KRISTRIYANTO', 'MUHAMAD ALI MUSTOFA', 'WUNTAT WIRANTO', 'FERRY ADI SETYAWAN', 'ADI ARISMAN', 'DEDY HIMAWAN SETYADI'],
  ['INUNG PRATAMA', 'RIFANDI DWI SULISTIYO', 'AGUNG BURHANUDIN YUSUF', 'AJI SETIAWAN', 'ANDREA PRAHITA JANARDANA', 'ARIEF RAIHAN SYAUQIE', 'ARIK RIKO PRASETYA', 'APRELA AGIF SOFYAN'],
  ['FARRAS AFIFNI ZAKKI', 'IBRAHIM', 'ILHAM DWI ATMOJO', 'ILHAM IZDHIHAR', 'INDRA KURNIAWAN', 'JOKO MAKRUF', 'MOH.IRVAN ANDRIANSYAH', 'MUHAMMAD BUDIANA EKA FARUQI'],
  ['NUR WAHYUDI', 'NUUR ZAKKI ZAMANI PAMUNGKAS', 'PHEPBI MUHAMMAD', 'SINDU KISNA INDRACAHYA', 'TAUFIK RAHMAD HIDAYANTO', 'TEGAR SANUBARI', 'TEGUH WAHYU SAPUTRO', 'WARTO NUR PRASETYO'],
  ['YAZID IHSAN', 'YOGO ARI NUGROHO', 'YUDI KURNIAWAN', 'ZAINAL ABIDIN', 'ZULKARNAIN MIRANDA', 'ADI MAS RIZAL FADILLAH', 'AGUNG PUTRO SETIAWAN', 'AKBAR ADJI PRADANA'],
  ['BERYL GALIH ARDHIANSYAH', 'DAFFA EXA FAWWAZ', 'FAJAR UTAMA', 'IKMAL KHOLIS', 'MOCHAMAD YUSUF QARDAFI', 'MUHAMAD AZIM MUSTAJIB', 'MUHAMMAD KASTONI', 'NUR UDIN SYAHRONI'],
  ['DIAN KURNIA WIDYA BUANA', null, null, null, null, null, null, null],
]

const putriHeaders = [
  'Kelompok Putri 1',
  'Kelompok Putri 2',
  'Kelompok Putri 3',
  'Kelompok Putri 4',
  'Kelompok Putri 5',
]

const putriRows = [
  ['MONNA MARISSA', 'ANNISA FEBRIANI', 'DIAH AYU WULANDARI', 'IDZA NUR HAIDA', 'RISDA NINGRUM'],
  ['SERLY HARTINA', 'LUTFAH FADILAH', 'RADEN RORO DWI IRAWATI', 'SITI KHUMAIROH', 'VINA PUTRI NEMIRAMAS'],
  ['AISYAH NIMAS ADARA', 'AZIZAH WISMANINGSIH', 'AFIFAH WIDYASTUTI', 'IPOK DIVA NAIN', 'AMELIA FRISKA PERTIWI'],
  ['ERVINA FAUZIAH', 'KURNIA SARI', 'MEI AMBARWATI', 'ASYELLA VERATIA AZAHRA PUTRI QODRI', 'MARTISA RINA RAHAYU'],
  ['SANDRIKA', 'UMI KHOIRIYAH', 'VIKA ALPIANA', 'ALICIEA BUNGA SEPTANIA', 'ISTIANA'],
  ['ELLA', 'ARMITHA SEKAR PRASTITA', 'DIAN NUR WIDYANINGRUM', 'PANDITA ARDININGRUM ARIFIANTO', 'IKA ROSIDAH'],
]

export const dataKelompok = [
  ...buildGroups(putraHeaders, putraRows, 'putra'),
  ...buildGroups(putriHeaders, putriRows, 'putri'),
]

export const summaryKelompok = {
  total: dataKelompok.length,
  putra: dataKelompok.filter((g) => g.kategori === 'putra').length,
  putri: dataKelompok.filter((g) => g.kategori === 'putri').length,
}
