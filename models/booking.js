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

const { User } = require('./user');
const { Availability } = require('./availability');

// Define the Booking model
class Booking extends Model {}

Booking.init(
  {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    availabilityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'availabilities',
        key: 'id',
      },
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'cancelled', 'completed'),
      defaultValue: 'pending',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Booking',
    tableName: 'bookings',
    timestamps: true,
  }
);

// Set up associations
Booking.belongsTo(User, { foreignKey: 'userId' });
Booking.belongsTo(Availability, { foreignKey: 'availabilityId' });

/**
 * Create a new booking
 */
async function createBooking({ userId, availabilityId, status = 'pending', notes = null }) {
  try {
    return await Booking.create({
      userId,
      availabilityId,
      status,
      notes,
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Get all bookings for a user
 */
async function getBookingsByUserId(userId) {
  try {
    return await Booking.findAll({
      where: { userId },
      include: [
        {
          model: Availability,
          attributes: ['id', 'date', 'startTime', 'endTime'],
          include: [
            {
              model: 'Service',
              attributes: ['id', 'name', 'duration', 'price'],
            },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Get a specific booking
 */
async function getBookingById(id) {
  try {
    return await Booking.findByPk(id, {
      include: [
        {
          model: User,
          attributes: { exclude: ['password'] },
        },
        {
          model: Availability,
          attributes: ['id', 'date', 'startTime', 'endTime'],
          include: [
            {
              model: 'Service',
              attributes: ['id', 'name', 'duration', 'price'],
            },
          ],
        },
      ],
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Update booking status
 */
async function updateBookingStatus(id, status) {
  try {
    const booking = await Booking.findByPk(id);
    if (!booking) {
      return null;
    }
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }
    booking.status = status;
    await booking.save();
    return booking;
  } catch (error) {
    throw error;
  }
}

/**
 * Update booking notes
 */
async function updateBookingNotes(id, notes) {
  try {
    const booking = await Booking.findByPk(id);
    if (!booking) {
      return null;
    }
    booking.notes = notes;
    await booking.save();
    return booking;
  } catch (error) {
    throw error;
  }
}

/**
 * Cancel a booking
 */
async function cancelBooking(id) {
  try {
    const booking = await Booking.findByPk(id);
    if (!booking) {
      return null;
    }
    if (booking.status === 'cancelled') {
      throw new Error('Booking is already cancelled');
    }
    booking.status = 'cancelled';
    await booking.save();
    return booking;
  } catch (error) {
    throw error;
  }
}

/**
 * Delete a booking
 */
async function deleteBooking(id) {
  try {
    const booking = await Booking.findByPk(id);
    if (!booking) {
      return false;
    }
    await booking.destroy();
    return true;
  } catch (error) {
    throw error;
  }
}

/**
 * Get bookings for a specific availability (to check how many booked)
 */
async function getBookingsByAvailabilityId(availabilityId) {
  try {
    return await Booking.findAll({
      where: { availabilityId, status: { [Sequelize.Op.ne]: 'cancelled' } },
      attributes: ['id', 'userId', 'status'],
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Get user's bookings for a date range
 */
async function getUserBookingsByDateRange(userId, startDate, endDate) {
  try {
    return await Booking.findAll({
      where: { userId },
      include: [
        {
          model: Availability,
          where: {
            date: {
              [Sequelize.Op.between]: [startDate, endDate],
            },
          },
          attributes: ['id', 'date', 'startTime', 'endTime'],
          include: [
            {
              model: 'Service',
              attributes: ['id', 'name', 'duration', 'price'],
            },
          ],
        },
      ],
      order: [[Sequelize.col('Availability.date'), 'ASC']],
    });
  } catch (error) {
    throw error;
  }
}

module.exports = {
  sequelize,
  Booking,
  createBooking,
  getBookingsByUserId,
  getBookingById,
  updateBookingStatus,
  updateBookingNotes,
  cancelBooking,
  deleteBooking,
  getBookingsByAvailabilityId,
  getUserBookingsByDateRange,
};
