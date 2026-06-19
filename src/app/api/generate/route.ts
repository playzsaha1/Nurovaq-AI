import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await model.generateContentStream(userMessage);

        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
            );
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
