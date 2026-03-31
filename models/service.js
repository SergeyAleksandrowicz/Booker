const { Sequelize, DataTypes, Model } = require('sequelize');
require('dotenv').config();

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

// Define the Service model
class Service extends Model {}

Service.init(
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    duration: {
      type: DataTypes.INTEGER, // in minutes
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: 'Service',
    tableName: 'services',
    timestamps: true,
  }
);

/**
 * Create a new service
 */
async function createService({ name, description, duration, price, active = true }) {
  try {
    return await Service.create({
      name,
      description,
      duration,
      price,
      active,
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Get all active services
 */
async function getAllActiveServices() {
  try {
    return await Service.findAll({
      where: { active: true },
      order: [['createdAt', 'DESC']],
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Get service by ID
 */
async function getServiceById(id) {
  try {
    return await Service.findByPk(id);
  } catch (error) {
    throw error;
  }
}

/**
 * Update a service
 */
async function updateService(id, { name, description, duration, price, active }) {
  try {
    const service = await Service.findByPk(id);
    if (!service) {
      return null;
    }
    if (name !== undefined) service.name = name;
    if (description !== undefined) service.description = description;
    if (duration !== undefined) service.duration = duration;
    if (price !== undefined) service.price = price;
    if (active !== undefined) service.active = active;
    
    await service.save();
    return service;
  } catch (error) {
    throw error;
  }
}

/**
 * Delete a service
 */
async function deleteService(id) {
  try {
    const service = await Service.findByPk(id);
    if (!service) {
      return false;
    }
    await service.destroy();
    return true;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  sequelize,
  Service,
  createService,
  getAllActiveServices,
  getServiceById,
  updateService,
  deleteService,
};
