const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

export async function POST(req: Request) {
  const { description, existingCode } = await req.json();

  const systemPrompt = `You are an expert app builder. When given a description of an app, you generate complete, working code for it.

You MUST respond with ONLY a JSON object in this exact format (no markdown, no explanation outside JSON):
{
  "files": [
    {
      "name": "filename.ext",
      "content": "file content here"
    }
  ],
  "explanation": "brief explanation of what was built"
}

Rules:
- Generate complete, working code — no placeholders or TODOs
- For web apps: output a single self-contained HTML file with embedded CSS and JS
- Include all necessary code so the app works standalone
- Make the UI beautiful with modern styling (embedded CSS)
- The first file should always be the main entry point (index.html)`;

  const userMessage = existingCode
    ? `Update this app based on this request: ${description}\n\nExisting code:\n${existingCode}`
    : `Build me this app: ${description}`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const res = await fetch(GROQ_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            stream: true,
            temperature: 0.7,
            max_tokens: 8000,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage },
            ],
          }),
        });

        if (!res.ok || !res.body) {
          const detail = await res.text().catch(() => "");
          throw new Error(`Groq API error (${res.status}): ${detail}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Groq streams OpenAI-style SSE lines: "data: {json}\n\n"
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const json = JSON.parse(payload);
              const text = json.choices?.[0]?.delta?.content;
              if (text) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
                );
              }
            } catch {
              /* ignore partial JSON */
            }
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
