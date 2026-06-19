"use client";

interface Props {
  filename: string;
  content: string;
  onChange: (val: string) => void;
}

export default function CodeEditor({ filename, content, onChange }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 text-xs text-gray-400 font-mono">
        {filename}
      </div>
      <textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className="flex-1 bg-gray-950 text-gray-200 font-mono text-sm px-4 py-4 resize-none focus:outline-none leading-relaxed"
      />
    </div>
  );
}
