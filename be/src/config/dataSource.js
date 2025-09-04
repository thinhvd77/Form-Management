require('dotenv').config();
const { DataSource } = require('typeorm');

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || undefined,
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin123',
  database: process.env.DB_NAME || 'formreview',
  synchronize: false,
  logging: false,
  entities: [__dirname + '/../entities/*.js'],
  migrations: [__dirname + '/../migrations/*.js'],
});

module.exports = { AppDataSource };
