const { Sequelize } = require('sequelize');
require('dotenv').config();

/**
 * Central Sequelize instance shared by all models
 */
const getDialectOptions = () => {
  const options = {};
  if (process.env.NODE_ENV === 'production' || process.env.PGSSL === 'true') {
    options.ssl = {
      require: true,
      rejectUnauthorized: true,
    };
  }
  return options;
};

const sequelize = new Sequelize(
  process.env.PGDATABASE,
  process.env.PGUSER,
  process.env.PGPASSWORD,
  {
    host: process.env.PGHOST || 'localhost',
    port: process.env.PGPORT || 5432,
    dialect: 'postgres',
    logging: false,
    dialectOptions: getDialectOptions(),
  }
);

module.exports = sequelize;
