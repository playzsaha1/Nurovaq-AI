"use client";

import { useState, useRef } from "react";
import CodeEditor from "@/components/CodeEditor";
import Preview from "@/components/Preview";
import Sidebar from "@/components/Sidebar";

export interface GeneratedFile {
  name: string;
  content: string;
}

const EXAMPLES = [
  { label: "Todo App", desc: "A beautiful todo list app with local storage, categories, and due dates" },
  { label: "Pomodoro Timer", desc: "A Pomodoro timer with session tracking and sound notifications" },
  { label: "Notes Editor", desc: "A markdown notes editor with live preview and local storage" },
  { label: "Budget Tracker", desc: "A personal budget tracker with charts and spending categories" },
  { label: "Habit Tracker", desc: "A daily habit tracker with streaks and progress visualization" },
  { label: "Flashcards", desc: "A flashcard study app with spaced repetition and flip animations" },
];

export default function Home() {
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [activeFile, setActiveFile] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"code" | "preview">("preview");
  const [history, setHistory] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeFileContent = files.find((f) => f.name === activeFile)?.content ?? "";

  async function generate(desc: string) {
    if (!desc.trim()) return;
    setLoading(true);
    setStreamText("");
    setError("");

    const existingCode =
      files.length > 0
        ? files.map((f) => `// FILE: ${f.name}\n${f.content}`).join("\n\n")
        : undefined;

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: desc, existingCode }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.text) { accumulated += parsed.text; setStreamText(accumulated); }
          } catch { /* ignore partial chunk parse errors */ }
        }
      }

      // Strip markdown code fences if Gemini wraps output in ```json ... ```
      const cleaned = accumulated
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const result = JSON.parse(jsonMatch[0]);
          setFiles(result.files ?? []);
          setActiveFile(result.files?.[0]?.name ?? "");
          setHistory((h) => [desc, ...h.slice(0, 9)]);
          setActiveTab("preview");
        } catch {
          setError("Failed to parse response. Try again.");
        }
      } else {
        setError("No code was generated. Try a more specific description.");
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
      setStreamText("");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    generate(description);
    setDescription("");
  }

  function handleFileEdit(newContent: string) {
    setFiles((prev) => prev.map((f) => f.name === activeFile ? { ...f, content: newContent } : f));
  }

  function downloadFiles() {
    files.forEach((file) => {
      const blob = new Blob([file.content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  const hasFiles = files.length > 0;

  return (
    <div className="flex h-screen bg-[#0d0d0f] text-gray-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <Sidebar
        history={history}
        onSelect={(h) => { setDescription(h); textareaRef.current?.focus(); }}
      />

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Top bar */}
        <header className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-[#111113]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <span className="text-white text-xs font-bold">N</span>
            </div>
            <span className="font-semibold text-sm text-white/90 tracking-tight">Nurovaq</span>
            <span className="text-white/20 text-sm">·</span>
            <span className="text-white/40 text-xs">AI App Builder</span>
          </div>

          {hasFiles && (
            <div className="flex items-center gap-1">
              <div className="flex items-center bg-white/5 rounded-lg p-0.5 mr-2">
                <button
                  onClick={() => setActiveTab("preview")}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${activeTab === "preview" ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/70"}`}
                >
                  Preview
                </button>
                <button
                  onClick={() => setActiveTab("code")}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${activeTab === "code" ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/70"}`}
                >
                  Code
                </button>
              </div>
              <button
                onClick={downloadFiles}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors shadow-lg shadow-violet-500/20"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </button>
            </div>
          )}
        </header>

        {/* Body */}
        <div className="flex flex-1 min-h-0">
          {!hasFiles && !loading ? (
            /* ── Landing ── */
            <div className="flex flex-1 flex-col items-center justify-center px-8 pb-24 relative overflow-hidden">
              {/* Background glow */}
              <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative text-center space-y-4 mb-10">
                <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-3 py-1 text-violet-400 text-xs font-medium mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                  Powered by Gemini 2.0 Flash
                </div>
                <h1 className="text-5xl font-bold tracking-tight">
                  <span className="text-white">Describe it.</span>
                  <br />
                  <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
                    We build it.
                  </span>
                </h1>
                <p className="text-white/40 text-base max-w-md mx-auto leading-relaxed">
                  Turn any idea into a working app in seconds. No code required.
                </p>
              </div>

              {/* Example cards */}
              <div className="grid grid-cols-3 gap-2.5 max-w-2xl w-full mb-8">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex.label}
                    onClick={() => generate(ex.desc)}
                    className="group text-left p-3.5 rounded-xl border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.07] hover:border-violet-500/30 transition-all"
                  >
                    <div className="text-white/80 text-xs font-semibold mb-1 group-hover:text-violet-300 transition-colors">{ex.label}</div>
                    <div className="text-white/30 text-xs leading-relaxed line-clamp-2">{ex.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : loading ? (
            /* ── Loading ── */
            <div className="flex flex-1 flex-col items-center justify-center gap-5">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-violet-500/20" />
                <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-white/70 text-sm font-medium">Building your app…</p>
                <p className="text-white/25 text-xs">Claude is generating the code</p>
              </div>
              {streamText && (
                <div className="max-w-lg w-full max-h-32 overflow-hidden bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 font-mono text-xs text-white/20 relative">
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#0d0d0f] to-transparent" />
                  {streamText.slice(-300)}
                </div>
              )}
            </div>
          ) : (
            /* ── Editor ── */
            <div className="flex flex-1 min-h-0">
              {/* File list */}
              <div className="flex flex-col w-44 border-r border-white/[0.06] bg-[#111113]">
                <div className="px-3 pt-3 pb-2 text-[10px] font-semibold text-white/25 uppercase tracking-widest">Files</div>
                {files.map((f) => (
                  <button
                    key={f.name}
                    onClick={() => { setActiveFile(f.name); setActiveTab("code"); }}
                    className={`text-left px-3 py-2 text-xs truncate transition-all ${
                      f.name === activeFile && activeTab === "code"
                        ? "text-violet-300 bg-violet-500/10 border-r-2 border-violet-500"
                        : "text-white/35 hover:text-white/70 hover:bg-white/[0.04]"
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {activeTab === "code" ? (
                  <CodeEditor filename={activeFile} content={activeFileContent} onChange={handleFileEdit} />
                ) : (
                  <Preview files={files} />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="border-t border-white/[0.06] bg-[#111113] px-5 py-4">
          {error && <p className="text-red-400 text-xs mb-3 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">⚠ {error}</p>}
          <form onSubmit={handleSubmit} className="flex gap-2.5 max-w-3xl mx-auto">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
                placeholder={hasFiles ? "Describe a change or new feature…" : "Describe the app you want to build…"}
                rows={1}
                disabled={loading}
                className="w-full resize-none bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.07] transition-all disabled:opacity-40 leading-relaxed"
                style={{ minHeight: "46px", maxHeight: "120px" }}
                onInput={(e) => {
                  const t = e.currentTarget;
                  t.style.height = "auto";
                  t.style.height = Math.min(t.scrollHeight, 120) + "px";
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !description.trim()}
              className="self-end px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-white/[0.05] disabled:text-white/20 text-white text-sm font-medium transition-all shadow-lg shadow-violet-500/20 disabled:shadow-none flex items-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
              {loading ? "" : hasFiles ? "Update" : "Build"}
            </button>
          </form>
          <p className="text-center text-white/15 text-[10px] mt-2">Press Enter to build · Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  );
}
