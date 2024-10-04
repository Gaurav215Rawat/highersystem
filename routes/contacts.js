// routes/contact.js
const express = require('express');
const router = express.Router();
const { pool } = require('../config'); // Use the connection pool from config
const moment = require('moment');
const { authenticateToken } = require('../index');
const { checkAccess } = require('../index');

// Middleware to parse JSON bodies
router.use(express.json());

// Create a new contact
router.post('/', authenticateToken, checkAccess('create_contact'), async (req, res) => {
    const client = await pool.connect(); // Connect to the pool
    const { customer_id, contact_person, phone_num, email_id, address, city, state, country, pincode, department, designation, date_of_end, status } = req.body;
    const date_of_start = req.body.date_of_start || moment().format('YYYY-MM-DD');

    const query = `
      INSERT INTO contacts (customer_id, contact_person, phone_num, email_id, address, city, state, country, pincode, department, designation, date_of_start, date_of_end, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`;
    const values = [customer_id, contact_person, phone_num, email_id, address, city, state, country, pincode, department, designation, date_of_start, date_of_end, status];

    try {
        const result = await client.query(query, values);
        const newContact = result.rows[0];
        res.status(201).json({
            message: 'Contact created successfully',
            contact: newContact
        });
    } catch (err) {
        console.error('Error inserting contact:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release(); // Release the client back to the pool
    }
});

// Get all contacts
router.get('/', authenticateToken, checkAccess('all_contact'), async (req, res) => {
    const client = await pool.connect(); // Connect to the pool
    try {
        const result = await client.query('SELECT * FROM contacts');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching contacts:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release(); // Release the client back to the pool
    }
});

// Update a contact by ID
router.put('/:id', authenticateToken, checkAccess('update_contact'), async (req, res) => {
    const client = await pool.connect(); // Connect to the pool
    const id = req.params.id;
    const { customer_id, contact_person, phone_num, email_id, address, city, state, country, pincode, department, designation, date_of_start, date_of_end, status } = req.body;

    const query = `
      UPDATE contacts
      SET customer_id = $1, contact_person = $2, phone_num = $3, email_id = $4, address = $5, city = $6, state = $7, country = $8, pincode = $9, department = $10, designation = $11, date_of_start = $12, date_of_end = $13, status = $14, updated_at = CURRENT_TIMESTAMP
      WHERE contact_id = $15 RETURNING *`;
    const values = [customer_id, contact_person, phone_num, email_id, address, city, state, country, pincode, department, designation, date_of_start, date_of_end, status, id];

    try {
        const result = await client.query(query, values);
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: 'Contact not found' });
        }
    } catch (err) {
        console.error('Error updating contact:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release(); // Release the client back to the pool
    }
});

// Delete a contact by ID
router.delete('/:id', authenticateToken, checkAccess('delete_contact'), async (req, res) => {
    const client = await pool.connect(); // Connect to the pool
    const id = req.params.id;
    const query = 'DELETE FROM contacts WHERE contact_id = $1 RETURNING *';

    try {
        const result = await client.query(query, [id]);
        if (result.rows.length > 0) {
            res.json({ message: 'Contact deleted successfully', contact: result.rows[0] });
        } else {
            res.status(404).json({ error: 'Contact not found' });
        }
    } catch (err) {
        console.error('Error deleting contact:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release(); // Release the client back to the pool
    }
});

// Filter users
router.get('/filter', async (req, res) => {
    const client = await pool.connect(); // Connect to the pool
    try {
        const {dateFrom, dateTo, city, state, country,department } = req.body;
  
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
        
        if (department) {
            query += ` AND department >= $${queryParams.length + 1}`;
            queryParams.push(department);
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
