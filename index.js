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
const port = 3000;

// Enable CORS for all routes
app.use(cors({ origin: 'http://localhost:3000' }));

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

    CREATE TABLE IF NOT EXISTS users (
      user_id SERIAL PRIMARY KEY,
      first_name VARCHAR(20) NOT NULL,
      last_name VARCHAR(20) NOT NULL,
      email VARCHAR(30) UNIQUE NOT NULL,
      phone_no VARCHAR(15) UNIQUE NOT NULL,
      password TEXT NOT NULL,
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
      api_name VARCHAR(100) NOT NULL
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

    req.user = user; // Attach the decoded token payload to req.user
    next();
  });
};

// Middleware to check user access to a specific API
const checkAccess = (apiName) => {
  return (req, res, next) => {
    const { user_id } = req.user;

    const query = `SELECT * FROM api_access WHERE user_id = $1 AND api_name = $2`;
    client.query(query, [user_id, apiName])
      .then(result => {
        if (result.rows.length > 0) {
          next(); // User has access, proceed to the route
        } else {
          res.status(403).json({ error: 'Access denied. You do not have permission to access this API.' });
        }
      })
      .catch(err => {
        console.error('Error checking API access:', err);
        res.status(500).json({ error: 'Internal server error' });
      });
  };
};

// Route for user registration (signup)
app.post('/signup', [
  body('email').isEmail().withMessage('Invalid email address'),
  body('password').isLength({ min: 5 }).withMessage('Password must be at least 5 characters long'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { first_name, last_name, email, phone_no, password, api_access } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `
      INSERT INTO users (first_name, last_name, email, phone_no, password)
      VALUES ($1, $2, $3, $4, $5) RETURNING *`;
    const values = [first_name, last_name, email, phone_no, hashedPassword];

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

// Route to update user API access
app.put('/users/:id/access', authenticateToken, async (req, res) => {
  const userId = req.params.id;
  const { api_access } = req.body;

  try {
    // Delete existing access
    await client.query(`DELETE FROM api_access WHERE user_id = $1`, [userId]);

    // Insert new access
    if (api_access && api_access.length > 0) {
      const accessQuery = `
        INSERT INTO api_access (user_id, api_name)
        VALUES ${api_access.map((_, i) => `(${userId}, $${i + 1})`).join(', ')}`;
      await client.query(accessQuery, api_access);
    }

    res.status(200).json({
      message: 'API access updated successfully.'
    });
  } catch (err) {
    console.error('Error updating API access:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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


// Get all users 
app.get('/users',(req, res) => {
  client.query('SELECT * FROM users')
    .then(result => res.json(result.rows))
    .catch(err => {
      console.error('Error fetching customers:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
});

// Route to create a new customer
app.post('/customers', authenticateToken, checkAccess('create_customer'), async (req, res) => {
  const { customer_name, gst_number, landline_num, email_id, pan_no, tan_number, address, city, state, country, pincode } = req.body;

  try {
    const query = `
      INSERT INTO customers (customer_name, gst_number, landline_num, email_id, pan_no, tan_number, address, city, state, country, pincode)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`;
    const values = [customer_name, gst_number, landline_num, email_id, pan_no, tan_number, address, city, state, country, pincode];

    const result = await client.query(query, values);
    const newCustomer = result.rows[0];

    res.status(201).json({
      message: 'Customer created successfully.',
      customer: newCustomer
    });
  } catch (err) {
    console.error('Error creating customer:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to update customer details
app.put('/customers/:id', authenticateToken, checkAccess('update_customer'), async (req, res) => {
  const customerId = req.params.id;
  const { customer_name, gst_number, landline_num, email_id, pan_no, tan_number, address, city, state, country, pincode } = req.body;

  try {
    const query = `
      UPDATE customers
      SET customer_name = $1, gst_number = $2, landline_num = $3, email_id = $4, pan_no = $5, tan_number = $6, address = $7, city = $8, state = $9, country = $10, pincode = $11, updated_at = CURRENT_TIMESTAMP
      WHERE customer_id = $12 RETURNING *`;
    const values = [customer_name, gst_number, landline_num, email_id, pan_no, tan_number, address, city, state, country, pincode, customerId];

    const result = await client.query(query, values);
    const updatedCustomer = result.rows[0];

    res.status(200).json({
      message: 'Customer updated successfully.',
      customer: updatedCustomer
    });
  } catch (err) {
    console.error('Error updating customer:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to delete a customer
app.delete('/customers/:id', authenticateToken, checkAccess('delete_customer'), async (req, res) => {
  const customerId = req.params.id;

  try {
    const query = `DELETE FROM customers WHERE customer_id = $1 RETURNING *`;
    const result = await client.query(query, [customerId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.status(200).json({
      message: 'Customer deleted successfully.',
      customer: result.rows[0]
    });
  } catch (err) {
    console.error('Error deleting customer:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to create a new contact
app.post('/contacts', authenticateToken, checkAccess('create_contact'), async (req, res) => {
  const { customer_id, contact_person, phone_num, email_id, address, city, state, country, pincode, department, designation, date_of_start, date_of_end, status } = req.body;

  try {
    const query = `
      INSERT INTO contacts (customer_id, contact_person, phone_num, email_id, address, city, state, country, pincode, department, designation, date_of_start, date_of_end, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`;
    const values = [customer_id, contact_person, phone_num, email_id, address, city, state, country, pincode, department, designation, date_of_start, date_of_end, status];

    const result = await client.query(query, values);
    const newContact = result.rows[0];

    res.status(201).json({
      message: 'Contact created successfully.',
      contact: newContact
    });
  } catch (err) {
    console.error('Error creating contact:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to update contact details
app.put('/contacts/:id', authenticateToken, checkAccess('update_contact'), async (req, res) => {
  const contactId = req.params.id;
  const { contact_person, phone_num, email_id, address, city, state, country, pincode, department, designation, date_of_start, date_of_end, status } = req.body;

  try {
    const query = `
      UPDATE contacts
      SET contact_person = $1, phone_num = $2, email_id = $3, address = $4, city = $5, state = $6, country = $7, pincode = $8, department = $9, designation = $10, date_of_start = $11, date_of_end = $12, status = $13, updated_at = CURRENT_TIMESTAMP
      WHERE contact_id = $14 RETURNING *`;
    const values = [contact_person, phone_num, email_id, address, city, state, country, pincode, department, designation, date_of_start, date_of_end, status, contactId];

    const result = await client.query(query, values);
    const updatedContact = result.rows[0];

    res.status(200).json({
      message: 'Contact updated successfully.',
      contact: updatedContact
    });
  } catch (err) {
    console.error('Error updating contact:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to delete a contact
app.delete('/contacts/:id', authenticateToken, checkAccess('delete_contact'), async (req, res) => {
  const contactId = req.params.id;

  try {
    const query = `DELETE FROM contacts WHERE contact_id = $1 RETURNING *`;
    const result = await client.query(query, [contactId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.status(200).json({
      message: 'Contact deleted successfully.',
      contact: result.rows[0]
    });
  } catch (err) {
    console.error('Error deleting contact:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
