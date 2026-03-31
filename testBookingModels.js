const {
  Service,
  createService,
  getAllActiveServices,
  getServiceById,
  updateService,
  deleteService,
} = require('./models/service');

const {
  Availability,
  createAvailability,
  getAvailabilityByServiceId,
  getAvailabilityById,
  getAvailabilityByDateRange,
  updateAvailability,
  deleteAvailability,
  updateSlots,
} = require('./models/availability');

const {
  Booking,
  createBooking,
  getBookingsByUserId,
  getBookingById,
  updateBookingStatus,
  cancelBooking,
  deleteBooking,
} = require('./models/booking');

const { createUser, findUserByEmail } = require('./models/user');
const sequelize = require('./models/db');

/**
 * Test Service Model
 */
async function testServiceModel() {
  console.log('\n========== TESTING SERVICE MODEL ==========');
  try {
    // Create services
    console.log('\n1. Creating services...');
    const service1 = await createService({
      name: 'Haircut',
      description: 'Professional haircut service',
      duration: 30,
      price: 25.00,
      active: true,
    });
    console.log('✓ Service 1 created:', service1.toJSON());

    const service2 = await createService({
      name: 'Massage',
      description: '60-minute relaxing massage',
      duration: 60,
      price: 75.00,
      active: true,
    });
    console.log('✓ Service 2 created:', service2.toJSON());

    // Get all active services
    console.log('\n2. Getting all active services...');
    const activeServices = await getAllActiveServices();
    console.log('✓ Active services count:', activeServices.length);
    activeServices.forEach(s => console.log(`  - ${s.name} ($${s.price})`));

    // Get service by ID
    console.log('\n3. Getting service by ID...');
    const foundService = await getServiceById(service1.id);
    console.log('✓ Found service:', foundService.toJSON());

    // Update service
    console.log('\n4. Updating service...');
    const updatedService = await updateService(service1.id, {
      price: 30.00,
    });
    console.log('✓ Updated service price:', updatedService.toJSON());

    return { service1, service2 };
  } catch (error) {
    console.error('✗ Service model error:', error.message);
    throw error;
  }
}

/**
 * Test Availability Model
 */
async function testAvailabilityModel(service1, service2) {
  console.log('\n========== TESTING AVAILABILITY MODEL ==========');
  try {
    // Create availability slots
    console.log('\n1. Creating availability slots...');
    const availability1 = await createAvailability({
      serviceId: service1.id,
      date: '2026-04-05',
      startTime: '09:00:00',
      endTime: '09:30:00',
      slotsAvailable: 3,
    });
    console.log('✓ Availability 1 created:', availability1.toJSON());

    const availability2 = await createAvailability({
      serviceId: service1.id,
      date: '2026-04-06',
      startTime: '14:00:00',
      endTime: '14:30:00',
      slotsAvailable: 2,
    });
    console.log('✓ Availability 2 created:', availability2.toJSON());

    const availability3 = await createAvailability({
      serviceId: service2.id,
      date: '2026-04-05',
      startTime: '10:00:00',
      endTime: '11:00:00',
      slotsAvailable: 1,
    });
    console.log('✓ Availability 3 created:', availability3.toJSON());

    // Get availability by service ID
    console.log('\n2. Getting availability by service ID...');
    const serviceAvailability = await getAvailabilityByServiceId(service1.id);
    console.log(`✓ Found ${serviceAvailability.length} slots for service ${service1.id}`);
    serviceAvailability.forEach(a => {
      console.log(`  - ${a.date} ${a.startTime}-${a.endTime} (${a.slotsAvailable} slots)`);
    });

    // Get availability by date range
    console.log('\n3. Getting availability by date range...');
    const rangeAvailability = await getAvailabilityByDateRange(
      service1.id,
      '2026-04-01',
      '2026-04-10'
    );
    console.log(`✓ Found ${rangeAvailability.length} slots in date range`);

    // Get specific availability
    console.log('\n4. Getting specific availability...');
    const specificAvailability = await getAvailabilityById(availability1.id);
    console.log('✓ Found availability:', specificAvailability.toJSON());

    // Update slots
    console.log('\n5. Updating availability slots...');
    const updatedSlots = await updateSlots(availability1.id, -1);
    console.log(`✓ Updated slots: ${updatedSlots.slotsAvailable} available`);

    return { availability1, availability2, availability3 };
  } catch (error) {
    console.error('✗ Availability model error:', error.message);
    throw error;
  }
}

/**
 * Test Booking Model
 */
async function testBookingModel(availability1, availability2) {
  console.log('\n========== TESTING BOOKING MODEL ==========');
  try {
    // Create a test user for bookings
    console.log('\n0. Creating test user...');
    let testUser = await findUserByEmail('testbooker@example.com');
    if (!testUser) {
      testUser = await createUser({
        email: 'testbooker@example.com',
        password: 'TestBooking123',
      });
    }
    console.log('✓ Test user created/found with ID:', testUser.id);
    const userId = testUser.id;

    // Create bookings
    console.log('\n1. Creating bookings...');
    const booking1 = await createBooking({
      userId,
      availabilityId: availability1.id,
      status: 'pending',
      notes: 'First haircut appointment',
    });
    console.log('✓ Booking 1 created:', booking1.toJSON());

    const booking2 = await createBooking({
      userId,
      availabilityId: availability2.id,
      status: 'confirmed',
      notes: 'Follow-up haircut',
    });
    console.log('✓ Booking 2 created:', booking2.toJSON());

    // Get bookings by user ID
    console.log('\n2. Getting user bookings...');
    const userBookings = await getBookingsByUserId(userId);
    console.log(`✓ Found ${userBookings.length} bookings for user ${userId}`);
    userBookings.forEach((b, idx) => {
      console.log(`  Booking ${idx + 1}: Status=${b.status}, Date=${b.Availability?.date}`);
    });

    // Get specific booking
    console.log('\n3. Getting specific booking...');
    const specificBooking = await getBookingById(booking1.id);
    console.log('✓ Found booking:', {
      id: specificBooking.id,
      status: specificBooking.status,
      notes: specificBooking.notes,
    });

    // Update booking status
    console.log('\n4. Updating booking status...');
    const updatedBooking = await updateBookingStatus(booking1.id, 'confirmed');
    console.log('✓ Updated booking status to:', updatedBooking.status);

    // Cancel booking
    console.log('\n5. Cancelling booking...');
    const cancelledBooking = await cancelBooking(booking2.id);
    console.log('✓ Cancelled booking, new status:', cancelledBooking.status);

    return { booking1, booking2, testUser };
  } catch (error) {
    console.error('✗ Booking model error:', error.message);
    throw error;
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  try {
    console.log('\n🚀 Starting model tests...\n');

    // Sync database
    console.log('Syncing database...');
    await sequelize.sync();
    console.log('✓ Database synced\n');

    // Run tests
    const { service1, service2 } = await testServiceModel();
    const { availability1, availability2, availability3 } = await testAvailabilityModel(
      service1,
      service2
    );
    const { booking1, booking2, testUser } = await testBookingModel(availability1, availability2);

    console.log('\n========== TEST SUMMARY ==========');
    console.log('✓ All tests completed successfully!');
    console.log('\nCreated test data:');
    console.log(`  - 2 Services`);
    console.log(`  - 3 Availability slots`);
    console.log(`  - 2 Bookings`);

    console.log('\n📝 IDs for manual API testing:');
    console.log(`  - Test User ID: ${testUser.id} (email: ${testUser.email})`);
    console.log(`  - Service IDs: ${service1.id}, ${service2.id}`);
    console.log(`  - Availability IDs: ${availability1.id}, ${availability2.id}`);
    console.log(`  - Booking IDs: ${booking1.id}, ${booking2.id}`);

    console.log('\n✓ Test data is ready in the database for API testing\n');
  } catch (error) {
    console.error('\n✗ Tests failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().then(() => {
    process.exit(0);
  });
}

module.exports = {
  testServiceModel,
  testAvailabilityModel,
  testBookingModel,
};
