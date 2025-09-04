const path = require('path');

const config = {
  env: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  app: {
    name: process.env.APP_NAME || 'FormReview',
    port: parseInt(process.env.PORT || '3000', 10),
  },
  db: {
    url: process.env.DATABASE_URL || '',
  },
  paths: {
    root: path.resolve(__dirname, '../../'),
  },
};

module.exports = config;
