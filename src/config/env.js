require('dotenv').config();

module.exports = {
  port:    process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  db: {
    host:     process.env.DB_HOST,
    port:     process.env.DB_PORT,
    name:     process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },

  jwt: {
    secret:         process.env.JWT_SECRET,
    expiresIn:      process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret:  process.env.JWT_REFRESH_SECRET,
    refreshExpires: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  mercadopago: {
    accessToken: process.env.MP_ACCESS_TOKEN,
    publicKey:   process.env.MP_PUBLIC_KEY,
  },
};