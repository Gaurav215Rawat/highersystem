// routes/designation.js
const express = require('express');
const router = express.Router();
const { pool } = require("../config"); // Use the connection pool from config

// Middleware to parse JSON bodies
router.use(express.json());

// POST /designation - Add a new designation
router.post('/', async (req, res) => {
    const { designation, description } = req.body;

    // Ensure designation name is provided
    if (!designation) {
        return res.status(400).json({ error: 'Designation is required' });
    }

    const client = await pool.connect();
    try {
        const query = 'INSERT INTO designation (designation, description) VALUES ($1, $2) RETURNING *';
        const values = [designation, description || null];
        const result = await client.query(query, values);
        res.status(201).json({
            message: 'Designation added successfully.',
            designation: result.rows[0],
        });
    } catch (err) {
        console.error('Error adding designation:', err);
        res.status(500).json({ error: 'Internal server error', message: err });
    } finally {
        client.release();
    }
});

// GET /designation - Retrieve all designations
router.get('/', async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM designation');
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error retrieving designations:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

// DELETE /designation - Delete a designation
router.delete('/', async (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ error: 'Designation ID is required' });
    }

    const client = await pool.connect();
    try {
        const result = await client.query('DELETE FROM designation WHERE desg_id = $1 RETURNING *', [id]);
        if (result.rows.length > 0) {
            res.json({ message: 'Designation deleted successfully', designation: result.rows[0] });
        } else {
            res.status(404).json({ error: 'Designation not found' });
        }
    } catch (err) {
        console.error('Error deleting designation:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

module.exports = router;
