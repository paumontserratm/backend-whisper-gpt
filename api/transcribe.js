const fetch = require('node-fetch');
const FormData = require('form-data');
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', async () => {
    const audioBuffer = Buffer.concat(chunks);

    try {
      const form = new FormData();
      form.append('file', audioBuffer, {
        filename: 'audio.webm',
        contentType: 'audio/webm',
      });
      form.append('model', 'whisper-1');

      const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: form,
      });

      const { text } = await whisperRes.json();

      const chatRes = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'Resume esta conversación comercial de forma clara y ordenada.' },
          { role: 'user', content: text },
        ],
      });

      const resumen = chatRes.choices[0].message.content;
      res.status(200).json({ resumen });
    } catch (err) {
      console.error(err);
      res.status(500).send('Error procesando audio');
    }
  });
};