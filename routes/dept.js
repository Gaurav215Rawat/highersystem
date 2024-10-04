// routes/departments.js
const express = require('express');
const router = express.Router();
const { pool } = require("../config"); // Use the connection pool from config

// Middleware to parse JSON bodies
router.use(express.json());

// POST /departments - Add a new department with dept_data
router.post('/', async (req, res) => {
    const { dept_name, dept_data } = req.body;

    // Ensure department name is provided
    if (!dept_name) {
        return res.status(400).json({ error: 'Department name is required' });
    }

    const client = await pool.connect(); // Connect to the pool
    try {
        const query = 'INSERT INTO departments (dept_name, dept_data) VALUES ($1, $2) RETURNING *';
        const values = [dept_name, dept_data || null]; // If dept_data is not provided, default to null
        const result = await client.query(query, values);
        const newDepartment = result.rows[0];
        res.status(201).json({
            message: 'Department added successfully.',
            department: newDepartment,
        });
    } catch (err) {
        console.error('Error adding department:', err);
        res.status(500).json({ error: 'Internal server error',message:err });
    } finally {
        client.release(); // Release the client back to the pool
    }
});

// GET /departments - Retrieve all departments
router.get('/', async (req, res) => {
    const client = await pool.connect(); // Connect to the pool
    try {
        const result = await client.query('SELECT * FROM departments');
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error retrieving departments:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release(); // Release the client back to the pool
    }
});

// DELETE /departments - Delete a department
router.delete('/', async (req, res) => {
    const { id } = req.body; // Expecting dept_id in the request body
    if (!id) {
        return res.status(400).json({ error: 'Department ID is required' });
    }

    const client = await pool.connect(); // Connect to the pool
    const query = 'DELETE FROM departments WHERE dept_id = $1 RETURNING *';

    try {
        const result = await client.query(query, [id]);
        if (result.rows.length > 0) {
            res.json({ message: 'Department deleted successfully', department: result.rows[0] });
        } else {
            res.status(404).json({ error: 'Department not found' });
        }
    } catch (err) {
        console.error('Error deleting department:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release(); // Release the client back to the pool
    }
});



// Filter users
router.get('/filter', async (req, res) => {
    const client = await pool.connect(); // Connect to the pool
    try {
        const { dateFrom, dateTo} = req.body;

        // Build the base query
        let query = `SELECT * FROM departments WHERE 1=1`;
        const queryParams = [];

     

        if (dateFrom) {
            query += ` AND created_at >= $${queryParams.length + 1}`;
            queryParams.push(dateFrom);
        }

        if (dateTo) {
            query += ` AND created_at <= $${queryParams.length + 1}`;
            queryParams.push(dateTo);
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
