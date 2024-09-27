const express = require('express');
const router = express.Router();
const { Client } = require('pg');
const moment = require('moment');
const config = require('../config');
const { authenticateToken } = require('../index');
const { checkAccess } = require('../index');

const client = new Client(config.database);

// Middleware to parse JSON bodies
router.use(express.json());

// Create a new contact
router.post('/contacts', authenticateToken, checkAccess('create_contact'), (req, res) => {
    const { customer_id, contact_person, phone_num, email_id, address, city, state, country, pincode, department, designation, date_of_end, status } = req.body;
    const date_of_start = req.body.date_of_start || moment().format('YYYY-MM-DD');

    const query = `
      INSERT INTO contacts (customer_id, contact_person, phone_num, email_id, address, city, state, country, pincode, department, designation, date_of_start, date_of_end, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`;
    const values = [customer_id, contact_person, phone_num, email_id, address, city, state, country, pincode, department, designation, date_of_start, date_of_end, status];

    client.query(query, values)
        .then(result => {
            const newContact = result.rows[0];
            res.status(201).json({
                message: 'Contact created successfully',
                contact: newContact
            });
        })
        .catch(err => {
            console.error('Error inserting contact:', err);
            res.status(500).json({ error: 'Internal server error' });
        });
});

// Get all contacts
router.get('/all-contacts', authenticateToken, checkAccess('all_contact'), (req, res) => {
    client.query('SELECT * FROM contacts')
        .then(result => res.json(result.rows))
        .catch(err => {
            console.error('Error fetching contacts:', err);
            res.status(500).json({ error: 'Internal server error' });
        });
});

// Update a contact by ID
router.put('/contacts/:id', authenticateToken, checkAccess('update_contact'), (req, res) => {
    const id = req.params.id;
    const { customer_id, contact_person, phone_num, email_id, address, city, state, country, pincode, department, designation, date_of_start, date_of_end, status } = req.body;

    const query = `
      UPDATE contacts
      SET customer_id = $1, contact_person = $2, phone_num = $3, email_id = $4, address = $5, city = $6, state = $7, country = $8, pincode = $9, department = $10, designation = $11, date_of_start = $12, date_of_end = $13, status = $14, updated_at = CURRENT_TIMESTAMP
      WHERE contact_id = $15 RETURNING *`;
    const values = [customer_id, contact_person, phone_num, email_id, address, city, state, country, pincode, department, designation, date_of_start, date_of_end, status, id];

    client.query(query, values)
        .then(result => {
            if (result.rows.length > 0) {
                res.json(result.rows[0]);
            } else {
                res.status(404).json({ error: 'Contact not found' });
            }
        })
        .catch(err => {
            console.error('Error updating contact:', err);
            res.status(500).json({ error: 'Internal server error' });
        });
});

// Delete a contact by ID
router.delete('/contacts/:id', authenticateToken, checkAccess('delete_contact'), (req, res) => {
    const id = req.params.id;
    const query = 'DELETE FROM contacts WHERE contact_id = $1 RETURNING *';

    client.query(query, [id])
        .then(result => {
            if (result.rows.length > 0) {
                res.json({ message: 'Contact deleted successfully', contact: result.rows[0] });
            } else {
                res.status(404).json({ error: 'Contact not found' });
            }
        })
        .catch(err => {
            console.error('Error deleting contact:', err);
            res.status(500).json({ error: 'Internal server error' });
        });
});

// Export the router
module.exports = router;
