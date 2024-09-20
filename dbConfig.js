require('dotenv').config(); // Load environment variables

const { Pool } = require('pg');

// Create a new Pool instance using environment variables
const pool = new Pool({
  user: process.env.DB_USER || 'higherdb',
  host: process.env.DB_HOST || 'ec2-43-204-140-118.ap-south-1.compute.amazonaws.com',
  database: process.env.DB_NAME || 'higherdb1',
  password: process.env.DB_PASSWORD || 'higherIndia1234',
  port: process.env.DB_PORT || 5432
});

// Connect to the database
pool.connect((err, client, release) => {
  if (err) {
    console.error('Connection error', err.stack);
  } else {
    console.log('Connected to the database');
    release(); // Release the client back to the pool
  }
});

module.exports = pool;
