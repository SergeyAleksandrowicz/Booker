'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('refresh_tokens', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      tokenId: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      tokenHash: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      revokedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      replacedByTokenId: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      revokeReason: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('refresh_tokens', ['userId']);
    await queryInterface.addIndex('refresh_tokens', ['expiresAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('refresh_tokens');
  },
};
