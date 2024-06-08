const jwt = require('jsonwebtoken');
const JWT_SECRET = "grit_secret_key";

module.exports = {
  sign: (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
  },
  verify: (token) => {
    try {
      const decode = jwt.verify(token, JWT_SECRET);
      return {
        result: true,
        payload: decode,
      }
    } catch (e) {
      return {
        result: false,
        payload: null,
      };
    }
  }
};