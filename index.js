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
    DROP TABLE IF EXISTS location CASCADE;
    DROP TABLE IF EXISTS form_fields CASCADE;
    DROP TABLE IF EXISTS dynamic_form_data CASCADE;


     CREATE TABLE IF NOT EXISTS departments (
      dept_id SERIAL PRIMARY KEY,
      dept_name VARCHAR(20) UNIQUE NOT NULL,
      dept_data Text,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS location (
      location_id SERIAL PRIMARY KEY,
      locality VARCHAR(20) UNIQUE NOT NULL,
      city VARCHAR(20) NOT NULL,
      state VARCHAR(20) NOT NULL,
      Country VARCHAR(30) NOT NULL,
      code VARCHAR(15) NOT NULL,
      remarks Text,
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
      location VARCHAR(20) REFERENCES location(locality)  ON DELETE CASCADE,
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



    -- Create the dynamic_form_data table

    CREATE TABLE form_fields (
    id SERIAL PRIMARY KEY,
    field_name VARCHAR(255) UNIQUE NOT NULL,
    field_type VARCHAR(50) CHECK (field_type IN ('string', 'number', 'boolean', 'enum')),
    enum_values TEXT[] -- Use an array for enum values if necessary
);

CREATE TABLE dynamic_form_data (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    -- Additional columns will be added dynamically
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





// Endpoint to get form fields
app.get('/form-fields', async (req, res) => {
  try {
      const result = await client.query('SELECT * FROM form_fields');
      res.json(result.rows);
  } catch (err) {
      console.error('Error fetching form fields:', err);
      res.status(500).send('Server error');
  }
});

// Endpoint to submit form data
app.post('/submit', async (req, res) => {
  const formData = req.body.formData; // Get form data
  const newFields = req.body.newFields; // Get new fields from the request

  const validationErrors = [];

  try {
      // Validate existing form data
      for (const [fieldName, value] of Object.entries(formData)) {
          const result = await client.query('SELECT field_type FROM form_fields WHERE field_name = $1', [fieldName]);
          if (result.rows.length > 0) {
              const fieldType = result.rows[0].field_type;

              // Validate the value
              if (fieldType === 'number' && isNaN(value)) {
                  validationErrors.push(`Field "${fieldName}" must be a number.`);
              } else if (fieldType === 'boolean' && typeof value !== 'boolean') {
                  validationErrors.push(`Field "${fieldName}" must be a boolean.`);
              }
          }
      }

      // If validation errors exist, send a response with errors
      if (validationErrors.length > 0) {
          return res.status(400).json({ errors: validationErrors });
      }

      // Insert new fields into form_fields and add columns to dynamic_form_data
      for (const field of newFields) {
          const { name, type } = field;

          // Insert new field into form_fields
          await client.query(
              `INSERT INTO form_fields (field_name, field_type) VALUES ($1, $2) 
              ON CONFLICT (field_name) DO UPDATE SET field_type = EXCLUDED.field_type`,
              [name, type]
          );

          // Alter the dynamic_form_data table to add a new column if it doesn't exist
          await client.query(
              `DO $$ 
              BEGIN 
                  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name='dynamic_form_data' AND column_name=$1) 
                  THEN 
                      EXECUTE 'ALTER TABLE dynamic_form_data ADD COLUMN "' || $1 || '" ' || ($2 = 'number' ? 'DOUBLE PRECISION' : 'VARCHAR(255)');
                  END IF; 
              END $$;`,
              [name, type]
          );
      }

      // Insert the form data into dynamic_form_data
      const columns = Object.keys(formData).map(field => `"${field}"`).join(', ');
      const values = Object.values(formData);

      await client.query(
          `INSERT INTO dynamic_form_data (${columns}) VALUES (${values.map((_, i) => `$${i + 1}`).join(', ')})`,
          values
      );

      res.json({ message: 'Data submitted successfully!' });
  } catch (err) {
      console.error('Error submitting form data:', err);
      res.status(500).send('Server error');
  }
});








// POST /departments - Add a new department with dept_data
app.post('/departments', async (req, res) => {
  const { dept_name, dept_data } = req.body;

  // Ensure department name is provided
  if (!dept_name) {
    return res.status(400).json({ error: 'Department name is required' });
  }

  try {
    const query = 'INSERT INTO departments (dept_name, dept_data) VALUES ($1, $2) RETURNING *';
    const values = [dept_name, dept_data || null];  // If dept_data is not provided, default to null
    const result = await client.query(query, values);
    const newDepartment = result.rows[0];
    res.status(201).json({
      message: 'Department added successfully.',
      department: newDepartment,
    });
  } catch (err) {
    console.error('Error adding department:', err);
    res.status(500).json({ error: 'Internal server error',message:err.detail });
  }
});

// GET /departments - Retrieve all departments including dept_data
app.get('/departments', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM departments');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error retrieving departments:', err);
    res.status(500).json({ error: 'Internal server error',message:err.detail });
  }
});


// Delete 
app.delete('/departments',(req, res) => {
  const {id} = req.body;
  const query = 'DELETE FROM departments WHERE dept_id = $1 RETURNING *';
  client.query(query, [id])
    .then(result => {
      if (result.rows.length > 0) {
        res.json({ message: 'deleted successfully', customer: result.rows[0] });
      } else {
        res.status(404).json({ error: 'Department not found' });
      }
    })
    .catch(err => {
      console.error('Error deleting :', err);
      res.status(500).json({ error: 'Internal server error' });
    });
});













// get locations
app.get('/loc', (req, res) => {
  client.query('SELECT * FROM location')
    .then(result => res.json(result.rows))
    .catch(err => {
      console.error('Error fetching location:', err);
      res.status(500).json({ error: 'Internal server error location' });
    });
});



//delete location
app.delete('/loc', (req, res) => {
  const { id } = req.body; // Extract user_id from the request body
  const query = 'DELETE FROM location WHERE location_id = $1 RETURNING *';

  client.query(query, [id])
    .then(result => {
      if (result.rows.length > 0) {
        res.json({ message: 'Deleted successfully', location: result.rows[0] });
      } else {
        res.status(404).json({ error: 'location not found' });
      }
    })
    .catch(err => {
      console.error('Error deleting location:', err);
      res.status(500).json({ error: 'Internal server error in location' });
    });
});



// POST API to add a new location
app.post('/loc', async (req, res) => {
  const { locality, city, state, country, code, remarks } = req.body;

  // Ensure required fields are provided
  if (!locality || !city || !state || !country || !code) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // Query to insert the location data into the location table
    const result = await client.query(
      `INSERT INTO location (locality, city, state, country, code, remarks) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`, 
       [locality, city, state, country, code, remarks]
    );

    res.status(201).json({ message: 'Location added successfully', location: result.rows[0] });
  } catch (error) {
    console.error('Error adding location:', error);
    res.status(500).json({ message: 'Server error' });
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


// Get all user
app.get('/getusers', (req, res) => {
  client.query('SELECT * FROM users where email <> \'superadmin@gmail.com\'')
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


// Route for updating the password (only super_admin can update, but not their own password)
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


app.get('/users/filter', async (req, res) => {
  try {
      // Extract filters and specific search parameters from the request body
      const { 
          user_id, email, first_name, last_name, phone_no, 
          dateFrom, dateTo, user_status, dept_name, location 
      } = req.query;

      // Build the base query
      let query = `SELECT * FROM users WHERE 1=1`;

      // Array to hold query parameters
      const queryParams = [];

      // Apply specific search filters
      if (user_id) {
          query += ` AND user_id = $${queryParams.length + 1}`;
          queryParams.push(user_id);
      }

      if (email) {
          query += ` AND email = $${queryParams.length + 1}`;
          queryParams.push(email);
      }

      if (first_name) {
          query += ` AND first_name ILIKE $${queryParams.length + 1}`;
          queryParams.push(`%${first_name}%`);
      }

      if (last_name) {
          query += ` AND last_name ILIKE $${queryParams.length + 1}`;
          queryParams.push(`%${last_name}%`);
      }

      if (phone_no) {
          query += ` AND phone_no = $${queryParams.length + 1}`;
          queryParams.push(phone_no);
      }

      // Apply date and status filters
      if (dateFrom) {
          query += ` AND created_at >= $${queryParams.length + 1}`;
          queryParams.push(dateFrom);
      }

      if (dateTo) {
          query += ` AND created_at <= $${queryParams.length + 1}`;
          queryParams.push(dateTo);
      }

      if (user_status) {
          query += ` AND user_status = $${queryParams.length + 1}`;
          queryParams.push(user_status);
      }

      if (dept_name) {
          query += ` AND dept_name = $${queryParams.length + 1}`;
          queryParams.push(dept_name);
      }

      if (location) {
          query += ` AND location = $${queryParams.length + 1}`;
          queryParams.push(location);
      }

      // Execute the query
      const result = await client.query(query, queryParams);

      // Send response with the filtered results
      res.status(200).json(result.rows);
  } catch (err) {
      console.error(err.message);
      res.status(500).json({ error: 'Server error' });
  }
});


app.delete('/users', (req, res) => {
  const { id } = req.body; // Extract user_id from the request body
  const query = 'DELETE FROM users WHERE user_id = $1 RETURNING *';

  client.query(query, [id])
    .then(result => {
      if (result.rows.length > 0) {
        res.json({ message: 'Deleted successfully', user: result.rows[0] });
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    })
    .catch(err => {
      console.error('Error deleting user:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
});

// Get API access by user ID
app.get('/id_user/:id', (req, res) => {
  const id = req.params.id;

  if (!id) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  client.query('SELECT * FROM users WHERE user_id = $1', [id])
    .then(result => {
      if (result.rows.length > 0) {
        res.json(result.rows);  // Return all rows instead of just the first one
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    })
    .catch(err => {
      console.error('Error fetching API access:', err);
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


// Update API access route with permission check
app.put('/update_access', authenticateToken, checkAccess('update_access'), async (req, res) => {
  const { user_id } = req.body; // Expecting user_id in the request body now
  const { api_access } = req.body;

  try {
    // Check if the user exists based on the provided user_id
    const userQuery = 'SELECT user_id, email FROM users WHERE user_id = $1';
    const userResult = await client.query(userQuery, [user_id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found. Please check the user_id provided.' });
    }

    const user_email = userResult.rows[0].email;

    // Check if the user is 'superadmin@gmail.com' and block modification
    if (user_email === 'superadmin@gmail.com') {
      return res.status(403).json({ error: 'Super Admin access cannot be modified.' });
    }

    // Delete existing access for the user
    const deleteQuery = 'DELETE FROM api_access WHERE user_id = $1';
    await client.query(deleteQuery, [user_id]);

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


app.post('/verify-access', (req, res) => {
  const { user_id, pages } = req.body;  // Expecting user_id and an array of api_name (pages)

  // SQL query to select api_name where user_id matches and the api_name exists in the pages array
  const query = 'SELECT api_name FROM api_access WHERE user_id = $1 AND api_name = ANY($2::text[])';
  
  client.query(query, [user_id, pages])
    .then(result => {
      const accessiblePages = result.rows.map(row => row.api_name); // Get the accessible api_names

      // Build the response with true or false for each page
      const accessResult = {};
      pages.forEach(page => {
        accessResult[page] = accessiblePages.includes(page); // Check if the page is in the accessiblePages
      });

      res.json(accessResult); // Send back the result as an object
    })
    .catch(err => {
      console.error('Error verifying access:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
});


// Get API access by user ID
app.get('/id_access/:id', (req, res) => {
  const id = req.params.id;

  if (!id) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  client.query('SELECT * FROM api_access WHERE user_id = $1', [id])
    .then(result => {
      if (result.rows.length > 0) {
        res.json(result.rows);  // Return all rows instead of just the first one
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    })
    .catch(err => {
      console.error('Error fetching API access:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
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
