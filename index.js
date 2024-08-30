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

    CREATE TABLE users (
      user_id SERIAL PRIMARY KEY,
      first_name VARCHAR(20) NOT NULL,
      last_name VARCHAR(20) NOT NULL,
      email VARCHAR(30) UNIQUE NOT NULL,
      phone_no VARCHAR(15) UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role INTEGER DEFAULT 2,
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

// Middleware to check user role
const checkRole = (roles) => {
  return (req, res, next) => {
    const { role } = req.user; // Assuming req.user contains the user's data after token verification

    if (roles.includes(role)) {
      next(); // User has permission, proceed to the route
    } else {
      res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }
  };
};

// Route for user registration (signup)
app.post('/signup', [
  body('email').isEmail().withMessage('Invalid email address'),
  body('password').isLength({ min: 5 }).withMessage('Password must be at least 5 characters long'),
  body('confirm_password').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { first_name, last_name, email, phone_no, password, role } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `
      INSERT INTO users (first_name, last_name, email, phone_no, password, role)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
    const values = [first_name, last_name, email, phone_no, hashedPassword, role || 2];

    const result = await client.query(query, values);
    const newUser = result.rows[0];

    res.status(201).json({
      message: 'User registered successfully.',
      userId: newUser.user_id,
    });
  } catch (err) {
    console.error('Error registering user:', err);
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
    const payload={
      id:user.user_id,
      email:user.email,
      role: user.role
    }
const token=jwt.sign(payload,JWT_SECRET,{ expiresIn: '1h' })
    res.json({
      message: 'Login successful',
      userId: user.user_id,
      token:token
    });
  } catch (err) {
    console.error('Error logging in:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new customer  checkRole([0, 1]), 
app.post('/customers',(req, res) => {
  const { customer_name, gst_number, landline_num, email_id, pan_no, tan_number, address, city, state, country, pincode } = req.body;

  const query = `
    INSERT INTO customers (customer_name, gst_number, landline_num, email_id, pan_no, tan_number, address, city, state, country, pincode) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`;
  const values = [customer_name, gst_number, landline_num, email_id, pan_no, tan_number, address, city, state, country, pincode];

  client.query(query, values)
    .then(result => {
      const newCustomer = result.rows[0];
      res.status(201).json({
        message: 'Customer created successfully',
        customer: newCustomer
      });
    })
    .catch(err => {
      console.error('Error inserting customer:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
});

// Get all customers (use authenticateToken before checkRole)
app.get('/all-customers', authenticateToken, checkRole([0, 1, 2]), (req, res) => {
  client.query('SELECT * FROM customers')
    .then(result => res.json(result.rows))
    .catch(err => {
      console.error('Error fetching customers:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
});


// Get a customer by ID
app.get('/customers/:id', checkRole([0, 1, 2]), (req, res) => {
  const id = req.params.id;
  client.query('SELECT * FROM customers WHERE customer_id = $1', [id])
    .then(result => {
      if (result.rows.length > 0) {
        res.json(result.rows[0]);
      } else {
        res.status(404).json({ error: 'Customer not found' });
      }
    })
    .catch(err => {
      console.error('Error fetching customer:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
});

// Update a customer by ID
app.put('/customers/:id', checkRole([0, 1]), (req, res) => {
  const id = req.params.id;
  const { customer_name, gst_number, landline_num, email_id, pan_no, tan_number, address, city, state, country, pincode } = req.body;

  const query = `
    UPDATE customers
    SET customer_name = $1, gst_number = $2, landline_num = $3, email_id = $4, pan_no = $5, tan_number = $6, address = $7, city = $8, state = $9, country = $10, pincode = $11, updated_at = CURRENT_TIMESTAMP
    WHERE customer_id = $12 RETURNING *`;
  const values = [customer_name, gst_number, landline_num, email_id, pan_no, tan_number, address, city, state, country, pincode, id];

  client.query(query, values)
    .then(result => {
      if (result.rows.length > 0) {
        res.json(result.rows[0]);
      } else {
        res.status(404).json({ error: 'Customer not found' });
      }
    })
    .catch(err => {
      console.error('Error updating customer:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
});

// Delete a customer by ID
app.delete('/customers/:id', checkRole([0]), (req, res) => {
  const id = req.params.id;
  const query = 'DELETE FROM customers WHERE customer_id = $1 RETURNING *';
  client.query(query, [id])
    .then(result => {
      if (result.rows.length > 0) {
        res.json({ message: 'Customer deleted successfully', customer: result.rows[0] });
      } else {
        res.status(404).json({ error: 'Customer not found' });
      }
    })
    .catch(err => {
      console.error('Error deleting customer:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
});

// Create a new contact
app.post('/contacts', checkRole([0, 1]), (req, res) => {
  const { customer_id, contact_person, phone_num, email_id, address, city, state, country, pincode, department, designation, date_of_end, status } = req.body;
  const date_of_start = req.body.date_of_start || moment().format('YYYY-MM-DD');

  const query = `
    INSERT INTO contacts (customer_id, contact_person, phone_num, email_id, address, city, state, country, pincode, department, designation, date_of_start, date_of_end, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`;
  const values = [customer_id, contact_person, phone_num, email_id, address, city, state, country, pincode, department, designation, date_of_start, date_of_end, status];

  client.query(query, values)
    .then(result => {
      const newContact = result.rows[0];
      res.status(201).json({
        message: 'Contact created successfully',
        contact: newContact
      });
    })
    .catch(err => {
      console.error('Error inserting contact:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
});

// Get all contacts
app.get('/all-contacts', checkRole([0, 1, 2]), (req, res) => {
  client.query('SELECT * FROM contacts')
    .then(result => res.json(result.rows))
    .catch(err => {
      console.error('Error fetching contacts:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
});

// Get a contact by ID
app.get('/contacts/:id', checkRole([0, 1, 2]), (req, res) => {
  const id = req.params.id;
  client.query('SELECT * FROM contacts WHERE contact_id = $1', [id])
    .then(result => {
      if (result.rows.length > 0) {
        res.json(result.rows[0]);
      } else {
        res.status(404).json({ error: 'Contact not found' });
      }
    })
    .catch(err => {
      console.error('Error fetching contact:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
});

// Update a contact by ID
app.put('/contacts/:id', checkRole([0, 1]), (req, res) => {
  const id = req.params.id;
  const { customer_id, contact_person, phone_num, email_id, address, city, state, country, pincode, department, designation, date_of_start, date_of_end, status } = req.body;

  const query = `
    UPDATE contacts
    SET customer_id = $1, contact_person = $2, phone_num = $3, email_id = $4, address = $5, city = $6, state = $7, country = $8, pincode = $9, department = $10, designation = $11, date_of_start = $12, date_of_end = $13, status = $14, updated_at = CURRENT_TIMESTAMP
    WHERE contact_id = $15 RETURNING *`;
  const values = [customer_id, contact_person, phone_num, email_id, address, city, state, country, pincode, department, designation, date_of_start, date_of_end, status, id];

  client.query(query, values)
    .then(result => {
      if (result.rows.length > 0) {
        res.json(result.rows[0]);
      } else {
        res.status(404).json({ error: 'Contact not found' });
      }
    })
    .catch(err => {
      console.error('Error updating contact:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
});

// Delete a contact by ID
app.delete('/contacts/:id', checkRole([0]), (req, res) => {
  const id = req.params.id;
  const query = 'DELETE FROM contacts WHERE contact_id = $1 RETURNING *';
  client.query(query, [id])
    .then(result => {
      if (result.rows.length > 0) {
        res.json({ message: 'Contact deleted successfully', contact: result.rows[0] });
      } else {
        res.status(404).json({ error: 'Contact not found' });
      }
    })
    .catch(err => {
      console.error('Error deleting contact:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
});
