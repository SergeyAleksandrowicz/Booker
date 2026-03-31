const jwt = require('jsonwebtoken');

/**
 * Generate an access token (short-lived)
 * @param {Object} user - User object with id and email
 * @returns {string} Signed JWT access token
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRE || '15m' }
  );
};

/**
 * Generate a refresh token (long-lived)
 * @param {Object} user - User object with id and email
 * @returns {string} Signed JWT refresh token
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
};

/**
 * Verify an access token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
};

/**
 * Verify a refresh token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

/**
 * Generate both tokens (returns object with accessToken and refreshToken)
 * @param {Object} user - User object with id and email
 * @returns {Object} Object containing accessToken and refreshToken
 */
const generateTokens = (user) => {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
  };
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateTokens,
};
