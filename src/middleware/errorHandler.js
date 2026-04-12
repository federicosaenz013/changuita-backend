const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);

  if (err.code === '23505') {
    return res.status(409).json({ error: 'Ya existe un registro con esos datos' });
  }

  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referencia inválida en los datos' });
  }

  const status  = err.status || 500;
  const message = err.message || 'Error interno del servidor';

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;