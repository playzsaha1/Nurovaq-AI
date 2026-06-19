"use client";

import { useMemo } from "react";
import { GeneratedFile } from "@/app/page";

interface Props {
  files: GeneratedFile[];
}

export default function Preview({ files }: Props) {
  const srcDoc = useMemo(() => {
    const htmlFile = files.find(
      (f) => f.name.endsWith(".html") || f.name === "index.html"
    );

    if (htmlFile) {
      let html = htmlFile.content;
      // Inline CSS files
      files
        .filter((f) => f.name.endsWith(".css"))
        .forEach((cssFile) => {
          html = html.replace(
            new RegExp(
              `<link[^>]*href=["']${cssFile.name}["'][^>]*>`,
              "gi"
            ),
            `<style>${cssFile.content}</style>`
          );
        });
      // Inline JS files
      files
        .filter((f) => f.name.endsWith(".js") && !f.name.endsWith(".min.js"))
        .forEach((jsFile) => {
          html = html.replace(
            new RegExp(`<script[^>]*src=["']${jsFile.name}["'][^>]*></script>`, "gi"),
            `<script>${jsFile.content}</script>`
          );
        });
      return html;
    }

    // Fallback: wrap all content in a basic HTML shell
    const css = files.filter((f) => f.name.endsWith(".css")).map((f) => f.content).join("\n");
    const js = files.filter((f) => f.name.endsWith(".js")).map((f) => f.content).join("\n");
    const html = files.find((f) => !f.name.endsWith(".css") && !f.name.endsWith(".js"))?.content ?? "";

    return `<!DOCTYPE html><html><head><style>${css}</style></head><body>${html}<script>${js}</script></body></html>`;
  }, [files]);

  return (
    <iframe
      srcDoc={srcDoc}
      sandbox="allow-scripts allow-forms allow-modals"
      className="w-full h-full bg-white border-0"
      title="App Preview"
    />
  );
}
