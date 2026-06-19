"use client";

interface Props {
  history: string[];
  onSelect: (desc: string) => void;
}

export default function Sidebar({ history, onSelect }: Props) {
  return (
    <aside className="w-52 flex-shrink-0 bg-[#0d0d0f] border-r border-white/[0.06] flex flex-col">
      <div className="px-4 pt-4 pb-3">
        <p className="text-[10px] font-semibold text-white/20 uppercase tracking-widest">History</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {history.length === 0 ? (
          <div className="px-4 py-3">
            <p className="text-white/15 text-xs leading-relaxed">Your recent builds will show up here</p>
          </div>
        ) : (
          <div className="px-2 space-y-0.5">
            {history.map((h, i) => (
              <button
                key={i}
                onClick={() => onSelect(h)}
                className="w-full text-left px-3 py-2.5 rounded-lg text-xs text-white/35 hover:text-white/70 hover:bg-white/[0.05] transition-all truncate"
              >
                {h}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="px-4 py-3 border-t border-white/[0.06]">
        <p className="text-white/10 text-[10px]">Nurovaq AI Builder</p>
      </div>
    </aside>
  );
}
