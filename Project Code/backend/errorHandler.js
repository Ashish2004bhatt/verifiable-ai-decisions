const { HTTP_STATUS } = require('../config/constants');

function createErrorResponse(error, defaultMessage) {
  return {
    error: defaultMessage || 'An error occurred',
    details: error.message || 'Unknown error',
    timestamp: new Date().toISOString()
  };
}

function handleAsyncErrors(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function errorMiddleware(error, req, res, next) {
  console.error('Error middleware caught:', error);
  
  const statusCode = error.statusCode || HTTP_STATUS.INTERNAL_ERROR;
  const response = createErrorResponse(error, error.message || 'Internal server error');
  
  res.status(statusCode).json(response);
}

function notFoundMiddleware(req, res) {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
}

function requestLogger(req, res, next) {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
}

function validateContentType(req, res, next) {
  if (req.method === 'POST' || req.method === 'PUT') {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(400).json({
        error: 'Content-Type must be application/json'
      });
    }
  }
  next();
}

module.exports = {
  errorMiddleware,
  notFoundMiddleware,
  requestLogger,
  validateContentType,
  handleAsyncErrors,
  createErrorResponse
};

