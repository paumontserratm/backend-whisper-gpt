const { OpenAI } = require("openai");

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
    // Aseguramos que el body esté parseado si viene como string
    let fragmentos;

    if (typeof req.body === "string") {
      const parsed = JSON.parse(req.body);
      fragmentos = parsed.fragmentos;
    } else {
      fragmentos = req.body.fragmentos;
    }

    console.log("🧩 Fragmentos recibidos:", fragmentos);

    if (!fragmentos || !Array.isArray(fragmentos) || fragmentos.length === 0) {
      return res.status(400).json({ error: "No se proporcionaron fragmentos válidos" });
    }

    const contenido = fragmentos.join("\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: "Resume esta reunión de forma clara, ordenada y útil para compartir con alguien que no asistió.",
        },
        {
          role: "user",
          content: contenido,
        },
      ],
    });

    const resumen = completion.choices[0].message.content;
    res.status(200).json({ resumen });

  } catch (error) {
    console.error("❌ Error en resumir:", error);

    // Si es un problema de JSON mal formado
    if (error instanceof SyntaxError) {
      return res.status(400).json({ error: "El body no es un JSON válido" });
    }

    res.status(500).json({ error: "Error al generar el resumen" });
  }
};
