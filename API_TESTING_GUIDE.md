# Booker Backend - API Testing Guide

This guide shows how to test the authentication and protected routes endpoints.

## Prerequisites

- Server running: `npm start` (runs on `http://localhost:4000`)
- Postman, Insomnia, cURL, or any HTTP client

## Endpoints

### 1. **Register** - Create a New User
**Endpoint:** `POST /api/auth/register`  
**Body:**
```json
{
  "email": "testuser@example.com",
  "password": "SecurePass123",
  "passwordConfirm": "SecurePass123"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "testuser@example.com"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Cases:**
- Invalid email format (400)
- Password too short (400)
- Passwords don't match (400)
- Email already registered (409)

---

### 2. **Login** - Authenticate Existing User
**Endpoint:** `POST /api/auth/login`  
**Body:**
```json
{
  "email": "testuser@example.com",
  "password": "SecurePass123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 1,
    "email": "testuser@example.com"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Cases:**
- Invalid email/password (401)
- User not found (401)
- Missing fields (400)

---

### 3. **Refresh Token** - Get New Access Token
**Endpoint:** `POST /api/auth/refresh`  
**Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Cases:**
- Refresh token expired (401)
- Invalid refresh token (401)
- Missing refreshToken in body (400)

---

### 4. **Get Profile** - Access Protected Route
**Endpoint:** `GET /api/protected/profile`  
**Headers:**
```
Authorization: Bearer <accessToken>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "user": {
    "id": 1,
    "email": "testuser@example.com"
  }
}
```

**Error Cases:**
- Missing Authorization header (401)
- Invalid token (401)
- Token expired (401) → Use refresh endpoint to get new access token
- Malformed header (401)

---

## Testing with cURL

### Register
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123",
    "passwordConfirm": "Password123"
  }'
```

### Login
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123"
  }'
```

### Refresh Token (replace `YOUR_REFRESH_TOKEN`)
```bash
curl -X POST http://localhost:4000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

### Access Protected Route (replace `YOUR_ACCESS_TOKEN`)
```bash
curl -X GET http://localhost:4000/api/protected/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Testing with Postman

1. Create a new Postman Collection: "Booker Backend Auth"
2. Add these 4 requests:

### Register Request
- **Method:** POST
- **URL:** `{{base_url}}/api/auth/register`
- **Headers:** Content-Type: application/json
- **Body (raw JSON):**
  ```json
  {
    "email": "postman@test.com",
    "password": "TestPass123",
    "passwordConfirm": "TestPass123"
  }
  ```
- **Tests tab:** (auto-extract tokens)
  ```javascript
  if (pm.response.code === 201) {
    pm.environment.set("accessToken", pm.response.json().accessToken);
    pm.environment.set("refreshToken", pm.response.json().refreshToken);
  }
  ```

### Login Request
- **Method:** POST
- **URL:** `{{base_url}}/api/auth/login`
- **Headers:** Content-Type: application/json
- **Body:**
  ```json
  {
    "email": "postman@test.com",
    "password": "TestPass123"
  }
  ```
- **Tests tab:** (auto-extract tokens)
  ```javascript
  if (pm.response.code === 200) {
    pm.environment.set("accessToken", pm.response.json().accessToken);
    pm.environment.set("refreshToken", pm.response.json().refreshToken);
  }
  ```

### Refresh Token Request
- **Method:** POST
- **URL:** `{{base_url}}/api/auth/refresh`
- **Headers:** Content-Type: application/json
- **Body:**
  ```json
  {
    "refreshToken": "{{refreshToken}}"
  }
  ```
- **Tests tab:**
  ```javascript
  if (pm.response.code === 200) {
    pm.environment.set("accessToken", pm.response.json().accessToken);
    pm.environment.set("refreshToken", pm.response.json().refreshToken);
  }
  ```

### Get Profile Request
- **Method:** GET
- **URL:** `{{base_url}}/api/protected/profile`
- **Headers:**
  ```
  Authorization: Bearer {{accessToken}}
  ```

**Postman Collection Variables:**
```json
{
  "base_url": "http://localhost:4000",
  "accessToken": "",
  "refreshToken": ""
}
```

---

## Complete Test Flow

1. **Register a new user** → Get `accessToken` and `refreshToken`
2. **Login with same credentials** → Confirm tokens work
3. **Access protected profile** → Use `accessToken` in Authorization header
4. **Refresh token after expiry** → Get new `accessToken` with `refreshToken`
5. **Try with invalid token** → Confirm 401 error response

---

## Token Information

- **Access Token Expiry:** 15 minutes (configurable in `.env` as `JWT_ACCESS_EXPIRE`)
- **Refresh Token Expiry:** 7 days (configurable in `.env` as `JWT_REFRESH_EXPIRE`)

### JWT Payload Structure
Both tokens contain:
```json
{
  "id": 1,
  "email": "user@example.com",
  "iat": 1234567890,
  "exp": 1234567890
}
```

---

## Environment Variables (.env)

```
PORT=4000
PGUSER=sergey
PGPASSWORD=12345678
PGDATABASE=booker
PGPORT=5432

# JWT Configuration
JWT_ACCESS_SECRET=your_access_secret_key_change_in_production
JWT_REFRESH_SECRET=your_refresh_secret_key_change_in_production
JWT_ACCESS_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

**Note:** For production, use strong random strings for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.

---

## Common Issues & Solutions

### Issue: "No token provided" when accessing protected route
**Solution:** Ensure `Authorization: Bearer <token>` header is included in request

### Issue: "Token expired"
**Solution:** Use refresh endpoint with `refreshToken` to get new `accessToken`

### Issue: "Invalid email or password" on login
**Solution:** Verify email and password are correct. Ensure user was registered first.

### Issue: CORS error when calling from frontend
**Solution:** Update `CORS_ORIGIN` in `.env` to match your frontend URL (e.g., `http://localhost:3000`)

### Issue: "Email is already registered"
**Solution:** Try logging in instead, or use a different email to register

---

## Troubleshooting

### To reset the database (delete all users)
```bash
# This requires direct database access:
psql -U sergey -d booker -c "TRUNCATE users RESTART IDENTITY;"
```

### To view database users
```bash
psql -U sergey -d booker -c "SELECT id, email FROM users;"
```

### To check server logs
Watch terminal where `npm start` is running for real-time logs.

---

## Frontend Integration Example (React)

```javascript
// Register
const register = async (email, password) => {
  const res = await fetch('http://localhost:4000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, passwordConfirm: password })
  });
  const data = await res.json();
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
};

// Access Protected Route
const getProfile = async () => {
  const token = localStorage.getItem('accessToken');
  const res = await fetch('http://localhost:4000/api/protected/profile', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return await res.json();
};

// Refresh Token
const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  const res = await fetch('http://localhost:4000/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  const data = await res.json();
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
};
```
