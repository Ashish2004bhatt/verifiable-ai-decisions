function createRateLimiter(windowMs, maxRequests) {
  const requestCounts = new Map();
  const windowMsValue = windowMs || 15 * 60 * 1000;
  const maxRequestsValue = maxRequests || 100;

  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMsValue;

    if (!requestCounts.has(ip)) {
      requestCounts.set(ip, []);
    }

    const requests = requestCounts.get(ip);
    const recentRequests = requests.filter(time => time > windowStart);
    
    if (recentRequests.length >= maxRequestsValue) {
      return res.status(429).json({
        error: 'Too many requests from this IP, please try again later.'
      });
    }

    recentRequests.push(now);
    requestCounts.set(ip, recentRequests);
    next();
  };
}

function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }
  next();
}

function validateRequestSize(req, res, next) {
  const maxSize = 10 * 1024 * 1024;
  const contentLength = parseInt(req.headers['content-length'] || '0');
  
  if (contentLength > maxSize) {
    return res.status(413).json({
      error: 'Request payload too large',
      maxSize: `${maxSize / 1024 / 1024}MB`
    });
  }
  
  next();
}

function addSecurityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
}

function corsOptions() {
  return {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  };
}

module.exports = {
  createRateLimiter,
  sanitizeInput,
  validateRequestSize,
  addSecurityHeaders,
  corsOptions
};

