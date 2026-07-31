const NAV = [
  { id: 'beranda', label: 'Beranda', icon: 'fa-house' },
  { id: 'lomba', label: 'Lomba', icon: 'fa-flag' },
  { id: 'rundown', label: 'Rundown', icon: 'fa-calendar-days' },
  { id: 'tim', label: 'Tim', icon: 'fa-users' },
]

export default function BottomNav({ activeTab, onTabChange }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 lg:hidden">
      <nav className="mx-auto flex max-w-lg items-center justify-between rounded-2xl border border-slate-200/90 bg-white/95 p-1.5 shadow-2xl shadow-slate-900/10 backdrop-blur-xl">
        {NAV.map((item) => {
          const active = activeTab === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`flex flex-1 flex-col items-center gap-1 rounded-xl px-1.5 py-2 text-[10px] font-semibold transition ${
                active ? 'bg-brand-soft text-brand-red' : 'text-slate-500'
              }`}
            >
              <i className={`fa-solid ${item.icon} text-sm`} />
              {item.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
