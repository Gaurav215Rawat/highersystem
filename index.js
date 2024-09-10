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







// Get all user
app.get('/users', (req, res) => {
  client.query('SELECT * FROM users')
    .then(result => res.json(result.rows))
    .catch(err => {
      console.error('Error fetching customers:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
});

// Get user email
app.get('/email_users', (req, res) => {
  client.query('SELECT email,user_id FROM users')
    .then(result => res.json(result.rows))
    .catch(err => {
      console.error('Error fetching customers:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
});

// Get all api_access
app.get('/access', (req, res) => {
  client.query('SELECT * FROM api_access')
    .then(result => res.json(result.rows))
    .catch(err => {
      console.error('Error fetching customers:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
});

// Route for updating the password (only superadmin can update, but not their own password)
app.put('/update-password', authenticateToken, async (req, res) => {
  const { email, newPassword } = req.body;
  const { email: requesterEmail } = req.user; // Email of the user making the request

  try {
    // Check if the user making the request is superadmin
    if (requesterEmail !== 'superadmin@gmail.com') {
      return res.status(403).json({ error: 'Only superadmin can update passwords.' });
    }

    // Check if the email to be updated is superadmin's email
    if (email === 'superadmin@gmail.com') {
      return res.status(403).json({ error: 'Superadmin password cannot be changed.' });
    }

    // Retrieve the user by email
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await client.query(query, [email]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found. Please check the email entered.' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    const updateQuery = 'UPDATE users SET password = $1 WHERE email = $2 RETURNING *';
    const updateResult = await client.query(updateQuery, [hashedPassword, email]);

    res.status(200).json({
      message: 'Password updated successfully for user',
      userId: updateResult.rows[0].user_id,
    });
  } catch (err) {
    console.error('Error updating password:', err);
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







// Update API access route with permission check
app.put('/update_access', authenticateToken, checkAccess('update_access'), async (req, res) => {
  const { email } = req.body; // Expecting email in the request body
  const { api_access } = req.body;

  try {
    // Retrieve the user_id based on the email
    const userQuery = 'SELECT user_id FROM users WHERE email = $1';
    const userResult = await client.query(userQuery, [email]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found. Please check the email entered.' });
    }

    const user_id = userResult.rows[0].user_id;

    // Check if the email is 'superadmin@gmail.com' and block modification
    if (email === 'superadmin@gmail.com') {
      return res.status(403).json({ error: 'Super Admin access cannot be modified.' });
    }

    // Delete existing access for the user
    await client.query('DELETE FROM api_access WHERE user_id = $1', [user_id]);

    // Insert new access
    if (api_access && api_access.length > 0) {
      // Create a list of value placeholders for the query
      const valuePlaceholders = api_access.map((_, i) => `($1, $${i + 2})`).join(', ');
      const values = [user_id, ...api_access]; // Flatten the values array

      const accessQuery = `
        INSERT INTO api_access (user_id, api_name)
        VALUES ${valuePlaceholders}`;
      
      console.log('Executing query:', accessQuery);
      console.log('With values:', values);

      await client.query(accessQuery, values);
    }

    res.status(200).json({
      message: 'API access updated successfully.'
    });
  } catch (err) {
    console.error('Error updating API access:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});











// Create a new customer
app.post('/customers',authenticateToken,  checkAccess('create_customer'),(req, res) => {
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
app.get('/all-customers', authenticateToken, checkAccess('all_customer'), (req, res) => {
  client.query('SELECT * FROM customers')
    .then(result => res.json(result.rows))
    .catch(err => {
      console.error('Error fetching customers:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
});


// Get a customer by ID
app.get('/customers/:id',authenticateToken, checkAccess('id_customer'), (req, res) => {
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
app.put('/customers/:id', authenticateToken,checkAccess('update_customer'), (req, res) => {
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
app.delete('/customers/:id',authenticateToken, checkAccess('delete_customer'), (req, res) => {
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
app.post('/contacts',authenticateToken, checkAccess('create_contact'), (req, res) => {
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
app.get('/all-contacts',authenticateToken, checkAccess('all_contact'), (req, res) => {
  client.query('SELECT * FROM contacts')
    .then(result => res.json(result.rows))
    .catch(err => {
      console.error('Error fetching contacts:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
});


// Update a contact by ID
app.put('/contacts/:id',authenticateToken, checkAccess('update_contact'), (req, res) => {
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
app.delete('/contacts/:id',authenticateToken, checkAccess('delete_contact'), (req, res) => {
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
