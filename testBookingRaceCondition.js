const axios = require('axios');
const { createService } = require('./models/service');
const { createAvailability, getAvailabilityById } = require('./models/availability');
const { getBookingsByAvailabilityId } = require('./models/booking');
const { createUser } = require('./models/user');
const { generateAccessToken } = require('./utils/tokenUtils');

const BASE_URL = 'http://localhost:4000/api';
const CONCURRENT_USERS = 12;

function logHeader(title) {
  console.log(`\n${'='.repeat(72)}`);
  console.log(title);
  console.log('='.repeat(72));
}

async function registerUser(index) {
  const email = `race_user_${Date.now()}_${index}@example.com`;
  const password = 'Password123!';

  const user = await createUser({
    email,
    password,
  });

  if (!user || user.error) {
    throw new Error(`Failed to create race test user: ${user?.error || 'unknown error'}`);
  }

  return {
    email,
    token: generateAccessToken({ id: user.id, email: user.email }),
  };
}

async function main() {
  try {
    logHeader('RACE TEST SETUP');

    const service = await createService({
      name: `Race Test Service ${Date.now()}`,
      description: 'Service used for race condition testing',
      duration: 30,
      price: 49.99,
      active: true,
    });

    const availability = await createAvailability({
      serviceId: service.id,
      date: '2026-04-30',
      startTime: '10:00:00',
      endTime: '10:30:00',
      slotsAvailable: 1,
    });

    console.log(`Service ID: ${service.id}`);
    console.log(`Availability ID: ${availability.id}`);
    console.log('Initial slots: 1');

    logHeader(`CREATING ${CONCURRENT_USERS} USERS AND TOKENS`);
    const users = await Promise.all(
      Array.from({ length: CONCURRENT_USERS }, (_, idx) => registerUser(idx + 1))
    );
    console.log(`Created ${users.length} users`);

    logHeader('SENDING CONCURRENT BOOKING REQUESTS');
    const bookingRequests = users.map((user) =>
      axios.post(
        `${BASE_URL}/bookings`,
        {
          availabilityId: availability.id,
          notes: `Race test booking for ${user.email}`,
        },
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
          validateStatus: () => true,
        }
      )
    );

    const responses = await Promise.all(bookingRequests);

    const successful = responses.filter((res) => res.status === 201);
    const noSlots = responses.filter(
      (res) =>
        res.status === 400 &&
        res.data &&
        res.data.message === 'No slots available for this time slot'
    );
    const duplicates = responses.filter((res) => res.status === 409);

    logHeader('RESULTS');
    console.log(`Successful bookings: ${successful.length}`);
    console.log(`No-slot failures (400): ${noSlots.length}`);
    console.log(`Duplicate-booking failures (409): ${duplicates.length}`);
    console.log(`Other responses: ${responses.length - successful.length - noSlots.length - duplicates.length}`);

    const finalAvailability = await getAvailabilityById(availability.id);
    const activeBookings = await getBookingsByAvailabilityId(availability.id);

    console.log(`Final slotsAvailable: ${finalAvailability ? finalAvailability.slotsAvailable : 'N/A'}`);
    console.log(`Active bookings for slot: ${activeBookings.length}`);

    const passed =
      successful.length === 1 &&
      finalAvailability &&
      finalAvailability.slotsAvailable === 0 &&
      activeBookings.length === 1;

    if (!passed) {
      logHeader('TEST FAILED');
      console.log('Expected exactly one successful booking and zero remaining slots.');
      process.exit(1);
    }

    logHeader('TEST PASSED');
    console.log('Race condition fix is working: only one request claimed the last slot.');
    process.exit(0);
  } catch (error) {
    logHeader('TEST ERROR');
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(JSON.stringify(error.response.data, null, 2));
    } else {
      console.log(error.message);
    }
    process.exit(1);
  }
}

main();
