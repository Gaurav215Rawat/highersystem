const express = require('express');
const router = express.Router();
const { pool } = require('../config'); // Use the connection pool from config
const { authenticateToken } = require('../index');
const { checkAccess } = require('../index');

// Middleware to parse JSON bodies
router.use(express.json());

// Create a new customer
router.post('/', authenticateToken, checkAccess('create_customer'), async (req, res) => {
    const client = await pool.connect(); // Connect to the pool
    const { customer_name, gst_number, landline_num, email_id, pan_no, tan_number, address, city, state, country, pincode } = req.body;

    const query = `
      INSERT INTO customers (customer_name, gst_number, landline_num, email_id, pan_no, tan_number, address, city, state, country, pincode) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`;
    const values = [customer_name, gst_number, landline_num, email_id, pan_no, tan_number, address, city, state, country, pincode];

    try {
        const result = await client.query(query, values);
        const newCustomer = result.rows[0];
        res.status(201).json({
            message: 'Customer created successfully',
            customer: newCustomer
        });
    } catch (err) {
        console.error('Error inserting customer:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release(); // Release the client back to the pool
    }
});

// Get all customers
router.get('/', authenticateToken, checkAccess('all_customer'), async (req, res) => {
    const client = await pool.connect(); // Connect to the pool
    try {
        const result = await client.query('SELECT * FROM customers');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching customers:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release(); // Release the client back to the pool
    }
});

// Update a customer by ID
router.put('/:id', authenticateToken, checkAccess('update_customer'), async (req, res) => {
    const client = await pool.connect(); // Connect to the pool
    const id = req.params.id;
    const { customer_name, gst_number, landline_num, email_id, pan_no, tan_number, address, city, state, country, pincode } = req.body;

    const query = `
      UPDATE customers
      SET customer_name = $1, gst_number = $2, landline_num = $3, email_id = $4, pan_no = $5, tan_number = $6, address = $7, city = $8, state = $9, country = $10, pincode = $11, updated_at = CURRENT_TIMESTAMP
      WHERE customer_id = $12 RETURNING *`;
    const values = [customer_name, gst_number, landline_num, email_id, pan_no, tan_number, address, city, state, country, pincode, id];

    try {
        const result = await client.query(query, values);
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: 'Customer not found' });
        }
    } catch (err) {
        console.error('Error updating customer:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release(); // Release the client back to the pool
    }
});

// Delete a customer by ID
router.delete('/:id', authenticateToken, checkAccess('delete_customer'), async (req, res) => {
    const client = await pool.connect(); // Connect to the pool
    const id = req.params.id;
    const query = 'DELETE FROM customers WHERE customer_id = $1 RETURNING *';

    try {
        const result = await client.query(query, [id]);
        if (result.rows.length > 0) {
            res.json({ message: 'Customer deleted successfully', customer: result.rows[0] });
        } else {
            res.status(404).json({ error: 'Customer not found' });
        }
    } catch (err) {
        console.error('Error deleting customer:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release(); // Release the client back to the pool
    }
});


// Filter users
router.get('/filter', async (req, res) => {
    const client = await pool.connect(); // Connect to the pool
    try {
        const {dateFrom, dateTo, city, state, country } = req.body;
  
        // Build the base query
        let query = `SELECT * FROM customers WHERE 1=1`;
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

// Export the router
module.exports = router;
