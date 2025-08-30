// generate-jwt.js
// Node.js script to generate a JWT token for testing purposes

const jwt = require('jsonwebtoken');

// Ensure jsonwebtoken is installed: npm install jsonwebtoken

// This secret must match the JWT_SECRET configured in your application's .env file.
// From your .env.example, it's 'your_jwt_secret_key'.
const secret = 'your_jwt_secret_key';

// This payload should contain the userId of an existing user in your database.
// For demonstration, we'll use userId: 1.
const payload = {
  userId: 1, // Replace with an actual user ID from your database
  // Assuming 'admin' or 'editor' role is required for POST /api/tags
};

// Generate the token. It will expire in 1 hour.
const token = jwt.sign(payload, secret, { expiresIn: '1h' });

console.log(token);