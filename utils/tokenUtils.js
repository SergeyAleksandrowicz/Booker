const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');

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
  const tokenId = randomUUID();
  return jwt.sign(
    { id: user.id, email: user.email, tokenId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
};

/**
 * Generate refresh token and return both token and tokenId (jti-like claim)
 * @param {Object} user - User object with id and email
 * @returns {{token: string, tokenId: string}}
 */
const generateRefreshTokenWithId = (user) => {
  const tokenId = randomUUID();
  const token = jwt.sign(
    { id: user.id, email: user.email, tokenId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );

  return { token, tokenId };
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
  const refresh = generateRefreshTokenWithId(user);

  return {
    accessToken: generateAccessToken(user),
    refreshToken: refresh.token,
    refreshTokenId: refresh.tokenId,
  };
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateRefreshTokenWithId,
  verifyAccessToken,
  verifyRefreshToken,
  generateTokens,
};
