const { OpenAI } = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { fragmentos } = req.body;

    if (!fragmentos || !Array.isArray(fragmentos) || fragmentos.length === 0) {
      return res.status(400).json({ error: "No se proporcionaron fragmentos válidos" });
    }

    const contenido = fragmentos.join("\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "Resume esta reunión de forma clara, ordenada y útil para compartir con alguien que no asistió." },
        { role: "user", content: contenido },
      ],
    });

    const resumen = completion.choices[0].message.content;
    res.status(200).json({ resumen });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al generar el resumen" });
  }
};
