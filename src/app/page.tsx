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
  { label: "Todo App", emoji: "✅", desc: "A beautiful todo list app with local storage, categories, and due dates" },
  { label: "Pomodoro Timer", emoji: "⏱", desc: "A Pomodoro timer with session tracking and sound notifications" },
  { label: "Notes Editor", emoji: "📝", desc: "A markdown notes editor with live preview and local storage" },
  { label: "Budget Tracker", emoji: "💰", desc: "A personal budget tracker with charts and spending categories" },
  { label: "Habit Tracker", emoji: "🔥", desc: "A daily habit tracker with streaks and progress visualization" },
  { label: "Flashcards", emoji: "🃏", desc: "A flashcard study app with spaced repetition and flip animations" },
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
      let apiError = "";

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
            if (parsed.error) { apiError = parsed.error; continue; }
            if (parsed.text) { accumulated += parsed.text; setStreamText(accumulated); }
          } catch { /* ignore partial chunk parse errors */ }
        }
      }

      if (apiError) {
        setError(apiError);
        return;
      }

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
    <div className="flex h-screen bg-[#080809] text-gray-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <Sidebar
        history={history}
        onSelect={(h) => { setDescription(h); textareaRef.current?.focus(); }}
      />

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Top bar */}
        <header className="flex items-center justify-between px-5 py-3 border-b border-white/[0.05] bg-[#0d0d0f]/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-sm text-white tracking-tight">Nurovaq</span>
              <span className="text-white/25 text-xs font-medium">AI Builder</span>
            </div>
          </div>

          {hasFiles && (
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-white/[0.05] rounded-lg p-0.5 border border-white/[0.06]">
                <button
                  onClick={() => setActiveTab("preview")}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${activeTab === "preview" ? "bg-violet-600 text-white shadow-sm" : "text-white/40 hover:text-white/70"}`}
                >
                  Preview
                </button>
                <button
                  onClick={() => setActiveTab("code")}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${activeTab === "code" ? "bg-violet-600 text-white shadow-sm" : "text-white/40 hover:text-white/70"}`}
                >
                  Code
                </button>
              </div>
              <button
                onClick={downloadFiles}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.08] text-white/70 hover:text-white text-xs font-medium transition-all"
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
            <div className="flex flex-1 flex-col items-center justify-center px-8 pb-20 relative overflow-hidden">
              {/* Background glows */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-violet-700/8 rounded-full blur-[120px] pointer-events-none" />
              <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-indigo-600/6 rounded-full blur-[80px] pointer-events-none" />

              <div className="relative text-center space-y-5 mb-10">
                <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-3.5 py-1.5 text-violet-400 text-xs font-medium mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                  Powered by Llama 3.3 70B
                </div>
                <h1 className="text-5xl font-extrabold tracking-tight leading-none">
                  <span className="text-white">Describe it.</span>
                  <br />
                  <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">
                    We build it.
                  </span>
                </h1>
                <p className="text-white/35 text-base max-w-sm mx-auto leading-relaxed">
                  Turn any idea into a working web app instantly. No code needed.
                </p>
              </div>

              {/* Example cards */}
              <div className="grid grid-cols-3 gap-2 max-w-xl w-full mb-6">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex.label}
                    onClick={() => generate(ex.desc)}
                    className="group text-left p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-violet-500/25 transition-all duration-200"
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-base">{ex.emoji}</span>
                      <span className="text-white/75 text-xs font-semibold group-hover:text-white transition-colors">{ex.label}</span>
                    </div>
                    <div className="text-white/25 text-[11px] leading-relaxed line-clamp-2">{ex.desc}</div>
                  </button>
                ))}
              </div>

              <p className="text-white/15 text-xs">or type your own idea below</p>
            </div>
          ) : loading ? (
            /* ── Loading ── */
            <div className="flex flex-1 flex-col items-center justify-center gap-6">
              {/* Animated ring */}
              <div className="relative w-14 h-14">
                <div className="absolute inset-0 rounded-full border-2 border-white/5" />
                <div className="absolute inset-0 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
                <div className="absolute inset-2 rounded-full bg-violet-500/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <div className="text-center space-y-1.5">
                <p className="text-white/80 text-sm font-semibold">Building your app…</p>
                <p className="text-white/25 text-xs">Generating files with AI</p>
              </div>
              {streamText && (
                <div className="max-w-lg w-full max-h-28 overflow-hidden bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3 font-mono text-[11px] text-white/15 relative">
                  <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#080809] to-transparent" />
                  {streamText.slice(-400)}
                </div>
              )}
            </div>
          ) : (
            /* ── Editor/Preview ── */
            <div className="flex flex-1 min-h-0">
              {/* File list */}
              <div className="flex flex-col w-44 border-r border-white/[0.05] bg-[#0d0d0f]">
                <div className="px-3 pt-3.5 pb-2 text-[9px] font-bold text-white/20 uppercase tracking-[0.15em]">Files</div>
                {files.map((f) => (
                  <button
                    key={f.name}
                    onClick={() => { setActiveFile(f.name); setActiveTab("code"); }}
                    className={`text-left px-3 py-2 text-[11px] truncate transition-all font-mono ${
                      f.name === activeFile && activeTab === "code"
                        ? "text-violet-300 bg-violet-500/[0.12] border-r-2 border-violet-500"
                        : "text-white/30 hover:text-white/60 hover:bg-white/[0.03]"
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
        <div className="border-t border-white/[0.05] bg-[#0d0d0f] px-5 py-4">
          {error && (
            <div className="flex items-start gap-2 text-red-400 text-xs mb-3 bg-red-500/[0.08] border border-red-500/15 rounded-xl px-3.5 py-2.5 max-w-3xl mx-auto">
              <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}
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
                className="w-full resize-none bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/40 focus:bg-white/[0.06] transition-all disabled:opacity-40 leading-relaxed"
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
              className="self-end px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 active:bg-violet-700 disabled:bg-white/[0.04] disabled:text-white/15 text-white text-sm font-semibold transition-all shadow-lg shadow-violet-600/25 disabled:shadow-none flex items-center gap-2 border border-violet-500/30 disabled:border-white/[0.05]"
            >
              {loading ? (
                <span className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
              <span>{loading ? "Building" : hasFiles ? "Update" : "Build"}</span>
            </button>
          </form>
          <p className="text-center text-white/10 text-[10px] mt-2.5">Enter to build · Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  );
}
