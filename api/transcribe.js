const { OpenAI } = require("openai");
const FormData = require("form-data");
const fetch = require("node-fetch");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

module.exports = async (req, res) => {
  // CORS HEADERS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const contentType = req.headers["content-type"];
    const extension = contentType.includes("mp3") ? "mp3" : "webm";
    const mime = contentType.includes("mp3") ? "audio/mpeg" : "audio/webm";

    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", async () => {
      const audioBuffer = Buffer.concat(chunks);

      // VERIFICAR tamaño máximo permitido por Vercel
      if (audioBuffer.length > 4 * 1024 * 1024) {
        return res.status(413).json({ error: "Archivo demasiado grande (límite 4 MB)" });
      }

      const form = new FormData();
      form.append("file", audioBuffer, {
        filename: `audio.${extension}`,
        contentType: mime,
      });
      form.append("model", "whisper-1");

      const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          ...form.getHeaders(),
        },
        body: form,
      });

      const whisperData = await whisperRes.json();

      if (!whisperData.text) {
        console.error("Transcription error:", whisperData);
        return res.status(500).json({ error: "Error en la transcripción" });
      }

      // Llama a GPT-4 TURBO para resumir
      const chatRes = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: "Resume esta conversación comercial de forma clara y ordenada.",
          },
          {
            role: "user",
            content: whisperData.text,
          },
        ],
      });

      const resumen = chatRes.choices[0].message.content;
      res.status(200).json({ resumen });
    });
  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ error: "Error procesando el archivo de audio" });
  }
};
