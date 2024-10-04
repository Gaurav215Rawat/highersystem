// routes/countrys.js
const express = require('express');
const { pool } = require('../config'); // Adjust the path as needed
const router = express.Router();

// Get all countrys
router.get('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM location');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching countrys:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release(); // Always release the client in a finally block
  }
});

// Delete a country
router.delete('/', async (req, res) => {
  const client = await pool.connect();
  const { id } = req.body; // Extract country_id from the request body
  const query = 'DELETE FROM location WHERE location_id = $1 RETURNING *';

  try {
    const result = await client.query(query, [id]);
    if (result.rows.length > 0) {
      res.json({ message: 'Deleted successfully', country: result.rows[0] });
    } else {
      res.status(404).json({ error: 'country not found' });
    }
  } catch (err) {
    console.error('Error deleting location:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release(); // Always release the client in a finally block
  }
});

// POST API to add a new location
router.post('/', async (req, res) => {
  const client = await pool.connect();
  const { locality, city, state, country, code, remarks } = req.body;

  // Ensure required fields are provided
  if (!locality || !city || !state || !country || !code) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // Query to insert the country data into the country table
    const result = await client.query(
      `INSERT INTO location (locality, city, state, country, code, remarks) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`, 
      [locality, city, state, country, code, remarks]
    );

    res.status(201).json({ message: 'location added successfully', location: result.rows[0] });
  } catch (error) {
    console.error('Error adding location:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release(); // Always release the client in a finally block
  }
});




// Filter users
router.get('/filter', async (req, res) => {
  const client = await pool.connect(); // Connect to the pool
  try {
      const {dateFrom, dateTo, city, state, country } = req.body;

      // Build the base query
      let query = `SELECT * FROM location WHERE 1=1`;
      const queryParams = [];

      // Apply specific search filters

      if (dateFrom) {
          query += ` AND created_at >= $${queryParams.length + 1}`;
          queryParams.push(dateFrom);
      }

      if (dateTo) {
          query += ` AND created_at <= $${queryParams.length + 1}`;
          queryParams.push(dateTo);
      }

      if (city) {
          query += ` AND city = $${queryParams.length + 1}`;
          queryParams.push(city);
      }

      if (state) {
          query += ` AND state = $${queryParams.length + 1}`;
          queryParams.push(state);
      }

      if (country) {
          query += ` AND country = $${queryParams.length + 1}`;
          queryParams.push(country);
      }

      // Execute the query
      const result = await client.query(query, queryParams);
      res.status(200).json(result.rows);
  } catch (err) {
      console.error(err.message);
      res.status(500).json({ error: 'Server error' });
  } finally {
      client.release(); // Release the client back to the pool
  }
});

module.exports = router;
