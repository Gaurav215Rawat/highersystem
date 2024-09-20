// // Import necessary modules
// const { Client } = require('pg');

// // PostgreSQL connection URI
// const connectionString = 'postgresql://customer_dashboard_user:LZuKobHgcEP1q69mxnC2Pj5NF7e7hAT8@dpg-cqfoijd6l47c73bifd2g-a/customer_dashboard';

// // Create a new client instance using the connection URI
// const client = new Client({
//   connectionString: connectionString
// });

// // Connect to the PostgreSQL database
// client.connect()
//   .then(() => {
//     console.log('Connected to PostgreSQL');
    
//     // Example: Querying the database
//     client.query('SELECT NOW() as current_time')
//       .then(result => {
//         console.log('Current time from PostgreSQL:', result.rows[0].current_time);
//       })
//       .catch(err => {
//         console.error('Error executing query:', err.stack);
//         client.end(); // Close the client connection on error
//       });
//   })
//   .catch(err => {
//     console.error('Connection error', err.stack);
//     client.end(); // Close the client connection on error
//   });


// // config.js
module.exports = {
  database: {
    connectionString: 'higher_javabackend_user:hBmofnLjTvPR4ajl4LV2GVpmAew0CfAa@dpg-crmk3q88fa8c73ak0nh0-a/higher_javabackend',
    ssl: {
      rejectUnauthorized: false
    }
  }
};
