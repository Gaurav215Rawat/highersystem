const express = require('express');
const bodyParser = require('body-parser');
const { Client } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const moment = require('moment');
const { body, validationResult } = require('express-validator');
const jwt = require("jsonwebtoken");
const config = require('./config');
const app = express();
const port = 3001;

// Enable CORS for all routes
app.use(cors({ origin: 'http://localhost:3001' }));

// PostgreSQL database connection configuration
const client = new Client(config.database);

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Function to create tables if they don't exist
const createTables = () => {
  const createTablesQuery = `
    DROP TABLE IF EXISTS contacts CASCADE;
    DROP TABLE IF EXISTS customers CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    DROP TABLE IF EXISTS api_access CASCADE;
    DROP TABLE IF EXISTS departments CASCADE;


     CREATE TABLE IF NOT EXISTS departments (
      dept_id SERIAL PRIMARY KEY,
      dept_name VARCHAR(20) UNIQUE NOT NULL,
      dept_data Text,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      user_id SERIAL PRIMARY KEY,
      first_name VARCHAR(20) NOT NULL,
      last_name VARCHAR(20) NOT NULL,
      email VARCHAR(30) UNIQUE NOT NULL,
      phone_no VARCHAR(15) UNIQUE NOT NULL,
      password TEXT NOT NULL,
      dept_name VARCHAR(20) REFERENCES departments(dept_name)  ON DELETE CASCADE,
      location VARCHAR(20) NOT NULL,
      emp_id VARCHAR(20) NOT NULL,
      role VARCHAR(20) NOT NULL,
      user_status VARCHAR(10) CHECK (user_status IN ('active', 'inactive')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customers (
      customer_id SERIAL PRIMARY KEY,
      customer_name VARCHAR(100) NOT NULL,
      gst_number VARCHAR(15),
      landline_num VARCHAR(15) UNIQUE NOT NULL,
      email_id VARCHAR(100) UNIQUE NOT NULL,
      pan_no VARCHAR(10) UNIQUE,
      tan_number VARCHAR(15) UNIQUE,
      address TEXT,
      city VARCHAR(50) NOT NULL,
      state VARCHAR(50) NOT NULL,
      country VARCHAR(50) NOT NULL,
      pincode VARCHAR(10) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS contacts (
      contact_id SERIAL PRIMARY KEY,
      customer_id INTEGER REFERENCES customers(customer_id) ON DELETE CASCADE,
      contact_person VARCHAR(100) NOT NULL,
      phone_num VARCHAR(15) UNIQUE,
      email_id VARCHAR(100) UNIQUE,
      address TEXT,
      city VARCHAR(50) NOT NULL,
      state VARCHAR(50) NOT NULL,
      country VARCHAR(50) NOT NULL,
      pincode VARCHAR(10) NOT NULL,
      department VARCHAR(100) NOT NULL,
      designation VARCHAR(100),
      date_of_start TEXT,
      date_of_end TEXT,
      status VARCHAR(10) CHECK (status IN ('active', 'inactive')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS api_access (
      access_id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
      api_name VARCHAR(100)
    );
  `;

  return client.query(createTablesQuery);
};

// Connect to PostgreSQL database and create tables
client.connect()
  .then(() => {
    console.log('Connected to PostgreSQL');
    return createTables();
  })
  .then(() => {
    console.log('Tables created successfully');
    // Start the server
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch(err => {
    console.error('Error initializing the application:', err.stack);
  });









// Middleware to verify JWT and attach user info to req.user
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token is missing' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    req.user = {user:user, user_id: user.id, email: user.email }; // Attach user_id and email to req.user
    next();
  });
};

module.exports = { authenticateToken };



// Middleware to check user access to a specific API
const checkAccess = (apiName) => {
  return (req, res, next) => {
    const { user_id } = req.user;
    console.log(`Checking access for User ID: ${user_id}, API Name: ${apiName}`);

    const query = `SELECT * FROM api_access WHERE user_id = $1 AND api_name = $2`;
    client.query(query, [user_id, apiName])
      .then(result => {
        console.log('API Access Query Result:', result.rows);
        if (result.rows.length > 0) {
          console.log('Access granted.');
          next();
        } else {
          console.log('Access denied.');
          res.status(403).json({ error: 'Access denied. You do not have permission to access this API.' });
        }
      })
      .catch(err => {
        console.error('Error checking API access:', err);
        res.status(500).json({ error: 'Internal server error' });
      });
  };
};
module.exports = { checkAccess }; 




// Use the same secret key for signing and verifying the tokens
const JWT_SECRET = "mysecret";

// Route to verify the token
app.post('/verify-token', (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    res.json({
      message: 'Token is valid',
      userId: decoded.id,
      email: decoded.email
    });
  });
});




// Route for user registration (signup)
app.post('/signup', [
  body('email').isEmail().withMessage('Invalid email address'),
  body('password').isLength({ min: 5 }).withMessage('Password must be at least 5 characters long')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { first_name, last_name, email, phone_no, password, dept_name, api_access, location, emp_id, role, user_status } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `
      INSERT INTO users (first_name, last_name, email, phone_no, password, dept_name, location, emp_id, role, user_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`;
    const values = [first_name, last_name, email, phone_no, hashedPassword, dept_name, location, emp_id, role, user_status];

    const result = await client.query(query, values);
    const newUser = result.rows[0];

    if (api_access && api_access.length > 0) {
      const accessQuery = `
        INSERT INTO api_access (user_id, api_name)
        VALUES ${api_access.map((_, i) => `(${newUser.user_id}, $${i + 1})`).join(', ')}`;
      await client.query(accessQuery, api_access);
    }

    res.status(201).json({
      message: 'User registered successfully.',
      userId: newUser.user_id,
    });
  } catch (err) {
    console.error('Error registering user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// Route for user login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await client.query(query, [email]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found. Please check the email entered.' });
    }

    const user = result.rows[0];

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ error: 'Incorrect password. Please try again.' });
    }

    const payload = {
      id: user.user_id,
      email: user.email
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

    res.json({
      message: 'Login successful',
      userId: user.user_id,
      token: token
    });
  } catch (err) {
    console.error('Error logging in:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// Connect your route files here
const deptRoutes = require('./routes/dept');
const userRoutes = require('./routes/users');
const apiAccessRoutes = require('./routes/access');
const customerRoutes = require('./routes/customer');
const contactRoutes = require('./routes/contacts');

// Use your route files
app.use('/departments', deptRoutes);
app.use('/users', userRoutes);
app.use('/api_access', apiAccessRoutes);
app.use('/customers', customerRoutes);
app.use('/contacts', contactRoutes);

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});