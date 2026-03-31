const express = require('express');
const { Op } = require('sequelize');
const { body, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const sequelize = require('../models/db');
const {
  Booking,
  createBooking,
  getBookingsByUserId,
  getBookingById,
  updateBookingStatus,
  updateBookingNotes,
} = require('../models/booking');
const { Availability, getAvailabilityById } = require('../models/availability');

const router = express.Router();

/**
 * POST /api/bookings
 * Create a new booking (requires authentication)
 * Body: { availabilityId, notes (optional) }
 */
router.post(
  '/',
  authMiddleware,
  [
    body('availabilityId')
      .isInt({ min: 1 })
      .withMessage('A valid availability ID is required'),
    body('notes')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters'),
  ],
  async (req, res) => {
    let transaction;
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array(),
        });
      }

      const { availabilityId, notes } = req.body;
      const userId = req.user.id;
      transaction = await sequelize.transaction();

      // Lock the availability row so only one request can modify slots at a time
      const availability = await Availability.findByPk(availabilityId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!availability) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Availability slot not found',
        });
      }

      if (availability.slotsAvailable <= 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'No slots available for this time slot',
        });
      }

      const existingBooking = await Booking.findOne({
        where: {
          userId,
          availabilityId,
          status: {
            [Op.ne]: 'cancelled',
          },
        },
        transaction,
      });

      if (existingBooking) {
        await transaction.rollback();
        return res.status(409).json({
          success: false,
          message: 'You already have an active booking for this slot',
        });
      }

      // Create booking
      const booking = await createBooking({
        userId,
        availabilityId,
        status: 'pending',
        notes: notes || null,
        transaction,
      });

      // Decrement available slots inside the same transaction
      availability.slotsAvailable -= 1;
      await availability.save({ transaction });

      await transaction.commit();

      const bookingAvailability = await getAvailabilityById(availabilityId);

      res.status(201).json({
        success: true,
        message: 'Booking created successfully',
        booking: {
          id: booking.id,
          status: booking.status,
          notes: booking.notes,
          createdAt: booking.createdAt,
          availability: {
            id: bookingAvailability.id,
            date: bookingAvailability.date,
            startTime: bookingAvailability.startTime,
            endTime: bookingAvailability.endTime,
            service: {
              id: bookingAvailability.Service.id,
              name: bookingAvailability.Service.name,
              duration: bookingAvailability.Service.duration,
              price: bookingAvailability.Service.price,
            },
          },
        },
      });
    } catch (error) {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          success: false,
          message: 'You already have an active booking for this slot',
        });
      }
      console.error('Error creating booking:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create booking',
      });
    }
  }
);

/**
 * GET /api/bookings
 * Get all bookings for authenticated user
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const bookings = await getBookingsByUserId(userId);

    res.status(200).json({
      success: true,
      message: 'Bookings retrieved successfully',
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings',
    });
  }
});

/**
 * GET /api/bookings/:id
 * Get specific booking details (only own bookings)
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required',
      });
    }

    const booking = await getBookingById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Check ownership
    if (booking.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You can only view your own bookings',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Booking retrieved successfully',
      booking,
    });
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking',
    });
  }
});

/**
 * PATCH /api/bookings/:id
 * Update booking status or notes
 * Body: { status: 'confirmed'|'completed', notes: '...' }
 */
router.patch(
  '/:id',
  authMiddleware,
  [
    body('status')
      .optional()
      .isIn(['confirmed', 'completed'])
      .withMessage('Status must be confirmed or completed'),
    body('notes')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array(),
        });
      }

      const { id } = req.params;
      const { status, notes } = req.body;
      const userId = req.user.id;

      if (status === 'cancelled') {
        return res.status(400).json({
          success: false,
          message: 'Use DELETE /api/bookings/:id to cancel bookings so availability is restored correctly',
        });
      }

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Booking ID is required',
        });
      }

      // Get booking and verify ownership
      const booking = await getBookingById(id);
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found',
        });
      }

      if (booking.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized: You can only update your own bookings',
        });
      }

      let updatedBooking = booking;

      // Update status if provided
      if (status) {
        updatedBooking = await updateBookingStatus(id, status);
      }

      // Update notes if provided
      if (notes !== undefined) {
        updatedBooking = await updateBookingNotes(id, notes);
      }

      res.status(200).json({
        success: true,
        message: 'Booking updated successfully',
        booking: updatedBooking,
      });
    } catch (error) {
      console.error('Error updating booking:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update booking',
      });
    }
  }
);

/**
 * DELETE /api/bookings/:id
 * Cancel a booking (set status to cancelled)
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  let transaction;
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required',
      });
    }

    transaction = await sequelize.transaction();

    // Lock booking row to prevent concurrent cancellation races
    const booking = await Booking.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!booking) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    if (booking.userId !== userId) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You can only cancel your own bookings',
      });
    }

    if (booking.status === 'cancelled') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Booking is already cancelled',
      });
    }

    const availability = await Availability.findByPk(booking.availabilityId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!availability) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Availability slot not found',
      });
    }

    booking.status = 'cancelled';
    await booking.save({ transaction });

    availability.slotsAvailable += 1;
    await availability.save({ transaction });

    await transaction.commit();

    const cancelledBooking = await getBookingById(id);

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      booking: cancelledBooking,
    });
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error('Error cancelling booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel booking',
    });
  }
});

module.exports = router;
