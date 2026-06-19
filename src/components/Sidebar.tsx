"use client";

interface Props {
  history: string[];
  onSelect: (desc: string) => void;
}

export default function Sidebar({ history, onSelect }: Props) {
  return (
    <aside className="w-56 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="px-4 py-4 border-b border-gray-800">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Recent Builds
        </p>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {history.length === 0 ? (
          <p className="px-4 py-3 text-xs text-gray-600">
            Your builds will appear here
          </p>
        ) : (
          history.map((h, i) => (
            <button
              key={i}
              onClick={() => onSelect(h)}
              className="w-full text-left px-4 py-2.5 text-xs text-gray-400 hover:text-white hover:bg-gray-800 transition-colors truncate"
            >
              {h}
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
