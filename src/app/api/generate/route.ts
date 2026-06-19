import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
- For web apps: output HTML, CSS, JS in separate files or a single self-contained HTML file
- For React apps: use modern React with hooks
- Include all necessary code so the app works standalone
- Make the UI beautiful with modern styling (use Tailwind CSS inline styles or embedded CSS)
- The first file should always be the main entry point (index.html or App.tsx etc.)`;

  const userMessage = existingCode
    ? `Update this app based on this request: ${description}\n\nExisting code:\n${existingCode}`
    : `Build me this app: ${description}`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.create({
          model: "claude-opus-4-8",
          max_tokens: 16000,
          thinking: { type: "adaptive" },
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage }],
          stream: true,
        });

        for await (const event of response) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ text: event.delta.text })}\n\n`
              )
            );
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: String(err) })}\n\n`
          )
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
