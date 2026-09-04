import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { command } = req.body;

  if (!command) {
    return res.status(400).json({ error: "Missing command" });
  }

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: `Ets ARIA, l'assistent intel·ligent. El usuari ha dit: "${command}"

Interpreta aquesta comanda i:
1. Si és per afegir al calendari: Extreu títol, data (interpretant "dissabte", "diumenge", "tot el finde", demà, etc.), hora si es menciona, i si és "tot el dia".
2. Si és per afegir a coses per fer (to-do): Crea l'element.
3. Si és per marcar com completat: Demana clarificació si cal.

Si falta informació, pregunta en català de manera natural.

Respon SEMPRE en JSON:
{
  "action": "add_to_calendar" | "add_to_todo" | "mark_complete" | "ask",
  "title": "El títol o descripció",
  "data": {
    "calendar": {"title": "...", "start_date": "YYYY-MM-DD", "start_time": "HH:MM", "end_date": "YYYY-MM-DD", "end_time": "HH:MM", "all_day": true/false},
    "todo": {"title": "..."}
  },
  "question": "Si falta info, la pregunta aquí",
  "success": true
}`,
        },
      ],
    });

    const textContent = response.content[0]?.text || "";
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return res.status(400).json({ error: "Could not parse response" });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return res.status(200).json({
      success: true,
      action: parsed.action,
      title: parsed.title,
      question: parsed.question || null,
      data: parsed.data || {},
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}
