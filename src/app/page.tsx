"use client";

import { useState, useRef } from "react";
import CodeEditor from "@/components/CodeEditor";
import Preview from "@/components/Preview";
import Sidebar from "@/components/Sidebar";

export interface GeneratedFile {
  name: string;
  content: string;
}

export default function Home() {
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [activeFile, setActiveFile] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"code" | "preview">("code");
  const [history, setHistory] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeFileContent =
    files.find((f) => f.name === activeFile)?.content ?? "";

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
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;

          try {
            const parsed = JSON.parse(data);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.text) {
              accumulated += parsed.text;
              setStreamText(accumulated);
            }
          } catch {
            // ignore parse errors on partial chunks
          }
        }
      }

      // Extract JSON from accumulated text
      const jsonMatch = accumulated.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        setFiles(result.files ?? []);
        setActiveFile(result.files?.[0]?.name ?? "");
        setHistory((h) => [desc, ...h.slice(0, 9)]);
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
    setFiles((prev) =>
      prev.map((f) =>
        f.name === activeFile ? { ...f, content: newContent } : f
      )
    );
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

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">
      <Sidebar
        history={history}
        onSelect={(h) => {
          setDescription(h);
          textareaRef.current?.focus();
        }}
      />

      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-gray-800 bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
              N
            </div>
            <span className="font-semibold text-lg tracking-tight">
              Nurovaq AI Builder
            </span>
          </div>
          {files.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("code")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "code"
                    ? "bg-gray-700 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Code
              </button>
              <button
                onClick={() => setActiveTab("preview")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "preview"
                    ? "bg-gray-700 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Preview
              </button>
              <button
                onClick={downloadFiles}
                className="ml-2 px-3 py-1.5 rounded-md text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors"
              >
                Download
              </button>
            </div>
          )}
        </header>

        {/* Body */}
        <div className="flex flex-1 min-h-0">
          {files.length === 0 && !loading ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-8 px-8">
              <div className="text-center space-y-3">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                  Build any app with AI
                </h1>
                <p className="text-gray-400 text-lg max-w-xl">
                  Describe what you want to build and Claude will generate the
                  complete code for you instantly.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 max-w-xl w-full">
                {[
                  "A beautiful todo list app with local storage",
                  "A Pomodoro timer with sessions tracking",
                  "A markdown notes editor with preview",
                  "A budget tracker with charts",
                ].map((ex) => (
                  <button
                    key={ex}
                    onClick={() => generate(ex)}
                    className="text-left p-3 rounded-lg border border-gray-700 hover:border-violet-500 hover:bg-gray-800 text-sm text-gray-300 transition-all"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          ) : loading ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8">
              <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-400 text-sm">Generating your app...</p>
              {streamText && (
                <div className="max-w-2xl w-full max-h-48 overflow-auto bg-gray-900 rounded-lg p-4 font-mono text-xs text-gray-400 border border-gray-800">
                  {streamText}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-1 min-h-0">
              {/* File list */}
              <div className="flex flex-col w-48 border-r border-gray-800 bg-gray-900">
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Files
                </div>
                {files.map((f) => (
                  <button
                    key={f.name}
                    onClick={() => setActiveFile(f.name)}
                    className={`text-left px-3 py-2 text-sm truncate transition-colors ${
                      f.name === activeFile
                        ? "bg-gray-800 text-violet-400"
                        : "text-gray-400 hover:text-white hover:bg-gray-800"
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>

              <div className="flex-1 min-w-0">
                {activeTab === "code" ? (
                  <CodeEditor
                    filename={activeFile}
                    content={activeFileContent}
                    onChange={handleFileEdit}
                  />
                ) : (
                  <Preview files={files} />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="border-t border-gray-800 bg-gray-900 px-6 py-4">
          {error && (
            <p className="text-red-400 text-sm mb-3">Error: {error}</p>
          )}
          <form
            onSubmit={handleSubmit}
            className="flex gap-3 max-w-4xl mx-auto"
          >
            <textarea
              ref={textareaRef}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder={
                files.length > 0
                  ? "Describe a change or new feature..."
                  : "Describe the app you want to build..."
              }
              rows={2}
              disabled={loading}
              className="flex-1 resize-none bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !description.trim()}
              className="px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium text-sm transition-colors self-end"
            >
              {loading ? "..." : files.length > 0 ? "Update" : "Build"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
