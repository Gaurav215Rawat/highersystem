// const express = require('express');
// const bodyParser = require('body-parser');
// const { Client } = require('pg');

// const app = express();
// const port = 3000;

// // PostgreSQL database connection configuration
// const { Pool } = require('pg');

// // Create a new pool instance
// const client = new Client({
//   connectionString: 'postgresql://customer_dashboard_user:LZuKobHgcEP1q69mxnC2Pj5NF7e7hAT8@dpg-cqfoijd6l47c73bifd2g-a/customer_dashboard',
//   ssl: {
//     rejectUnauthorized: false // Necessary for some hosted services that use SSL
//   }
// });

// // Connect to PostgreSQL database and create table if it doesn't exist
// client.connect()
//   .then(() => {
//     console.log('Connected to PostgreSQL');
//     return createTableIfNotExists();
//   })
//   .catch(err => console.error('Connection error', err.stack));

// // Middleware to parse JSON bodies
// app.use(bodyParser.json());

// // Create the customers table if it doesn't exist
// const createTablesQuery = `
// -- Drop tables if they already exist
// DROP TABLE IF EXISTS customers CASCADE;
// DROP TABLE IF EXISTS contacts CASCADE;

// CREATE TABLE IF NOT EXISTS customers (
//     customer_id SERIAL PRIMARY KEY,
//     customer_name VARCHAR(100) NOT NULL,
//     GSTNO VARCHAR(15),
//     landline_num VARCHAR(15),
//     address TEXT,
//     email_id VARCHAR(100),
//     pan_no VARCHAR(10),
//     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// );

// CREATE TABLE IF NOT EXISTS contacts (
//     contact_id SERIAL PRIMARY KEY,
//     contact_person VARCHAR(100) NOT NULL,
//     phone_num VARCHAR(15),
//     email_id VARCHAR(100),
//     address TEXT,
//     country VARCHAR(50),
//     state VARCHAR(50),
//     pincode VARCHAR(10),
//     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// );
// `;

// client.connect()
//   .then(() => client.query(createTablesQuery))
//   .then(() => {
//     console.log('Tables created successfully');
//   })
//   .catch(err => {
//     console.error('Error creating tables', err);
//   })
//   .finally(() => {
//     client.end();
//   });

// // Create a new customer
// app.post('/customers', (req, res) => {
//   const { customer_name, gst_number, landline_num, address, email_id, pan_no } = req.body;

//   // Validate input
//   if (!customer_name || !gst_number || !landline_num || !address || !email_id || !pan_no) {
//     return res.status(400).json({ error: 'All fields are required' });
//   }

//   const query = `
//     INSERT INTO customers (customer_name, gst_number, landline_num, address, email_id, pan_no)
//     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
//   const values = [customer_name, gst_number, landline_num, address, email_id, pan_no];

//   client.query(query, values)
//     .then(result => {
//       const newCustomer = result.rows[0];
//       res.status(201).json({
//         message: 'Customer created successfully',
//         customer: newCustomer
//       });
//     })
//     .catch(err => {
//       console.error('Error inserting customer:', err);
//       res.status(500).json({ error: 'Internal server error' });
//     });
// });

// // Get all customers
// app.get('/all-customers', (req, res) => {
//   client.query('SELECT * FROM customers')
//     .then(result => res.json(result.rows))
//     .catch(err => {
//       console.error('Error fetching customers:', err);
//       res.status(500).json({ error: 'Internal server error' });
//     });
// });

// // Get a customer by ID
// app.get('/customers/:id', (req, res) => {
//   const id = req.params.id;
//   client.query('SELECT * FROM customers WHERE customer_id = $1', [id])
//     .then(result => {
//       if (result.rows.length > 0) {
//         res.json(result.rows[0]);
//       } else {
//         res.status(404).json({ error: 'Customer not found' });
//       }
//     })
//     .catch(err => {
//       console.error('Error fetching customer:', err);
//       res.status(500).json({ error: 'Internal server error' });
//     });
// });

// // Update a customer by ID
// app.put('/customers/:id', (req, res) => {
//   const id = req.params.id;
//   const { customer_name, gst_number, landline_num, address, email_id, pan_no } = req.body;

//   // Validate input
//   if (!customer_name || !gst_number || !landline_num || !address || !email_id || !pan_no) {
//     return res.status(400).json({ error: 'All fields are required' });
//   }

//   const query = `
//     UPDATE customers
//     SET customer_name = $1, gst_number = $2, landline_num = $3, address = $4, email_id = $5, pan_no = $6, updated_at = CURRENT_TIMESTAMP
//     WHERE customer_id = $7 RETURNING *`;
//   const values = [customer_name, gst_number, landline_num, address, email_id, pan_no, id];

//   client.query(query, values)
//     .then(result => {
//       if (result.rows.length > 0) {
//         res.json(result.rows[0]);
//       } else {
//         res.status(404).json({ error: 'Customer not found' });
//       }
//     })
//     .catch(err => {
//       console.error('Error updating customer:', err);
//       res.status(500).json({ error: 'Internal server error' });
//     });
// });

// // Start the server
// app.listen(port, () => {
//   console.log(`Server running on port ${port}`);
// });

// // index.js
// // index.js
// // index.js



// new one
const express = require('express');
const bodyParser = require('body-parser');
const { Client } = require('pg');
const cors = require('cors');
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
      email_verification_code VARCHAR(6),
      sms_verification_code VARCHAR(6),
      is_verified BOOLEAN DEFAULT false,
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
      date_of_start VARCHAR(11),
      date_of_end VARCHAR(11),
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


  const sendMail = require('./mailConfig');
// const sendSMS = require('./smsConfig');
  const crypto = require('crypto'); // To generate random code
  
  // Route for user registration (signup)
  app.post('/signup', async (req, res) => {
    const { first_name, last_name, email, phone_no, password, confirm_password } = req.body;
  
    if (password !== confirm_password) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }
  
    try {
      const emailVerificationCode = crypto.randomInt(100000, 999999).toString();
      const smsVerificationCode = crypto.randomInt(100000, 999999).toString();
  
      const query = `
        INSERT INTO users (first_name, last_name, email, phone_no, password, email_verification_code, sms_verification_code)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`;
      const values = [first_name, last_name, email, phone_no, password, emailVerificationCode, smsVerificationCode];
  
      const result = await client.query(query, values);
      const newUser = result.rows[0];
  
      // Send email verification code
      const emailSubject = 'Verify Your Email';
      const emailHtml = `<h1>Email Verification</h1><p>Your verification code is: <strong>${emailVerificationCode}</strong></p>`;
      await sendMail(email, emailSubject, emailHtml);
  
      // // Send SMS verification code
      // const smsBody = `Your verification code is: ${smsVerificationCode}`;
      // await sendSMS(phone_no, smsBody);
  
      res.status(201).json({
        message: 'User registered successfully. Please check your email and SMS for the verification codes.',
        userId: newUser.user_id,
      });
    } catch (err) {
      console.error('Error registering user:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

// Route for verification
app.post('/verify', async (req, res) => {
  const { emailVerificationCode, smsVerificationCode } = req.body;

  try {
    const query = 'SELECT * FROM users WHERE email_verification_code = $1';//AND sms_verification_code = $2
    const result = await client.query(query, [emailVerificationCode]);//, smsVerificationCode

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid verification codes' });
    }

    const userId = result.rows[0].user_id;
    const updateQuery = 'UPDATE users SET is_verified = true, email_verification_code = NULL, sms_verification_code = NULL WHERE user_id = $1';
    await client.query(updateQuery, [userId]);

    res.json({ message: 'Verification successful. You can now log in.' });
  } catch (err) {
    console.error('Error verifying codes:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Route for user login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find the user by emails
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await client.query(query, [email]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Check if the user's email is verified
    if (!user.is_verified) {
      return res.status(403).json({ error: 'Email not verified. Please check your email for the verification code.' });
    }

    // Compare the password directly (since it's stored as plain text)
    if (password !== user.password) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // If credentials are correct, respond with a success message
    res.json({ message: 'Login successful',
      userId: user.user_id,// Send userId as part of the response
       });
  } catch (err) {
    console.error('Error logging in:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//  // Route for user registration (signup)
// app.post('/signup', async (req, res) => {
//   const { first_name, last_name, email, phone_no, password, confirm_password } = req.body;

//   if (password !== confirm_password) {
//     return res.status(400).json({ error: 'Passwords do not match' });
//   }

//   try {
//     // Generate a 6-digit verification code
//     const verificationCode = crypto.randomInt(100000, 999999).toString();

//     const query = `
//       INSERT INTO users (first_name, last_name, email, phone_no, password, verification_code)
//       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
//     const values = [first_name, last_name, email, phone_no, password, verificationCode];

//     const result = await client.query(query, values);
//     const newUser = result.rows[0];

//     // Send the verification code via email
//     const subject = 'Verify Your Email';
//     const html = `<h1>Email Verification</h1><p>Your verification code is: <strong>${verificationCode}</strong></p>`;
    
//     await sendMail(email, subject, html); // Send the email

//     res.status(201).json({
//       message: 'User registered successfully. Please check your email for the verification code.',
//       userId: newUser.user_id, // assuming user_id is the primary key
//     });
//   } catch (err) {
//     console.error('Error registering user:', err);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });
  


// // Route for email verification
// app.post('/verify-email', async (req, res) => {
//   const { verificationCode } = req.body;

//   try {
//     const query = 'SELECT * FROM users WHERE verification_code = $1';
//     const result = await client.query(query, [verificationCode]);

//     if (result.rows.length === 0) {
//       return res.status(400).json({ error: 'Invalid verification code' });
//     }

//     // Mark the user as verified
//     const userId = result.rows[0].user_id;
//     const updateQuery = 'UPDATE users SET is_verified = true, verification_code = NULL WHERE user_id = $1';
//     await client.query(updateQuery, [userId]);

//     res.json({ message: 'Email verified successfully. You can now log in.' });
//   } catch (err) {
//     console.error('Error verifying email:', err);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });


  
// // Route for user login
// app.post('/login', async (req, res) => {
//   const { email, password } = req.body;

//   try {
//     // Find the user by email
//     const query = 'SELECT * FROM users WHERE email = $1';
//     const result = await client.query(query, [email]);

//     if (result.rows.length === 0) {
//       return res.status(404).json({ error: 'User not found' });
//     }

//     const user = result.rows[0];

//     // Check if the user's email is verified
//     if (!user.is_verified) {
//       return res.status(403).json({ error: 'Email not verified. Please check your email for the verification code.' });
//     }

//     // Compare the password directly (since it's stored as plain text)
//     if (password !== user.password) {
//       return res.status(400).json({ error: 'Invalid credentials' });
//     }

//     // If credentials are correct, respond with a success message
//     res.json({ message: 'Login successful' });
//   } catch (err) {
//     console.error('Error logging in:', err);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });


// Create a new customer
app.post('/customers', (req, res) => {
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

// Get all customers
app.get('/all-customers', (req, res) => {
  client.query('SELECT * FROM customers')
    .then(result => res.json(result.rows))
    .catch(err => {
      console.error('Error fetching customers:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
});

// Get a customer by ID
app.get('/customers/:id', (req, res) => {
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
app.put('/customers/:id', (req, res) => {
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
app.delete('/customers/:id', (req, res) => {
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
app.post('/contacts', (req, res) => {
  const { customer_id, contact_person, phone_num, email_id, address, city, state, country, pincode, department, designation, date_of_end, status } = req.body;
  const date_of_start = req.body.date_of_start || new Date().toISOString().split('T')[0];

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
app.get('/all-contacts', (req, res) => {
  client.query('SELECT * FROM contacts')
    .then(result => res.json(result.rows))
    .catch(err => {
      console.error('Error fetching contacts:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
});

// Get a contact by ID
app.get('/contacts/:id', (req, res) => {
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
app.put('/contacts/:id', (req, res) => {
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
app.delete('/contacts/:id', (req, res) => {
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

