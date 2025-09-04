const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('./routes');
const { notFoundHandler, errorHandler, requestId } = require('./middlewares');

const app = express();

// Global middlewares
app.use(requestId);
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() });
});

// Routes
app.use('/api', routes);

// 404 and error handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
