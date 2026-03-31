const express = require('express');
const { body, validationResult } = require('express-validator');
const { User, createUser, findUserByEmail } = require('../models/user');
const { generateTokens, verifyRefreshToken } = require('../utils/tokenUtils');

const router = express.Router();

/**
 * POST /auth/register
 * Register a new user
 * Body: { email, password, passwordConfirm }
 */
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('passwordConfirm').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array(),
        });
      }

      const { email, password } = req.body;

      // Check if user already exists
      const existingUser = await findUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Email is already registered',
        });
      }

      // Create user with hashed password
      const newUser = await createUser({ email, password });

      if (newUser.error) {
        return res.status(400).json({
          success: false,
          message: newUser.error,
          details: newUser.details,
        });
      }

      // Generate tokens
      const tokens = generateTokens(newUser);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: {
          id: newUser.id,
          email: newUser.email,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }
);

/**
 * POST /auth/login
 * Login a user
 * Body: { email, password }
 */
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array(),
        });
      }

      const { email, password } = req.body;

      // Find user
      const user = await findUserByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      // Generate tokens
      const tokens = generateTokens(user);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }
);

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 * Body: { refreshToken }
 */
router.post('/refresh', [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array(),
      });
    }

    const { refreshToken } = req.body;

    try {
      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken);

      // Find user to ensure they still exist
      const user = await User.findOne({ where: { id: decoded.id } });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found',
        });
      }

      // Generate new tokens
      const tokens = generateTokens(user);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Refresh token expired. Please login again.',
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

module.exports = router;
