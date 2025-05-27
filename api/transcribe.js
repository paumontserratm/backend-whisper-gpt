// File: api/transcribe.js (CommonJS)
const { OpenAI } = require("openai");
const FormData = require("form-data");
const fetch = require("node-fetch");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

module.exports = async (req, res) => {
  // CORS
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
    // Leemos el body como Buffer
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", async () => {
      const audioBuffer = Buffer.concat(chunks);
      console.log("🎧 Audio recibido:", audioBuffer.length, "bytes");

      // Detectamos tipo MIME entrante
      const incomingCT = req.headers["content-type"] || "";
      let ext = "webm";
      let contentType = "audio/webm";
      if (incomingCT.includes("mpeg") || incomingCT.includes("mp3")) {
        ext = "mp3"; contentType = "audio/mpeg";
      } else if (incomingCT.includes("ogg")) {
        ext = "ogg"; contentType = "audio/ogg";
      }

      // Preparamos FormData para Whisper
      const form = new FormData();
      form.append("file", audioBuffer, {
        filename: `audio.${ext}`,
        contentType,
      });
      form.append("model", "whisper-1");

      // Llamada a Whisper
      const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          ...form.getHeaders(),
        },
        body: form,
      });
      const whisperData = await whisperRes.json();
      console.log("🔎 Whisper Response:", whisperData);
      if (!whisperData.text) {
        return res.status(500).json({ error: "OpenAI no devolvió texto", raw: whisperData });
      }

      // Generamos resumen via GPT-4
      const chatRes = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          { role: "system", content: "Resume esta conversación comercial de forma clara y ordenada." },
          { role: "user", content: whisperData.text },
        ],
      });
      const resumen = chatRes.choices[0].message.content;

      // Devolvemos transcripción y resumen
      res.status(200).json({
        transcription: whisperData.text,
        resumen
      });
    });
  } catch (err) {
    console.error("❌ Error en /api/transcribe:", err);
    res.status(500).json({ error: err.message });
  }
};
