// routes/api_access.js
const express = require('express');
const router = express.Router();
const { pool } = require("../config");
const { authenticateToken } = require('../index');
const { checkAccess } = require('../index');

// Middleware to parse JSON bodies
router.use(express.json());

// Get all API access
router.get('/', async (req, res) => {
  const client = await pool.connect(); // Explicitly connecting to the pool
  try {
    const result = await client.query('SELECT * FROM api_access');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching API access:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release(); // Release the client back to the pool
  }
});

// Update API access route with permission check
router.put('/update_access', authenticateToken, checkAccess('update_access'), async (req, res) => {
  const client = await pool.connect(); // Explicitly connecting to the pool
  const { user_id, api_access } = req.body;

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
      const valuePlaceholders = api_access.map((_, i) => `($1, $${i + 2})`).join(', ');
      const values = [user_id, ...api_access];

      const accessQuery = `
        INSERT INTO api_access (user_id, api_name)
        VALUES ${valuePlaceholders}`;

      await client.query(accessQuery, values);
    }

    res.status(200).json({
      message: 'API access updated successfully.'
    });
  } catch (err) {
    console.error('Error updating API access:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release(); // Release the client back to the pool
  }
});

// Verify API access
router.post('/verify-access', async (req, res) => {
  const { user_id, pages } = req.body; // Expecting user_id and an array of api_name (pages)

  const client = await pool.connect(); // Explicitly connecting to the pool
  try {
    // SQL query to select api_name where user_id matches and the api_name exists in the pages array
    const query = 'SELECT api_name FROM api_access WHERE user_id = $1 AND api_name = ANY($2::text[])';
    const result = await client.query(query, [user_id, pages]);

    const accessiblePages = result.rows.map(row => row.api_name); // Get the accessible api_names

    // Build the response with true or false for each page
    const accessResult = {};
    pages.forEach(page => {
      accessResult[page] = accessiblePages.includes(page); // Check if the page is in the accessiblePages
    });

    res.json(accessResult); // Send back the result as an object
  } catch (err) {
    console.error('Error verifying access:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release(); // Release the client back to the pool
  }
});

// Get API access by user ID
router.get('/id_access', async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const client = await pool.connect(); // Explicitly connecting to the pool
  try {
    const result = await client.query('SELECT * FROM api_access WHERE user_id = $1', [id]);
    if (result.rows.length > 0) {
      res.json(result.rows); // Return all rows instead of just the first one
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    console.error('Error fetching API access:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release(); // Release the client back to the pool
  }
});

// Export the router
module.exports = router;
