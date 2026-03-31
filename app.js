const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const protectedRoutes = require('./routes/protected');
const servicesRoutes = require('./routes/services');
const bookingRoutes = require('./routes/bookings');

const app = express();

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

// Helmet helps secure Express apps by setting various HTTP headers
app.use(helmet());

// CORS - Allow requests from your frontend
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })
);

// ============================================================================
// BODY PARSING MIDDLEWARE
// ============================================================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// REQUEST LOGGING MIDDLEWARE
// ============================================================================

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// ROUTES
// ============================================================================

// Health check
app.get('/', (req, res) => {
  res.status(200).json({ message: 'API is online' });
});

// Auth routes (register, login, refresh)
app.use('/api/auth', authRoutes);

// Public service routes (browse services and availability)
app.use('/api/services', servicesRoutes);

// Protected booking routes (require authentication)
app.use('/api/bookings', bookingRoutes);

// Protected routes (require authentication)
app.use('/api/protected', protectedRoutes);

// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================

// 404 Not Found handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Default error response
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

module.exports = app;