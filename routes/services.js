const express = require('express');
const { getAllActiveServices, getServiceById } = require('../models/service');
const {
  getAvailabilityByServiceId,
  getAvailabilityByDateRange,
} = require('../models/availability');

const router = express.Router();

/**
 * GET /api/services
 * Get all active services
 */
router.get('/', async (req, res) => {
  try {
    const services = await getAllActiveServices();

    res.status(200).json({
      success: true,
      message: 'Services retrieved successfully',
      count: services.length,
      services,
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch services',
      error: error.message,
    });
  }
});

/**
 * GET /api/services/:id
 * Get single service details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Service ID is required',
      });
    }

    const service = await getServiceById(id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Service retrieved successfully',
      service,
    });
  } catch (error) {
    console.error('Error fetching service:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service',
      error: error.message,
    });
  }
});

/**
 * GET /api/services/:serviceId/availability
 * Get all available time slots for a service
 * Optional query: ?fromDate=YYYY-MM-DD to get slots from specific date onwards
 */
router.get('/:serviceId/availability', async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { fromDate } = req.query;

    if (!serviceId) {
      return res.status(400).json({
        success: false,
        message: 'Service ID is required',
      });
    }

    // Verify service exists
    const service = await getServiceById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    // Get availability
    const availability = await getAvailabilityByServiceId(serviceId, fromDate);

    res.status(200).json({
      success: true,
      message: 'Availability retrieved successfully',
      service: {
        id: service.id,
        name: service.name,
        duration: service.duration,
        price: service.price,
      },
      count: availability.length,
      availability,
    });
  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch availability',
      error: error.message,
    });
  }
});

/**
 * GET /api/services/:serviceId/availability/dates/:startDate/:endDate
 * Get availability within a date range (for calendar view)
 * Dates should be in YYYY-MM-DD format
 */
router.get('/:serviceId/availability/dates/:startDate/:endDate', async (req, res) => {
  try {
    const { serviceId, startDate, endDate } = req.params;

    if (!serviceId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Service ID and date range (YYYY-MM-DD) are required',
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Dates must be in YYYY-MM-DD format',
      });
    }

    // Verify service exists
    const service = await getServiceById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    // Verify date range logic
    if (startDate > endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before or equal to end date',
      });
    }

    // Get availability by date range
    const availability = await getAvailabilityByDateRange(serviceId, startDate, endDate);

    res.status(200).json({
      success: true,
      message: 'Calendar availability retrieved successfully',
      service: {
        id: service.id,
        name: service.name,
        duration: service.duration,
        price: service.price,
      },
      dateRange: {
        startDate,
        endDate,
      },
      count: availability.length,
      availability,
    });
  } catch (error) {
    console.error('Error fetching calendar availability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch calendar availability',
      error: error.message,
    });
  }
});

module.exports = router;
