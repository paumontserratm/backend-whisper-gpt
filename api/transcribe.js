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
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", async () => {
      const audioBuffer = Buffer.concat(chunks);

      // DEBUG: mostrar tamaño y tipo estimado
      console.log("Audio recibido:", audioBuffer.length, "bytes");

      const form = new FormData();
      form.append("file", audioBuffer, {
        filename: "audio.mp3", // asegúrate de usar extensión real si es webm
        contentType: "audio/mpeg", // o "audio/webm" si corresponde
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

      // Mostrar toda la respuesta de OpenAI por debug
      console.log("🔎 Whisper Response:", whisperData);

      if (!whisperData.text) {
        return res.status(500).json({ error: "OpenAI no devolvió texto", raw: whisperData });
      }

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
    res.status(500).json({ error: "Error procesando el audio", details: err.message });
  }
};
