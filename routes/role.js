// routes/role.js
const express = require('express');
const router = express.Router();
const { pool } = require("../config");

router.use(express.json());

// POST /role - Add a new role
router.post('/', async (req, res) => {
    const { role, description, access } = req.body;

    if (!role) {
        return res.status(400).json({ error: 'Role is required' });
    }

    const client = await pool.connect();
    try {
        const query = 'INSERT INTO role (role, description, access) VALUES ($1, $2, $3) RETURNING *';
        const values = [role, description || null, access || null];
        const result = await client.query(query, values);
        res.status(201).json({
            message: 'Role added successfully.',
            role: result.rows[0],
        });
    } catch (err) {
        console.error('Error adding role:', err);
        res.status(500).json({ error: 'Internal server error', message: err });
    } finally {
        client.release();
    }
});

// GET /role - Retrieve all roles
router.get('/', async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM role');
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error retrieving roles:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

// DELETE /role - Delete a role
router.delete('/', async (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ error: 'Role ID is required' });
    }

    const client = await pool.connect();
    try {
        const result = await client.query('DELETE FROM role WHERE role_id = $1 RETURNING *', [id]);
        if (result.rows.length > 0) {
            res.json({ message: 'Role deleted successfully', role: result.rows[0] });
        } else {
            res.status(404).json({ error: 'Role not found' });
        }
    } catch (err) {
        console.error('Error deleting role:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

module.exports = router;
