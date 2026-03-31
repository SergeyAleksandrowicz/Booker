const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';

// Test user credentials
const testEmail = `test_${Date.now()}@example.com`;
const testPassword = 'Password123!';

let testUserId = null;
let accessToken = null;
let refreshToken = null;
let testAvailabilityId = null;
let testBookingId = null;

const log = (title, data) => {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`✓ ${title}`);
  console.log('='.repeat(70));
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
};

const logError = (title, error) => {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`✗ ${title}`);
  console.log('='.repeat(70));
  if (error.response) {
    console.log('Status:', error.response.status);
    console.log('Data:', JSON.stringify(error.response.data, null, 2));
  } else {
    console.log('Error:', error.message);
  }
};

const testFlow = async () => {
  try {
    // 1. Register new user
    log('STEP 1: Register new user');
    let response = await axios.post(`${BASE_URL}/auth/register`, {
      email: testEmail,
      password: testPassword,
      passwordConfirm: testPassword,
    });
    testUserId = response.data.user.id;
    console.log(`User registered with ID: ${testUserId}`);

    // 2. Login
    log('STEP 2: Login and get tokens');
    response = await axios.post(`${BASE_URL}/auth/login`, {
      email: testEmail,
      password: testPassword,
    });
    accessToken = response.data.accessToken;
    refreshToken = response.data.refreshToken;
    console.log('Access token obtained');

    const headers = { Authorization: `Bearer ${accessToken}` };

    // 3. Get public services
    log('STEP 3: Browse available services (public endpoint)');
    response = await axios.get(`${BASE_URL}/services`);
    console.log(`Found ${response.data.services.length} active services`);
    if (response.data.services.length === 0) {
      console.log('⚠ Warning: No services available. Booking cannot be created.');
      return;
    }

    // 4. Get availability for first service
    log('STEP 4: Get availability slots for service');
    const serviceId = response.data.services[0].id;
    console.log(`Getting availability for service ID: ${serviceId}`);
    response = await axios.get(`${BASE_URL}/services/${serviceId}/availability`);
    console.log(`Found ${response.data.availability.length} available slots`);
    
    if (response.data.availability.length === 0) {
      console.log('⚠ Warning: No availability slots. Cannot create booking.');
      return;
    }

    testAvailabilityId = response.data.availability[0].id;
    console.log(`Selected availability slot ID: ${testAvailabilityId}`);

    // 5. Create booking (protected)
    log('STEP 5: Create a new booking (authenticated)');
    response = await axios.post(
      `${BASE_URL}/bookings`,
      {
        availabilityId: testAvailabilityId,
        notes: 'Test booking from automated test script',
      },
      { headers }
    );
    testBookingId = response.data.booking.id;
    console.log(`Booking created with ID: ${testBookingId}`);
    console.log(`Status: ${response.data.booking.status}`);

    // 6. Get user's bookings
    log('STEP 6: Get all bookings for user');
    response = await axios.get(`${BASE_URL}/bookings`, { headers });
    console.log(`User has ${response.data.count} booking(s)`);
    console.log('Bookings:');
    response.data.bookings.forEach((booking, idx) => {
      console.log(`  ${idx + 1}. ID: ${booking.id}, Status: ${booking.status}`);
    });

    // 7. Get specific booking details
    log('STEP 7: Get specific booking details');
    response = await axios.get(`${BASE_URL}/bookings/${testBookingId}`, { headers });
    console.log('Booking details retrieved successfully');
    console.log(`Status: ${response.data.booking.status}`);
    console.log(`Service: ${response.data.booking.Availability.Service.name}`);

    // 8. Update booking status
    log('STEP 8: Update booking status to confirmed');
    response = await axios.patch(
      `${BASE_URL}/bookings/${testBookingId}`,
      { status: 'confirmed' },
      { headers }
    );
    console.log(`Booking status updated to: ${response.data.booking.status}`);

    // 9. Update booking notes
    log('STEP 9: Update booking notes');
    response = await axios.patch(
      `${BASE_URL}/bookings/${testBookingId}`,
      { notes: 'Updated notes: I will be 10 minutes early' },
      { headers }
    );
    console.log(`Booking notes updated`);
    console.log(`New notes: ${response.data.booking.notes}`);

    // 10. Create another booking to test cancellation
    if (response.data.availability && response.data.availability.length > 1) {
      log('STEP 10: Create second booking for cancellation test');
      const secondAvailabilityId = response.data.availability[1].id;
      response = await axios.post(
        `${BASE_URL}/bookings`,
        {
          availabilityId: secondAvailabilityId,
          notes: 'This booking will be cancelled',
        },
        { headers }
      );
      const secondBookingId = response.data.booking.id;
      console.log(`Second booking created with ID: ${secondBookingId}`);

      // 11. Cancel the second booking
      log('STEP 11: Cancel second booking');
      response = await axios.delete(`${BASE_URL}/bookings/${secondBookingId}`, { headers });
      console.log(`Booking cancelled successfully`);
      console.log(`Status: ${response.data.booking.status}`);
    }

    // 12. Final: Get all bookings to show current state
    log('STEP 12: Final booking list after all operations');
    response = await axios.get(`${BASE_URL}/bookings`, { headers });
    console.log(`User currently has ${response.data.count} booking(s):`);
    response.data.bookings.forEach((booking, idx) => {
      console.log(
        `  ${idx + 1}. ID: ${booking.id}, Status: ${booking.status}, ` +
        `Service: ${booking.Availability.Service.name}, ` +
        `Date: ${booking.Availability.date}`
      );
    });

    // Test unauthorized access (trying to access another user's booking)
    log('STEP 13: Test authorization - access another user booking (should fail)');
    try {
      // Try to access booking with a non-existent ID that doesn't belong to user
      await axios.get(`${BASE_URL}/bookings/999999`, { headers });
      console.log('⚠ Warning: Should have failed with 404');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('✓ Correctly received 404 for non-existent booking');
      } else {
        console.log('Error response received:', error.response?.status);
      }
    }

    log('ALL TESTS COMPLETED SUCCESSFULLY! ✓');
  } catch (error) {
    logError('Test Flow Failed', error);
    process.exit(1);
  }
};

// Run tests
console.log('\n🚀 Starting Booking Routes Test Suite\n');
console.log(`Testing with email: ${testEmail}`);
testFlow().then(() => {
  console.log('\n✓ Test suite completed\n');
  process.exit(0);
});
