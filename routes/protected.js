const express = require('express');
const authMiddleware = require('../middleware/auth');
const { User } = require('../models/user');

const router = express.Router();

/**
 * GET /protected/profile
 * Get authenticated user's profile
 * Requires: Valid JWT access token in Authorization header
 */
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    // req.user is set by authMiddleware
    const user = await User.findOne({
      where: { id: req.user.id },
      attributes: { exclude: ['password'] }, // Don't send password
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      user,
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

module.exports = router;
