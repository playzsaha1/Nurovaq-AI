"use client";

interface Props {
  history: string[];
  onSelect: (desc: string) => void;
}

export default function Sidebar({ history, onSelect }: Props) {
  return (
    <aside className="w-52 flex-shrink-0 bg-[#0a0a0c] border-r border-white/[0.05] flex flex-col">
      <div className="px-4 pt-4 pb-3">
        <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.15em]">Recent builds</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {history.length === 0 ? (
          <div className="px-4 py-3">
            <p className="text-white/12 text-[11px] leading-relaxed">Your recent builds will appear here</p>
          </div>
        ) : (
          <div className="px-2 space-y-0.5">
            {history.map((h, i) => (
              <button
                key={i}
                onClick={() => onSelect(h)}
                className="w-full text-left px-3 py-2 rounded-lg text-[11px] text-white/30 hover:text-white/65 hover:bg-white/[0.04] transition-all truncate"
              >
                {h}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="px-4 py-3 border-t border-white/[0.05]">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-violet-500/50" />
          <p className="text-white/15 text-[10px] font-medium">Nurovaq AI</p>
        </div>
      </div>
    </aside>
  );
}
