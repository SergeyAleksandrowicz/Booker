# Booker Backend - Protected Routes Implementation Guide

This guide shows how to build upon the authentication system to create various types of protected routes.

## Quick Start: Creating a Protected Route

Any route that requires authentication should use the `authMiddleware`:

```javascript
const express = require('express');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Protected route - only authenticated users can access
router.get('/my-data', authMiddleware, async (req, res) => {
  // req.user contains: { id, email }
  const userId = req.user.id;
  
  res.json({ message: `Data for user ${userId}` });
});

module.exports = router;
```

---

## Pattern 1: Simple Protected Routes

**File:** `routes/user.js`

```javascript
const express = require('express');
const authMiddleware = require('../middleware/auth');
const { User } = require('../models/user');

const router = express.Router();

/**
 * GET /api/user/me
 * Get current authenticated user info
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({
      where: { id: req.user.id },
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/user/update-email
 * Update user email
 */
router.put('/update-email', authMiddleware, async (req, res) => {
  try {
    const { newEmail } = req.body;

    if (!newEmail) {
      return res.status(400).json({ success: false, message: 'New email is required' });
    }

    const updated = await User.update(
      { email: newEmail },
      { where: { id: req.user.id } }
    );

    res.json({ success: true, message: 'Email updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
```

**Add to app.js:**
```javascript
const userRoutes = require('./routes/user');
app.use('/api/user', userRoutes);
```

---

## Pattern 2: Authorization Middleware (Role-Based Access Control)

If you need to restrict routes by user role:

**File:** `middleware/authorize.js`

```javascript
/**
 * Middleware to check if user has required role
 * Usage: router.get('/admin', authenticateToken, authorize('admin'), handlerFunction)
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

module.exports = authorize;
```

**Usage:**
```javascript
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// Only admins can access this
router.delete('/users/:id', authMiddleware, authorize('admin'), async (req, res) => {
  // Delete user logic
});
```

---

## Pattern 3: Ownership-Based Access Control

Ensure users can only access/modify their own data:

```javascript
/**
 * GET /api/bookings/:bookingId
 * Get booking only if user owns it
 */
router.get('/bookings/:bookingId', authMiddleware, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;

    const booking = await Booking.findOne({
      where: { id: bookingId, userId } // userId check ensures ownership
    });

    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: 'Booking not found or access denied' 
      });
    }

    res.json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
```

---

## Pattern 4: Request Validation Before Protected Route

Combine validation with authentication:

```javascript
const { body, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');

/**
 * POST /api/bookings
 * Create a new booking (authenticated + validated)
 */
router.post(
  '/bookings',
  authMiddleware, // Check authentication first
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('date').isISO8601().withMessage('Valid date is required'),
    body('description').optional().isLength({ max: 500 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const booking = await Booking.create({
        userId: req.user.id,
        title: req.body.title,
        date: req.body.date,
        description: req.body.description
      });

      res.status(201).json({ success: true, booking });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);
```

---

## Pattern 5: Error Handling in Protected Routes

Centralized error handling pattern:

```javascript
const handleAsyncError = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

router.get('/data', authMiddleware, handleAsyncError(async (req, res) => {
  const data = await SomeModel.findByPk(req.user.id);
  if (!data) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }
  res.json({ success: true, data });
}));
```

---

## Pattern 6: Multiple Middleware Chains

Apply multiple middleware to protect different levels:

```javascript
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { validateInput } = require('../middleware/validate');

/**
 * Admin dashboard - requires auth + admin role + validation
 */
router.post(
  '/admin/settings',
  authMiddleware,       // Step 1: Check authentication
  authorize('admin'),   // Step 2: Check authorization
  validateInput,        // Step 3: Validate request
  async (req, res) => {
    // All middleware passed, execute handler
  }
);
```

---

## Complete Example: Bookings Routes

**File:** `routes/bookings.js`

```javascript
const express = require('express');
const { body, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Assume Booking model exists
const { Booking } = require('../models/booking');

/**
 * GET /api/bookings
 * Get all bookings for authenticated user
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/bookings
 * Create new booking
 */
router.post(
  '/',
  authMiddleware,
  [
    body('title').trim().notEmpty().withMessage('Title required'),
    body('date').isISO8601().withMessage('Valid date required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const booking = await Booking.create({
        userId: req.user.id,
        title: req.body.title,
        date: req.body.date,
      });
      res.status(201).json({ success: true, booking });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * PUT /api/bookings/:id
 * Update booking (only owner can update)
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (req.body.title) booking.title = req.body.title;
    if (req.body.date) booking.date = req.body.date;
    
    await booking.save();
    res.json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/bookings/:id
 * Delete booking (only owner can delete)
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const deleted = await Booking.destroy({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.json({ success: true, message: 'Booking deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
```

**Add to app.js:**
```javascript
const bookingRoutes = require('./routes/bookings');
app.use('/api/bookings', bookingRoutes);
```

---

## Frontend Integration: Handling Token Expiry

**React Hook Example:**

```javascript
import { useEffect, useState } from 'react';

const useAuth = () => {
  const [token, setToken] = useState(localStorage.getItem('accessToken'));

  const refreshToken = async () => {
    try {
      const refresh = localStorage.getItem('refreshToken');
      const res = await fetch('http://localhost:4000/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh })
      });
      
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('accessToken', data.accessToken);
        setToken(data.accessToken);
        return data.accessToken;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
    }
  };

  const makeAuthRequest = async (url, options = {}) => {
    let response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.status === 401) {
      const newToken = await refreshToken();
      if (newToken) {
        response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${newToken}`
          }
        });
      }
    }

    return response;
  };

  return { token, makeAuthRequest, refreshToken };
};

export default useAuth;
```

---

## Security Best Practices

1. **Never expose refresh tokens in frontend code** - Store in httpOnly cookies (server-set) or secure storage
2. **Always verify ownership** - Users should only access their own data
3. **Implement rate limiting** on auth endpoints to prevent brute force attacks
4. **Log auth events** - Track login/logout/failed attempts
5. **Use HTTPS in production** - Never send tokens over HTTP
6. **Implement token blacklist** - For logout functionality
7. **Set short expiry times** for access tokens (15m-1h)
8. **Set longer expiry times** for refresh tokens (7d-30d)

---

## Next Steps

1. Create `models/booking.js` (or other domain models)
2. Create `routes/bookings.js` using patterns above
3. Test with Postman/cURL
4. Integrate with your React/Vue/Angular frontend
5. Add more complex authorization rules as needed
6. Implement rate limiting and logging middleware
7. Deploy to production with proper environment variables
