const { OpenAI } = require('openai');
const FormData = require('form-data');
const fetch = require('node-fetch');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', async () => {
      const audioBuffer = Buffer.concat(chunks);

      // Usamos .mp3 por defecto (es el más común y compatible)
      const form = new FormData();
      form.append('file', audioBuffer, {
        filename: 'audio.mp3',
        contentType: 'audio/mpeg',
      });
      form.append('model', 'whisper-1');

      const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          ...form.getHeaders(),
        },
        body: form,
      });

      const whisperData = await whisperRes.json();

      if (!whisperData.text) {
        console.error('Transcription error:', whisperData);
        return res.status(500).json({ error: 'Error en la transcripción' });
      }

      const chatRes = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Resume esta conversación comercial de forma clara y ordenada.',
          },
          {
            role: 'user',
            content: whisperData.text,
          },
        ],
      });

      const resumen = chatRes.choices[0].message.content;
      res.status(200).json({ resumen });
    });
  } catch (err) {
    console.error('ERROR:', err);
    res.status(500).json({ error: 'Error procesando el archivo de audio' });
  }
};
