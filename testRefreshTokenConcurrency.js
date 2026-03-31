const axios = require('axios');
const { createUser } = require('./models/user');

const BASE_URL = 'http://localhost:4000/api';

function printHeader(title) {
  console.log(`\n${'='.repeat(72)}`);
  console.log(title);
  console.log('='.repeat(72));
}

async function run() {
  const email = `refresh_concurrency_${Date.now()}@example.com`;
  const password = 'Password123!';

  try {
    printHeader('STEP 1: CREATE USER IN DB AND LOGIN FOR INITIAL REFRESH TOKEN');
    const user = await createUser({
      email,
      password,
    });

    if (!user || user.error) {
      throw new Error(`Failed to create refresh concurrency user: ${user?.error || 'unknown error'}`);
    }

    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email,
      password,
    });

    const refreshToken = loginRes.data.refreshToken;
    console.log('Initial refresh token acquired.');

    printHeader('STEP 2: SEND TWO CONCURRENT REFRESH REQUESTS WITH SAME TOKEN');
    const requests = [1, 2].map(() =>
      axios.post(
        `${BASE_URL}/auth/refresh`,
        { refreshToken },
        { validateStatus: () => true }
      )
    );

    const [r1, r2] = await Promise.all(requests);
    console.log('Response #1 status:', r1.status);
    console.log('Response #2 status:', r2.status);

    const statuses = [r1.status, r2.status];
    const successCount = statuses.filter((s) => s === 200).length;
    const unauthorizedCount = statuses.filter((s) => s === 401).length;

    console.log('Success count:', successCount);
    console.log('Unauthorized count:', unauthorizedCount);

    if (successCount !== 1 || unauthorizedCount !== 1) {
      throw new Error('Expected exactly one success and one unauthorized response.');
    }

    printHeader('TEST PASSED');
    console.log('Concurrent refresh race is handled: only one refresh succeeded.');
    process.exit(0);
  } catch (error) {
    printHeader('TEST FAILED');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log(error.message);
    }
    process.exit(1);
  }
}

run();
