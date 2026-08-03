import { useLocation } from "react-router-dom";
import { useAudienceNavigate } from "../../context/AudienceContext";
import RoutePrefetch from "../ui/RoutePrefetch";
import { preloadRoute, makeRouteLoader } from "../ui/routeLoader";
import { useAutoBottomNavHide } from "../../hooks/useAutoBottomNavHide";

const NAV = [
  { id: "beranda", label: "Beranda", icon: "fa-house", path: "/beranda" },
  { id: "lomba", label: "Lomba", icon: "fa-flag", path: "/lomba" },
  {
    id: "rundown",
    label: "Rundown",
    icon: "fa-calendar-days",
    path: "/rundown",
  },
  { id: "tim", label: "Tim", icon: "fa-users", path: "/tim" },
];

// One loader per tab. Cached so subsequent preloads are O(1).
const LOADERS = {
  beranda: makeRouteLoader(() => import("../../components/pages/HomePage.jsx")),
  lomba: makeRouteLoader(() => import("../../components/pages/LombaPage.jsx")),
  rundown: makeRouteLoader(
    () => import("../../components/pages/RundownPage.jsx"),
  ),
  tim: makeRouteLoader(() => import("../../components/pages/TimPage.jsx")),
};

export default function BottomNav() {
  const navigate = useAudienceNavigate();
  const { pathname } = useLocation();
  const isNavVisible = useAutoBottomNavHide(1200);

  const activeId =
    NAV.find((n) => pathname.startsWith(n.path))?.id ?? "beranda";

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] lg:hidden transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
        isNavVisible
          ? "translate-y-0"
          : "translate-y-[calc(100%+1.5rem)] pointer-events-none"
      }`}
    >
      <nav className="mx-auto grid max-w-lg grid-cols-4 gap-1 rounded-2xl border border-slate-200/90 bg-white/95 p-1.5 shadow-2xl shadow-slate-900/10 backdrop-blur-xl isolate">
        {NAV.map((item) => {
          const active = activeId === item.id;
          const loader = LOADERS[item.id];
          return (
            <RoutePrefetch
              key={item.id}
              loader={loader}
              className="flex min-w-0"
            >
              <button
                type="button"
                onClick={() => {
                  // Warm cache synchronously as well in case the user taps
                  // before hover/visibility fires (e.g. fast tap on cold load).
                  preloadRoute(loader).catch(() => {});
                  navigate(item.path);
                }}
                className={`flex w-full flex-col items-center justify-center gap-1 cursor-pointer rounded-xl py-2 px-1 text-[10px] font-semibold transition-all duration-200 active:scale-95 ${
                  active
                    ? "bg-brand-soft text-brand-red font-bold shadow-xs"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <i className={`fa-solid ${item.icon} text-sm`} />
                <span className="truncate leading-none">{item.label}</span>
              </button>
            </RoutePrefetch>
          );
        })}
      </nav>
    </div>
  );
}
