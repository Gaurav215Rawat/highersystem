// addAddressColumns.js

const { Client } = require('pg');
const config = require('./config'); // Adjust the path as needed

const client = new Client(config);

const addAddressColumnsQuery = `
  ALTER TABLE customers
  ADD COLUMN country VARCHAR(100),
  ADD COLUMN state VARCHAR(100),
  ADD COLUMN city VARCHAR(100),
  ADD COLUMN pincode VARCHAR(10);
`;

client.connect()
  .then(() => {
    return client.query(addAddressColumnsQuery);
  })
  .then(() => {
    console.log('Columns country, state, city, and pincode added successfully.');
  })
  .catch(err => {
    console.error('Error adding columns:', err);
  })
  .finally(() => {
    client.end();
  });
