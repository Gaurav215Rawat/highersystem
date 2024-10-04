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
// module.exports = {
//   database: {
//     connectionString: 'postgresql://higherindia_backend_rlnw_user:a1L9MWheQ3eobbyOS7OL2G7QvwZDdqTO@dpg-croff0q3esus73c0mmm0-a.singapore-postgres.render.com/higherindia_backend_rlnw',
//     // connectionString: 'postgresql://HIGHER:Higher@123@higherdb01.ct7tofa2ajsn.ap-south-1.rds.amazonaws.com:5432/HIGHER',

//     ssl: {
//       rejectUnauthorized: false
// }}
// };
const {Pool}=require('pg');
const dbConnect={
  connectionString: 'postgresql://higherindia_backend_rlnw_user:a1L9MWheQ3eobbyOS7OL2G7QvwZDdqTO@dpg-croff0q3esus73c0mmm0-a.singapore-postgres.render.com/higherindia_backend_rlnw',
     //connectionString: 'postgresql://HIGHER:Higher@123@higherdb01.ct7tofa2ajsn.ap-south-1.rds.amazonaws.com:5432/HIGHER',
  
    ssl: {
      rejectUnauthorized: false
  }};

const pool=new Pool(dbConnect);

module.exports={pool};
//psql -h dpg-croff0q3esus73c0mmm0-a.singapore-postgres.render.com -p 5432 -U higherindia_backend_rlnw_user -d higherindia_backend_rlnw