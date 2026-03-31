require('dotenv').config();

const getDialectOptions = (env) => {
  const options = {};
  if (env === 'production' || process.env.PGSSL === 'true') {
    options.ssl = {
      require: true,
      rejectUnauthorized: true,
    };
  }
  return options;
};

module.exports = {
  development: {
    username: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    dialect: 'postgres',
    logging: false,
    dialectOptions: getDialectOptions('development'),
  },
  production: {
    username: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    dialect: 'postgres',
    logging: false,
    dialectOptions: getDialectOptions('production'),
  },
};
