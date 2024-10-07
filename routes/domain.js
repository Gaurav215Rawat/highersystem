// routes/domain.js
const express = require('express');
const router = express.Router();
const { pool } = require("../config");

router.use(express.json());

// POST /domain - Add a new domain
router.post('/', async (req, res) => {
    const { domain_name, description } = req.body;

    if (!domain_name) {
        return res.status(400).json({ error: 'Domain name is required' });
    }

    const client = await pool.connect();
    try {
        const query = 'INSERT INTO domain (domain_name, description) VALUES ($1, $2) RETURNING *';
        const values = [domain_name, description || null];
        const result = await client.query(query, values);
        res.status(201).json({
            message: 'Domain added successfully.',
            domain: result.rows[0],
        });
    } catch (err) {
        console.error('Error adding domain:', err);
        res.status(500).json({ error: 'Internal server error', message: err });
    } finally {
        client.release();
    }
});

// GET /domain - Retrieve all domains
router.get('/', async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM domain');
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error retrieving domains:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

// DELETE /domain - Delete a domain
router.delete('/', async (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ error: 'Domain ID is required' });
    }

    const client = await pool.connect();
    try {
        const result = await client.query('DELETE FROM domain WHERE dom_id = $1 RETURNING *', [id]);
        if (result.rows.length > 0) {
            res.json({ message: 'Domain deleted successfully', domain: result.rows[0] });
        } else {
            res.status(404).json({ error: 'Domain not found' });
        }
    } catch (err) {
        console.error('Error deleting domain:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

module.exports = router;
