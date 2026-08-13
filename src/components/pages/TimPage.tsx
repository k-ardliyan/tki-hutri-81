import { useLoaderData } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { motionTransition } from '~/lib/motion';

interface KelompokMember {
  nama: string;
  isLeader?: boolean;
}

interface KelompokGroup {
  id: string;
  kategori: string;
  nomor: number | null;
  nama: string;
  anggota: (string | KelompokMember)[];
}

function normalizeMember(m: string | KelompokMember): KelompokMember {
  if (typeof m === 'string') {
    return { nama: m, isLeader: false };
  }
  return { nama: m.nama, isLeader: Boolean(m.isLeader) };
}

function highlightParts(text: string, term: string): (string | React.JSX.Element)[] {
  if (!term) return [text];
  const lower = text.toLowerCase();
  const t = term.toLowerCase();
  const parts = [];
  let start = 0;
  let idx = lower.indexOf(t);
  while (idx !== -1) {
    if (idx > start) parts.push(text.slice(start, idx));
    parts.push(
      <mark key={`${idx}-${text}`} className="rounded bg-amber-200 px-0.5 text-slate-900">
        {text.slice(idx, idx + t.length)}
      </mark>
    );
    start = idx + t.length;
    idx = lower.indexOf(t, start);
  }
  if (start < text.length) parts.push(text.slice(start));
  return parts;
}

function TeamCard({ group, term }: { group: KelompokGroup; term: string }) {
  const [open, setOpen] = useState(false);
  const isPutra = group.kategori === 'putra';
  const termLower = term.toLowerCase();

  const members = useMemo(() => group.anggota.map(normalizeMember), [group.anggota]);
  const leader = useMemo(() => members.find((m) => m.isLeader), [members]);

  // Auto-open when search matches group name or any member
  useEffect(() => {
    if (!termLower) {
      setOpen(false);
      return;
    }
    const nameHit = group.nama.toLowerCase().includes(termLower);
    const memberHit = members.some((m) => m.nama.toLowerCase().includes(termLower));
    if (nameHit || memberHit) setOpen(true);
  }, [termLower, group.nama, members]);

  return (
    <motion.article
      layout
      className={`surface-card overflow-hidden transition-shadow ${
        open && termLower ? 'ring-2 ring-amber-300/60' : ''
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left cursor-pointer active:scale-[0.99] transition-transform"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                isPutra ? 'bg-sky-50 text-sky-700' : 'bg-pink-50 text-pink-700'
              }`}
            >
              {isPutra ? 'Putra' : 'Putri'}
            </span>
            {group.nomor && (
              <span className="text-[11px] font-mono font-bold text-slate-400">#{group.nomor}</span>
            )}
          </div>
          <h3 className="mt-0.5 font-heading text-base font-bold text-slate-900">
            {highlightParts(group.nama, term)}
          </h3>

          {/* Leader pill & Member count */}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            {leader && (
              <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 border border-amber-200/90 rounded-md px-1.5 py-0.5 text-[11px] shadow-2xs">
                <i className="fa-solid fa-crown text-[10px] text-amber-500" />
                <span>Ketua: {highlightParts(leader.nama, term)}</span>
              </span>
            )}
            <span className="text-slate-500 font-medium">{members.length} anggota</span>
          </div>
        </div>
        <motion.i
          animate={{ rotate: open ? 180 : 0 }}
          transition={motionTransition.fast}
          className="fa-solid fa-chevron-down text-slate-500 shrink-0"
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={motionTransition.fast}
            className="overflow-hidden border-t border-slate-100 bg-slate-50/70"
          >
            <div className="px-4 py-3">
              <ul className="space-y-1.5">
                {members.map((m) => {
                  const isMatch = termLower && m.nama.toLowerCase().includes(termLower);
                  return (
                    <li
                      key={`${group.id}-${m.nama}`}
                      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ring-1 transition ${
                        m.isLeader
                          ? isMatch
                            ? 'bg-amber-100/90 text-slate-900 ring-amber-400 border border-amber-300 font-medium'
                            : 'bg-amber-50/90 text-amber-950 ring-amber-200/80 border border-amber-200 font-medium'
                          : isMatch
                            ? 'bg-amber-50 text-slate-900 ring-amber-200'
                            : 'bg-white text-slate-700 ring-slate-100'
                      }`}
                    >
                      <span className="min-w-0 flex-1 flex items-center gap-1.5">
                        {m.isLeader && (
                          <i className="fa-solid fa-crown text-amber-500 text-xs shrink-0" />
                        )}
                        <span>{highlightParts(m.nama, term)}</span>
                      </span>
                      {m.isLeader && (
                        <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-amber-200/90 px-2 py-0.5 text-[9px] font-black text-amber-900">
                          KETUA
                        </span>
                      )}
                      {isMatch && !m.isLeader && (
                        <span className="shrink-0 rounded-full bg-amber-200 px-1.5 py-0.5 text-[9px] font-bold text-amber-900">
                          cocok
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

function CategorySection({
  kategori,
  label,
  lombaDesc,
  totalAnggota,
  groups,
  term,
}: {
  kategori: string;
  label: string;
  lombaDesc: string;
  totalAnggota: number;
  groups: KelompokGroup[];
  term: string;
}) {
  if (groups.length === 0) return null;
  const isPutra = kategori === 'putra';
  return (
    <section className="space-y-3">
      <header className="flex items-center gap-3 px-1">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            isPutra ? 'bg-sky-100 text-sky-700' : 'bg-pink-100 text-pink-700'
          }`}
        >
          <i className={`fa-solid ${isPutra ? 'fa-mars' : 'fa-venus'} text-sm`} />
        </span>
        <div className="min-w-0">
          <h3 className="font-heading text-base font-extrabold text-slate-900 sm:text-lg">
            {label}
          </h3>
          <p className="text-xs text-slate-500">
            {groups.length} tim · {totalAnggota} anggota · {lombaDesc}
          </p>
        </div>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 sm:items-start">
        {groups.map((g: KelompokGroup) => (
          <TeamCard key={g.id} group={g} term={term} />
        ))}
      </div>
    </section>
  );
}

export default function TimPage() {
  const { teams, summary } = useLoaderData({ from: '/tim' });
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');

  const term = query.trim();
  const termLower = term.toLowerCase();

  const filtered = useMemo(() => {
    return (teams as KelompokGroup[]).filter((g) => {
      const byCat = filter === 'all' || g.kategori === filter;
      const byQuery =
        !termLower ||
        g.nama.toLowerCase().includes(termLower) ||
        g.anggota.some((a) => {
          const name = typeof a === 'string' ? a : a.nama;
          return name.toLowerCase().includes(termLower);
        });
      return byCat && byQuery;
    });
  }, [teams, filter, termLower]);

  const putraGroups = filtered.filter((g) => g.kategori === 'putra');
  const putriGroups = filtered.filter((g) => g.kategori === 'putri');
  const totalAnggotaPutra = putraGroups.reduce((sum, g) => sum + g.anggota.length, 0);
  const totalAnggotaPutri = putriGroups.reduce((sum, g) => sum + g.anggota.length, 0);

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="surface-card px-4 py-5 sm:px-7 sm:py-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-kicker">Peserta Lomba</p>
            <h2 className="mt-1 font-heading text-2xl font-black text-slate-900 sm:text-3xl">
              Daftar Tim & Anggota
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Daftar pembagian tim peserta kategori Putra dan Putri yang akan bertanding pada lomba
              lapangan (Estafet Balon & Estafet Air).
            </p>
          </div>
          <div className="relative w-full max-w-md">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama peserta atau tim..."
              aria-label="Cari nama peserta atau tim"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-4 text-base sm:text-sm outline-none ring-brand-red transition focus:bg-white focus:ring-2"
            />
            {term && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 hover:text-slate-600"
              >
                Hapus
              </button>
            )}
          </div>
        </div>

        {term && (
          <p className="mt-3 text-xs font-medium text-emerald-700">
            <i className="fa-solid fa-circle-info mr-1" />
            Ditemukan {filtered.length} tim yang sesuai dengan pencarian.
          </p>
        )}

        <div className="mt-4 flex gap-2 overflow-x-auto overscroll-x-contain no-scrollbar">
          {[
            { id: 'all', label: `Semua (${summary.total})` },
            { id: 'putra', label: `Putra (${summary.putra})` },
            { id: 'putri', label: `Putri (${summary.putri})` },
          ].map((f) => {
            const isSelected = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`relative rounded-full px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${
                  isSelected ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="tim-filter-active-pill"
                    transition={motionTransition.springSmooth}
                    className="absolute inset-0 rounded-full bg-brand-red shadow-sm"
                  />
                )}
                <span className="relative z-10">{f.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="surface-card px-4 py-10 text-center">
          <i className="fa-solid fa-user-slash mb-2 text-2xl text-slate-300" />
          <p className="text-sm font-semibold text-slate-600">
            Tidak ditemukan nama peserta atau tim yang sesuai. Coba kata kunci lain.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <CategorySection
            kategori="putra"
            label="Putra"
            lombaDesc="Estafet Balon & Air"
            totalAnggota={totalAnggotaPutra}
            groups={putraGroups}
            term={term}
          />
          <CategorySection
            kategori="putri"
            label="Putri"
            lombaDesc="Estafet Balon & Air"
            totalAnggota={totalAnggotaPutri}
            groups={putriGroups}
            term={term}
          />
        </div>
      )}
    </div>
  );
}
