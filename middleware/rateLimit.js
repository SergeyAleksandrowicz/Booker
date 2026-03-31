const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { createClient } = require('redis');

const REDIS_URL = process.env.REDIS_URL;
const RATE_LIMIT_FAIL_OPEN = process.env.RATE_LIMIT_FAIL_OPEN !== 'false';

let sharedStore;

if (REDIS_URL) {
  const redisClient = createClient({
    url: REDIS_URL,
  });

  redisClient.on('error', (error) => {
    console.error('Redis rate-limit client error:', error.message);
  });

  redisClient
    .connect()
    .then(() => {
      console.log('Redis connected for rate limiting.');
    })
    .catch((error) => {
      console.error('Failed to connect Redis for rate limiting:', error.message);
    });

  sharedStore = new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
    prefix: process.env.RATE_LIMIT_PREFIX || 'rl:',
  });
} else {
  console.warn('REDIS_URL not set. Using in-memory rate limit store.');
}

function createLimiter({ windowMs, max, message }) {
  const options = {
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message,
    passOnStoreError: RATE_LIMIT_FAIL_OPEN,
  };

  if (sharedStore) {
    options.store = sharedStore;
  }

  return rateLimit(options);
}

const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.',
  },
});

const bookingLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: {
    success: false,
    message: 'Too many booking requests. Please slow down and try again later.',
  },
});

module.exports = {
  authLimiter,
  bookingLimiter,
};
