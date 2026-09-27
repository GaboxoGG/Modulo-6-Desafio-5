const logger = (req, res, next) => {
  const fecha = new Date().toLocaleString();

  console.log(`[${fecha}] Ruta consultada: ${req.method} ${req.originalUrl}`);

  next();
};

module.exports = logger;