"use client";

interface Props {
  filename: string;
  content: string;
  onChange: (val: string) => void;
}

export default function CodeEditor({ filename, content, onChange }: Props) {
  return (
    <div className="flex flex-col h-full bg-[#0d0d0f]">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#111113] border-b border-white/[0.06]">
        <div className="w-2 h-2 rounded-full bg-white/10" />
        <span className="text-white/30 text-xs font-mono">{filename}</span>
      </div>
      <textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className="flex-1 bg-transparent text-white/70 font-mono text-xs px-5 py-4 resize-none focus:outline-none leading-6 tracking-wide"
      />
    </div>
  );
}
