const http       = require('http');
const app        = require('./src/app');
const initSocket = require('./src/socket/socket');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

initSocket(server);

server.listen(PORT, () => {
  console.log(`🚀 Changuita API corriendo en puerto ${PORT}`);
  console.log(`📡 Entorno: ${process.env.NODE_ENV}`);
});

module.exports = server;