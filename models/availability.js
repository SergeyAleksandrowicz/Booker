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

const { Service } = require('./service');

// Define the Availability model
class Availability extends Model {}

Availability.init(
  {
    serviceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'services',
        key: 'id',
      },
    },
    date: {
      type: DataTypes.DATEONLY, // YYYY-MM-DD format
      allowNull: false,
    },
    startTime: {
      type: DataTypes.TIME, // HH:MM:SS format
      allowNull: false,
    },
    endTime: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    slotsAvailable: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    sequelize,
    modelName: 'Availability',
    tableName: 'availabilities',
    timestamps: true,
  }
);

// Set up association
Availability.belongsTo(Service, { foreignKey: 'serviceId' });

/**
 * Create a new availability slot
 */
async function createAvailability({ serviceId, date, startTime, endTime, slotsAvailable = 1 }) {
  try {
    return await Availability.create({
      serviceId,
      date,
      startTime,
      endTime,
      slotsAvailable,
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Get availability slots for a specific service
 */
async function getAvailabilityByServiceId(serviceId, fromDate = null) {
  try {
    const where = { serviceId };
    if (fromDate) {
      where.date = {
        [Sequelize.Op.gte]: fromDate,
      };
    }
    return await Availability.findAll({
      where,
      include: [{ model: Service, attributes: ['id', 'name', 'duration', 'price'] }],
      order: [['date', 'ASC'], ['startTime', 'ASC']],
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Get a specific availability slot
 */
async function getAvailabilityById(id) {
  try {
    return await Availability.findByPk(id, {
      include: [{ model: Service, attributes: ['id', 'name', 'duration', 'price'] }],
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Get available slots for a date range
 */
async function getAvailabilityByDateRange(serviceId, startDate, endDate) {
  try {
    return await Availability.findAll({
      where: {
        serviceId,
        date: {
          [Sequelize.Op.between]: [startDate, endDate],
        },
      },
      include: [{ model: Service, attributes: ['id', 'name', 'duration', 'price'] }],
      order: [['date', 'ASC'], ['startTime', 'ASC']],
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Update availability slot
 */
async function updateAvailability(id, { date, startTime, endTime, slotsAvailable }) {
  try {
    const availability = await Availability.findByPk(id);
    if (!availability) {
      return null;
    }
    if (date !== undefined) availability.date = date;
    if (startTime !== undefined) availability.startTime = startTime;
    if (endTime !== undefined) availability.endTime = endTime;
    if (slotsAvailable !== undefined) availability.slotsAvailable = slotsAvailable;
    
    await availability.save();
    return availability;
  } catch (error) {
    throw error;
  }
}

/**
 * Delete availability slot
 */
async function deleteAvailability(id) {
  try {
    const availability = await Availability.findByPk(id);
    if (!availability) {
      return false;
    }
    await availability.destroy();
    return true;
  } catch (error) {
    throw error;
  }
}

/**
 * Decrement or increment available slots (for booking management)
 */
async function updateSlots(id, change) {
  try {
    const availability = await Availability.findByPk(id);
    if (!availability) {
      return null;
    }
    availability.slotsAvailable += change;
    await availability.save();
    return availability;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  sequelize,
  Availability,
  createAvailability,
  getAvailabilityByServiceId,
  getAvailabilityById,
  getAvailabilityByDateRange,
  updateAvailability,
  deleteAvailability,
  updateSlots,
};
