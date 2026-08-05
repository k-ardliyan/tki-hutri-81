import { createContext, useCallback, useContext, useRef } from 'react'
import { useSearch, useNavigate } from '@tanstack/react-router'

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

export function AudienceProvider({ children }: { children: React.ReactNode }) {
  const search = useSearch({ strict: false }) as Record<string, string>
  const isPanitia = search.u === 'panitia'

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
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAudienceNavigate() {
  const rawNavigate = useNavigate()
  const search = useSearch({ strict: false }) as Record<string, string>
  const uRef = useRef(search.u)

  // Selalu update ref ke nilai terbaru tanpa trigger re-render
  uRef.current = search.u

  return useCallback(
    (path: string, options?: { replace?: boolean }) => {
      const u = uRef.current
      if (!u) {
        rawNavigate({ to: path, ...options })
        return
      }
      // Gabungkan u= ke path — handle jika path sudah punya query string
      const separator = path.includes('?') ? '&' : '?'
      rawNavigate({ to: `${path}${separator}u=${u}`, ...options })
    },
    [rawNavigate],
  )
}
