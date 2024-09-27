const express = require('express');
const router = express.Router();
const { Client } = require('pg');

// Middleware to parse JSON bodies
router.use(express.json());

// Add a new department
router.post('/departments', (req, res) => {
    const { dept_data } = req.body;

    const query = 'INSERT INTO departments (dept_name) VALUES ($1) RETURNING *';
    client.query(query, [dept_data])
        .then(result => {
            res.status(201).json({
                message: 'Department added successfully',
                department: result.rows[0],
            });
        })
        .catch(err => {
            console.error('Error adding department:', err);
            res.status(500).json({ error: 'Internal server error' });
        });
});

// Get all departments
router.get('/departments', (req, res) => {
    client.query('SELECT * FROM departments')
        .then(result => res.json(result.rows))
        .catch(err => {
            console.error('Error fetching departments:', err);
            res.status(500).json({ error: 'Internal server error' });
        });
});

// Delete a department by ID
router.delete('/departments', (req, res) => {
    const { dept_id } = req.body;

    const query = 'DELETE FROM departments WHERE dept_id = $1 RETURNING *';
    client.query(query, [dept_id])
        .then(result => {
            if (result.rows.length > 0) {
                res.json({ message: 'Department deleted successfully', department: result.rows[0] });
            } else {
                res.status(404).json({ error: 'Department not found' });
            }
        })
        .catch(err => {
            console.error('Error deleting department:', err);
            res.status(500).json({ error: 'Internal server error' });
        });
});

// Export the router
module.exports = router;
