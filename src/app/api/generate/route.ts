const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// Tried in order. 70B gives the best output; on rate-limit we fall back to the
// 8B model, which has a much higher free-tier tokens-per-minute allowance.
const GROQ_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];

export async function POST(req: Request) {
  const { description, existingCode } = await req.json();

  const systemPrompt = `You are a world-class UI/UX designer and frontend engineer. You build stunning, production-quality web apps.

You MUST respond with ONLY a JSON object — no markdown fences, no explanation outside the JSON:
{
  "files": [
    { "name": "index.html", "content": "..." }
  ],
  "explanation": "one sentence"
}

DESIGN REQUIREMENTS — non-negotiable:
- Dark, modern aesthetic: deep background (#0f0f11 or similar), NOT white or light grey
- Use a beautiful color palette: rich accent colors (violet, indigo, emerald, amber — pick one that fits the app)
- Glassmorphism cards: semi-transparent panels with backdrop-filter blur and subtle borders (rgba white borders)
- Smooth CSS transitions and hover effects on every interactive element
- Gradient text for headings using background-clip
- Custom styled inputs, buttons, checkboxes — never default browser UI
- Generous padding and spacing — breathable layout
- Inter or system-ui font stack, clean typography hierarchy
- Subtle shadows and glows on key elements
- Fully responsive, centered layout

TECHNICAL REQUIREMENTS:
- Single self-contained index.html with all CSS and JS embedded — zero external dependencies
- Complete, working functionality — no placeholders or TODO comments
- Smooth animations for state changes (adding/removing items, transitions)
- Use localStorage where appropriate so data persists
- All features described must be implemented and working`;

  const userMessage = existingCode
    ? `Update this app based on this request: ${description}\n\nExisting code:\n${existingCode}`
    : `Build me this app: ${description}`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let res: Response | null = null;
        let lastErr = "";

        // Try each model in turn; on a 429 (rate limit) fall through to the next.
        for (const model of GROQ_MODELS) {
          const attempt = await fetch(GROQ_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            },
            body: JSON.stringify({
              model,
              stream: true,
              temperature: 0.7,
              max_tokens: 6000,
              response_format: { type: "json_object" },
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage },
              ],
            }),
          });

          if (attempt.ok && attempt.body) {
            res = attempt;
            break;
          }

          const detail = await attempt.text().catch(() => "");
          lastErr = `Groq API error (${attempt.status}): ${detail}`;
          // Only fall back on rate limits; other errors are not retryable.
          if (attempt.status !== 429) break;
        }

        if (!res || !res.body) {
          throw new Error(lastErr || "Groq request failed");
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
