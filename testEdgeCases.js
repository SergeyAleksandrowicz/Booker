const axios = require('axios');
const { createUser } = require('./models/user');
const { createService } = require('./models/service');
const { createAvailability } = require('./models/availability');
const { generateAccessToken } = require('./utils/tokenUtils');

const BASE_URL = 'http://localhost:4000/api';

let passed = 0;
let failed = 0;

function title(text) {
  console.log(`\n${'='.repeat(78)}`);
  console.log(text);
  console.log('='.repeat(78));
}

function pass(name, details = '') {
  passed += 1;
  console.log(`PASS: ${name}${details ? ` -> ${details}` : ''}`);
}

function fail(name, details = '') {
  failed += 1;
  console.log(`FAIL: ${name}${details ? ` -> ${details}` : ''}`);
}

async function runCase(name, requestFn, expectedStatuses, validator) {
  try {
    const response = await requestFn();

    if (!expectedStatuses.includes(response.status)) {
      fail(
        name,
        `expected ${expectedStatuses.join(' or ')}, got ${response.status} ${JSON.stringify(response.data)}`
      );
      return null;
    }

    if (validator && !validator(response)) {
      fail(name, `status matched (${response.status}) but response validation failed`);
      return null;
    }

    pass(name, `status ${response.status}`);
    return response;
  } catch (error) {
    const status = error.response ? error.response.status : 'NO_RESPONSE';
    const data = error.response ? JSON.stringify(error.response.data) : error.message;
    fail(name, `unexpected error ${status} ${data}`);
    return null;
  }
}

async function main() {
  title('EDGE CASE TEST SUITE');

  const emailA = `edge_user_a_${Date.now()}@example.com`;
  const emailB = `edge_user_b_${Date.now()}@example.com`;
  const password = 'Password123!';

  try {
    const [userA, userB] = await Promise.all([
      createUser({ email: emailA, password }),
      createUser({ email: emailB, password }),
    ]);

    if (!userA || userA.error) {
      throw new Error(`Failed to create user A: ${userA?.error || 'unknown error'}`);
    }

    if (!userB || userB.error) {
      throw new Error(`Failed to create user B: ${userB?.error || 'unknown error'}`);
    }

    const tokenA = generateAccessToken({ id: userA.id, email: userA.email });
    const tokenB = generateAccessToken({ id: userB.id, email: userB.email });

    const service = await createService({
      name: `Edge Case Service ${Date.now()}`,
      description: 'Service for edge-case testing',
      duration: 30,
      price: 55.0,
      active: true,
    });

    const availability = await createAvailability({
      serviceId: service.id,
      date: '2026-07-01',
      startTime: '13:00:00',
      endTime: '13:30:00',
      slotsAvailable: 1,
    });

    const authA = { Authorization: `Bearer ${tokenA}` };
    const authB = { Authorization: `Bearer ${tokenB}` };

    await runCase(
      'Health endpoint responds',
      () => axios.get('http://localhost:4000/', { validateStatus: () => true }),
      [200],
      (res) => res.data && res.data.message === 'API is online'
    );

    await runCase(
      'Protected bookings requires auth header',
      () => axios.get(`${BASE_URL}/bookings`, { validateStatus: () => true }),
      [401]
    );

    await runCase(
      'Malformed auth header is rejected',
      () =>
        axios.get(`${BASE_URL}/bookings`, {
          headers: { Authorization: `bearer ${tokenA}` },
          validateStatus: () => true,
        }),
      [401]
    );

    await runCase(
      'Services date-range rejects invalid format',
      () =>
        axios.get(`${BASE_URL}/services/${service.id}/availability/dates/2026-99-99/2026-07-10`, {
          validateStatus: () => true,
        }),
      [400]
    );

    await runCase(
      'Services date-range rejects start date after end date',
      () =>
        axios.get(`${BASE_URL}/services/${service.id}/availability/dates/2026-08-10/2026-08-01`, {
          validateStatus: () => true,
        }),
      [400]
    );

    await runCase(
      'Booking create rejects invalid availabilityId type',
      () =>
        axios.post(
          `${BASE_URL}/bookings`,
          { availabilityId: 'abc', notes: 'invalid id test' },
          { headers: authA, validateStatus: () => true }
        ),
      [400]
    );

    await runCase(
      'Booking create rejects non-existent availabilityId',
      () =>
        axios.post(
          `${BASE_URL}/bookings`,
          { availabilityId: 999999999, notes: 'not found test' },
          { headers: authA, validateStatus: () => true }
        ),
      [404]
    );

    await runCase(
      'Booking create rejects notes > 500 chars',
      () =>
        axios.post(
          `${BASE_URL}/bookings`,
          { availabilityId: availability.id, notes: 'x'.repeat(501) },
          { headers: authA, validateStatus: () => true }
        ),
      [400]
    );

    const createBookingRes = await runCase(
      'Booking create succeeds with valid payload',
      () =>
        axios.post(
          `${BASE_URL}/bookings`,
          { availabilityId: availability.id, notes: 'edge-case baseline booking' },
          { headers: authA, validateStatus: () => true }
        ),
      [201],
      (res) => res.data && res.data.booking && res.data.booking.id
    );

    const bookingId = createBookingRes?.data?.booking?.id;

    await runCase(
      'Duplicate active booking for same user/slot is rejected',
      () =>
        axios.post(
          `${BASE_URL}/bookings`,
          { availabilityId: availability.id, notes: 'duplicate booking' },
          { headers: authA, validateStatus: () => true }
        ),
      [400, 409]
    );

    if (bookingId) {
      await runCase(
        'Unauthorized user cannot access another user booking',
        () => axios.get(`${BASE_URL}/bookings/${bookingId}`, { headers: authB, validateStatus: () => true }),
        [403]
      );

      await runCase(
        'PATCH cannot set cancelled status directly',
        () =>
          axios.patch(
            `${BASE_URL}/bookings/${bookingId}`,
            { status: 'cancelled' },
            { headers: authA, validateStatus: () => true }
          ),
        [400]
      );

      await runCase(
        'DELETE cancels booking successfully',
        () => axios.delete(`${BASE_URL}/bookings/${bookingId}`, { headers: authA, validateStatus: () => true }),
        [200]
      );

      await runCase(
        'DELETE on already-cancelled booking is rejected',
        () => axios.delete(`${BASE_URL}/bookings/${bookingId}`, { headers: authA, validateStatus: () => true }),
        [400]
      );
    }

    const hugePayload = 'x'.repeat(1_100_000);
    await runCase(
      'Payload above 1mb is rejected with 413',
      () =>
        axios.post(
          `${BASE_URL}/bookings`,
          { availabilityId: availability.id, notes: hugePayload },
          { headers: authA, validateStatus: () => true }
        ),
      [413]
    );

    title('EDGE CASE SUMMARY');
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);

    if (failed > 0) {
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    title('EDGE CASE SUITE ERROR');
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
