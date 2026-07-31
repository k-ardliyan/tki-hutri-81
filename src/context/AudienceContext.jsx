import { createContext, useCallback, useContext, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

/**
 * AudienceContext
 * ----------------
 * Membaca `?u=panitia` dari URL secara reaktif (via useSearchParams).
 * Tidak memakai sessionStorage — param harus selalu ada di URL untuk mode panitia aktif.
 *
 * Cara pakai:
 *   /lomba             → isPanitia = false  (peserta only)
 *   /lomba?u=panitia   → isPanitia = true   (full mode)
 *
 * Param otomatis terbawa saat navigasi karena semua navigate menggunakan
 * useAudienceNavigate() yang preserve `?u=` jika ada.
 */
const AudienceContext = createContext({ isPanitia: false })

export function AudienceProvider({ children }) {
  const [searchParams] = useSearchParams()
  const isPanitia = searchParams.get('u') === 'panitia'

  return (
    <AudienceContext.Provider value={{ isPanitia }}>
      {children}
    </AudienceContext.Provider>
  )
}

/** Hook untuk membaca status audience */
// eslint-disable-next-line react-refresh/only-export-components
export function useAudience() {
  return useContext(AudienceContext)
}

/**
 * Hook navigate yang otomatis meneruskan `?u=panitia` ke URL tujuan.
 * Gunakan ini sebagai pengganti useNavigate() di seluruh app.
 *
 * Contoh:
 *   const navigate = useAudienceNavigate()
 *   navigate('/lomba')          → /lomba          (peserta mode)
 *   navigate('/lomba')          → /lomba?u=panitia (kalau ?u=panitia aktif)
 *   navigate('/lomba/5r')       → /lomba/5r?u=panitia
 *
 * Catatan: path sudah ada `?` akan digabung dengan `&u=panitia`.
 * Fix: gunakan ref untuk hindari stale closure — nilai `u` selalu fresh
 * saat navigate dipanggil, bukan saat hook di-render.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAudienceNavigate() {
  const rawNavigate = useNavigate()
  const [searchParams] = useSearchParams()
  const uRef = useRef(searchParams.get('u'))

  // Selalu update ref ke nilai terbaru tanpa trigger re-render
  uRef.current = searchParams.get('u')

  return useCallback(
    (path, options) => {
      const u = uRef.current
      if (!u) {
        rawNavigate(path, options)
        return
      }
      // Gabungkan u= ke path — handle jika path sudah punya query string
      const separator = path.includes('?') ? '&' : '?'
      rawNavigate(`${path}${separator}u=${u}`, options)
    },
    [rawNavigate],
  )
}

