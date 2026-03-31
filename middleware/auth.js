// middleware/auth.js
// Verifies Firebase ID token from Authorization: Bearer <token> header
// Usage: router.get('/protected', verifyToken, handler)

const { auth } = require('../config/firebase');

// Full admin check — requires admin: true custom claim
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No authorization token provided' });
    }

    const idToken      = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(idToken);

    if (!decodedToken.admin) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions — admin access required' });
    }

    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification error:', error.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// Token verification only — does NOT require admin claim
const verifyTokenOnly = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No authorization token provided' });
    }
    const idToken = authHeader.split('Bearer ')[1];
    req.user = await auth.verifyIdToken(idToken);
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

module.exports = { verifyToken, verifyTokenOnly };
