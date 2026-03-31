const crypto = require('crypto');
const { DataTypes, Model, Op } = require('sequelize');
const sequelize = require('./db');

class RefreshToken extends Model {}

RefreshToken.init(
  {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    tokenId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    tokenHash: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    replacedByTokenId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    revokeReason: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'RefreshToken',
    tableName: 'refresh_tokens',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['expiresAt'] },
    ],
  }
);

function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function storeRefreshToken({ userId, tokenId, token, expiresAt }) {
  return RefreshToken.create({
    userId,
    tokenId,
    tokenHash: hashRefreshToken(token),
    expiresAt,
  });
}

async function findRefreshTokenByRawToken(token) {
  return RefreshToken.findOne({
    where: {
      tokenHash: hashRefreshToken(token),
    },
  });
}

async function rotateRefreshToken({ currentToken, nextTokenId, nextToken, nextExpiresAt }) {
  const tokenHash = hashRefreshToken(currentToken);

  return sequelize.transaction(async (transaction) => {
    const current = await RefreshToken.findOne({
      where: { tokenHash },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!current) {
      return { status: 'not_found' };
    }

    if (current.revokedAt) {
      return { status: 'already_revoked', token: current };
    }

    if (current.expiresAt <= new Date()) {
      current.revokedAt = new Date();
      current.revokeReason = 'expired';
      await current.save({ transaction });
      return { status: 'expired', token: current };
    }

    current.revokedAt = new Date();
    current.replacedByTokenId = nextTokenId;
    current.revokeReason = 'rotated';
    await current.save({ transaction });

    const next = await RefreshToken.create(
      {
        userId: current.userId,
        tokenId: nextTokenId,
        tokenHash: hashRefreshToken(nextToken),
        expiresAt: nextExpiresAt,
      },
      { transaction }
    );

    return { status: 'rotated', current, next };
  });
}

async function revokeRefreshTokenByRawToken(token, reason = 'logout') {
  const stored = await findRefreshTokenByRawToken(token);
  if (!stored) {
    return { status: 'not_found' };
  }

  if (!stored.revokedAt) {
    stored.revokedAt = new Date();
    stored.revokeReason = reason;
    await stored.save();
  }

  return { status: 'revoked', token: stored };
}

async function revokeAllUserRefreshTokens(userId, reason = 'token_reuse_detected') {
  await RefreshToken.update(
    {
      revokedAt: new Date(),
      revokeReason: reason,
    },
    {
      where: {
        userId,
        revokedAt: { [Op.is]: null },
      },
    }
  );
}

module.exports = {
  RefreshToken,
  hashRefreshToken,
  storeRefreshToken,
  findRefreshTokenByRawToken,
  rotateRefreshToken,
  revokeRefreshTokenByRawToken,
  revokeAllUserRefreshTokens,
};
