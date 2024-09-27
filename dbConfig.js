require('dotenv').config(); // Load environment variables

const { Pool } = require('pg');

// Create a new Pool instance using environment variables
const pool = new Pool({
  user: process.env.DB_USER || 'HIGHER',
  host: process.env.DB_HOST || 'higherdb01.ct7tofa2ajsn.ap-south-1.rds.amazonaws.com',
  database: process.env.DB_NAME || 'HIGHER',
  password: process.env.DB_PASSWORD || 'Higher@123',
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
