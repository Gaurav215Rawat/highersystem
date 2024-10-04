const express = require('express');
const router = express.Router();
const { pool } = require('../config'); // Import the pool from config
const bcrypt = require('bcryptjs');
const { authenticateToken } = require('../index');

// Middleware to parse JSON bodies
router.use(express.json());

// Get all users
router.get('/', async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM users');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release(); // Release the client back to the pool
    }
});

// Get all users excluding superadmin
router.get('/getusers', async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM users WHERE email <> \'superadmin@gmail.com\'');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release(); // Release the client back to the pool
    }
});

// Get user emails
router.get('/email_users', async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT email, user_id FROM users');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release(); // Release the client back to the pool
    }
});

// Route for updating the password (only superadmin can update, but not their own password)
router.put('/update-password', authenticateToken, async (req, res) => {
    const { email, newPassword } = req.body;
    const { email: requesterEmail } = req.user; // Email of the user making the request

    const client = await pool.connect(); // Connect to the pool
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
    } finally {
        client.release(); // Release the client back to the pool
    }
});

// Filter users
router.get('/filter', async (req, res) => {
    const client = await pool.connect(); // Connect to the pool
    try {
        const { user_id, email, first_name, last_name, phone_no, dateFrom, dateTo, user_status, dept_name, location } = req.body;

        // Build the base query
        let query = `SELECT * FROM users WHERE 1=1`;
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
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release(); // Release the client back to the pool
    }
});

// Delete a user
router.delete('/', async (req, res) => {
    const client = await pool.connect(); // Connect to the pool
    const { id } = req.body; // Extract user_id from the request body
    const query = 'DELETE FROM users WHERE user_id = $1 RETURNING *';

    try {
        const result = await client.query(query, [id]);
        if (result.rows.length > 0) {
            res.json({ message: 'Deleted successfully', user: result.rows[0] });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release(); // Release the client back to the pool
    }
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
  

// Export the router
module.exports = router;
