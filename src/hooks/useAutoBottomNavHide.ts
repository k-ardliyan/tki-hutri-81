import { useEffect, useState } from 'react';

/**
 * Hook to manage auto-hiding Bottom Navigation on mobile devices.
 * - Scroll Down -> Hide bottom nav smoothly down
 * - Scroll Up -> Show bottom nav smoothly
 * - Reach Bottom of Page -> Show bottom nav immediately
 * - Idle for `idleTimeoutMs` -> Auto-show bottom nav smoothly (if hidden)
 */
export function useAutoBottomNavHide(idleTimeoutMs = 1200) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    const startIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        // Show bottom nav after idle for several seconds
        setIsVisible(true);
      }, idleTimeoutMs);
    };

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY;
      const windowHeight = window.innerHeight;
      const fullHeight = document.documentElement.scrollHeight;

      // 1. Check if user reached bottom of page (within 30px)
      const isAtBottom = windowHeight + currentScrollY >= fullHeight - 30;

      if (isAtBottom || currentScrollY <= 40) {
        setIsVisible(true);
      } else if (Math.abs(delta) > 8) {
        if (delta > 0) {
          // Scroll DOWN -> Smoothly HIDE bottom nav
          setIsVisible(false);
        } else {
          // Scroll UP -> Smoothly SHOW bottom nav
          setIsVisible(true);
        }
        lastScrollY = currentScrollY;
      }

      startIdleTimer();
    };

    const handleTouch = () => {
      startIdleTimer();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('touchstart', handleTouch, { passive: true });

    startIdleTimer();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('touchstart', handleTouch);
      if (idleTimer) clearTimeout(idleTimer);
    };
  }, [idleTimeoutMs]);

  return isVisible;
}
