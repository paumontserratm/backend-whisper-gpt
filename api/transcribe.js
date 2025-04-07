module.exports = (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  let size = 0;
  req.on('data', chunk => {
    size += chunk.length;
  });

  req.on('end', () => {
    res.status(200).json({ status: 'OK', message: `Recibido audio de ${size} bytes` });
  });
};
