const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  try {
    let token = null;

    // 1. Get token from header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    // 2. No token
    if (!token) {
      return res.status(401).json({
        message: 'Not authorized. No token provided.',
      });
    }

    // 3. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Attach user to request (safe structure)
    req.user = {
      id: decoded.id,
    };

    // 5. Debug (can remove later)
    console.log('Auth User:', req.user);

    next();
  } catch (error) {
    console.error('Auth Error:', error.message);

    return res.status(401).json({
      message: 'Not authorized. Invalid token.',
    });
  }
};

module.exports = { protect };