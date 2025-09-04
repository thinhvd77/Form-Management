// Basic middlewares: requestId, 404 handler, and error handler

function generateId() {
  // Simple, dependency-free request id
  const rnd = Math.random().toString(16).slice(2, 10);
  return `${Date.now().toString(16)}-${rnd}`;
}

function requestId(req, res, next) {
  const id = req.headers['x-request-id'] || generateId();
  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
}

function notFoundHandler(req, res, _next) {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl, requestId: req.id });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  if (process.env.NODE_ENV !== 'test') {
    // Basic server-side logging
    // eslint-disable-next-line no-console
    console.error(`[${req.id || '-'}]`, message, err.stack || '');
  }
  res.status(status).json({ error: message, status, requestId: req.id });
}

module.exports = { requestId, notFoundHandler, errorHandler };
