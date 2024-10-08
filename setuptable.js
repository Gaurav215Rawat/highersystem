const { pool } = require('./config');  // Importing the pool directly from config.js

const createTablesQuery = `
  DROP TABLE IF EXISTS contacts CASCADE;
  DROP TABLE IF EXISTS customers CASCADE;
  DROP TABLE IF EXISTS users CASCADE;
  DROP TABLE IF EXISTS api_access CASCADE;
  DROP TABLE IF EXISTS departments CASCADE;
  DROP TABLE IF EXISTS designation CASCADE;
  DROP TABLE IF EXISTS role CASCADE;
  DROP TABLE IF EXISTS domain CASCADE;

  CREATE TABLE IF NOT EXISTS departments (
    dept_id SERIAL PRIMARY KEY,
    dept_name VARCHAR(20) UNIQUE NOT NULL,
    dept_data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

   CREATE TABLE IF NOT EXISTS location (
      location_id SERIAL PRIMARY KEY,
      locality VARCHAR(20) UNIQUE NOT NULL,
      city VARCHAR(20) NOT NULL,
      state VARCHAR(20) NOT NULL,
      country VARCHAR(30) NOT NULL,
      code VARCHAR(15) NOT NULL,
      remarks Text,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

     CREATE TABLE IF NOT EXISTS designation (
      desig_id SERIAL PRIMARY KEY,
      designation VARCHAR(100) UNIQUE NOT NULL, 
      description TEXT  -- Description of the designation
    );


    CREATE TABLE IF NOT EXISTS role (
      role_id SERIAL PRIMARY KEY,
      role VARCHAR(100) UNIQUE NOT NULL,  
      description TEXT,  -- Description of the role
      access VARCHAR(100)  -- Access level associated with the role (can store access details)
    );


    CREATE TABLE IF NOT EXISTS domain (
      dom_id SERIAL PRIMARY KEY,
      domain_name VARCHAR(100) UNIQUE NOT NULL,
      description TEXT  
    );

  CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    first_name VARCHAR(20) NOT NULL,
    last_name VARCHAR(20) NOT NULL,
    email VARCHAR(30) UNIQUE NOT NULL,
    phone_no VARCHAR(15) UNIQUE NOT NULL,
    password TEXT,
    dept_name VARCHAR(20) REFERENCES departments(dept_name) ON DELETE CASCADE,
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

async function createTables() {
  const client = await pool.connect();  // Get a client from the pool
  try {
    await client.query(createTablesQuery);  // Execute the query
    console.log('Tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
  } finally {
    client.release();  // Release the client back to the pool
  }
}

createTables();  // Run the table creation script

// Optionally, close the pool when done (for example, when shutting down the app)
pool.end();
