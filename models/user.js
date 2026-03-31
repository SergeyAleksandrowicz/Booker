const { Sequelize, DataTypes, Model } = require('sequelize');
require('dotenv').config();
const bcrypt = require('bcrypt');
// Initialize Sequelize using environment variables
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

// Define the User model
class User extends Model {
  /**
   * Compare provided password with hashed password
   * @param {string} plainPassword - Password to compare
   * @returns {Promise<boolean>} True if password matches, false otherwise
   */
  async comparePassword(plainPassword) {
    return await bcrypt.compare(plainPassword, this.password);
  }
}

User.init(
  {
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: false, // Set to true if you have createdAt/updatedAt columns
  }
);

// Create a new user
// Create a new user
async function createUser({ email, password }) {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    return await User.create({ email, password:hashedPassword });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return { error: 'Email is already registered', details: error.errors };
    }
    if (error.name === 'SequelizeValidationError') {
      return { error: 'Invalid email format or missing required fields', details: error.errors };
    }
    throw error;
  }
}

// Find a user by email
async function findUserByEmail(email) {
  return await User.findOne({ where: { email } });
}

// Delete a user by email
async function deleteUserByEmail(email) {
  try {
    const deleted = await User.destroy({ where: { email } });
    return deleted > 0; // returns true if a user was deleted, false otherwise
  } catch (error) {
    throw error;
  }
}

module.exports = {
  sequelize,
  User,
  createUser,
  findUserByEmail,
  deleteUserByEmail,
};
