const { Sequelize } = require('sequelize');
require('dotenv').config();

/**
 * Central Sequelize instance shared by all models
 */
const sequelize = new Sequelize(
  process.env.PGDATABASE,
  process.env.PGUSER,
  process.env.PGPASSWORD,
  {
    host: process.env.PGHOST || 'localhost',
    port: process.env.PGPORT || 5432,
    dialect: 'postgres',
    logging: false,
  }
);

module.exports = sequelize;
