const axios = require('axios');
const { createUser } = require('./models/user');

const BASE_URL = 'http://localhost:4000/api';

function section(title) {
  console.log(`\n${'='.repeat(72)}`);
  console.log(title);
  console.log('='.repeat(72));
}

async function run() {
  const email = `refresh_test_${Date.now()}@example.com`;
  const password = 'Password123!';

  try {
    section('STEP 1: CREATE USER IN DB AND LOGIN FOR INITIAL TOKENS');
    const user = await createUser({
      email,
      password,
    });

    if (!user || user.error) {
      throw new Error(`Failed to create refresh test user: ${user?.error || 'unknown error'}`);
    }

    const initialLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email,
      password,
    });

    const refreshToken1 = initialLoginRes.data.refreshToken;
    console.log('Initial refresh token acquired.');

    section('STEP 2: REFRESH USING TOKEN #1 (ROTATION EXPECTED)');
    const refreshRes1 = await axios.post(`${BASE_URL}/auth/refresh`, {
      refreshToken: refreshToken1,
    });

    const refreshToken2 = refreshRes1.data.refreshToken;
    console.log('Token rotated successfully. New refresh token acquired.');

    section('STEP 3: REUSE OLD TOKEN #1 (MUST FAIL)');
    let reuseFailed = false;
    try {
      await axios.post(`${BASE_URL}/auth/refresh`, {
        refreshToken: refreshToken1,
      });
    } catch (error) {
      if (error.response && error.response.status === 401) {
        reuseFailed = true;
        console.log('Old refresh token correctly rejected.');
        console.log('Response message:', error.response.data.message);
      } else {
        throw error;
      }
    }

    if (!reuseFailed) {
      throw new Error('Expected old refresh token reuse to fail with 401.');
    }

    section('STEP 4: TRY TOKEN #2 AFTER REUSE DETECTION (MUST FAIL)');
    let chainRevoked = false;
    try {
      await axios.post(`${BASE_URL}/auth/refresh`, {
        refreshToken: refreshToken2,
      });
    } catch (error) {
      if (error.response && error.response.status === 401) {
        chainRevoked = true;
        console.log('Token chain correctly revoked after reuse detection.');
        console.log('Response message:', error.response.data.message);
      } else {
        throw error;
      }
    }

    if (!chainRevoked) {
      throw new Error('Expected rotated token to fail after reuse detection.');
    }

    section('STEP 5: LOGIN AGAIN AND LOGOUT REVOCATION TEST');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email,
      password,
    });

    const refreshToken3 = loginRes.data.refreshToken;
    console.log('Fresh login refresh token acquired.');

    const logoutRes = await axios.post(`${BASE_URL}/auth/logout`, {
      refreshToken: refreshToken3,
    });
    console.log('Logout response:', logoutRes.data.message);

    section('STEP 6: REFRESH AFTER LOGOUT (MUST FAIL)');
    let logoutRevocationWorks = false;
    try {
      await axios.post(`${BASE_URL}/auth/refresh`, {
        refreshToken: refreshToken3,
      });
    } catch (error) {
      if (error.response && error.response.status === 401) {
        logoutRevocationWorks = true;
        console.log('Logged-out refresh token correctly rejected.');
        console.log('Response message:', error.response.data.message);
      } else {
        throw error;
      }
    }

    if (!logoutRevocationWorks) {
      throw new Error('Expected refresh token to fail after logout revocation.');
    }

    section('TEST PASSED');
    console.log('Refresh token rotation and revocation are working correctly.');
    process.exit(0);
  } catch (error) {
    section('TEST FAILED');
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
