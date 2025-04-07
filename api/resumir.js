const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { textos } = req.body;

    if (!Array.isArray(textos) || textos.length === 0) {
      return res.status(400).json({ error: 'Debes enviar una lista de textos' });
    }

    const textoTotal = textos.join('\n\n');

    const chatRes = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Resume esta conversación comercial de forma clara y ordenada.',
        },
        {
          role: 'user',
          content: textoTotal,
        },
      ],
    });

    const resumen = chatRes.choices[0].message.content;
    res.status(200).json({ resumen });
  } catch (err) {
    console.error('ERROR:', err);
    res.status(500).json({ error: 'Error generando resumen' });
  }
};