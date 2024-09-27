const express = require('express');
const router = express.Router();
const { Client } = require('pg');
const config = require('../config');

const client = new Client(config.database);

// Middleware to parse JSON bodies
router.use(express.json());


// Create a new customer
router.post('/customers',authenticateToken,  checkAccess('create_customer'),(req, res) => {
    const { customer_name, gst_number, landline_num, email_id, pan_no, tan_number, address, city, state, country, pincode } = req.body;
  
    const query = `
      INSERT INTO customers (customer_name, gst_number, landline_num, email_id, pan_no, tan_number, address, city, state, country, pincode) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`;
    const values = [customer_name, gst_number, landline_num, email_id, pan_no, tan_number, address, city, state, country, pincode];
  
    client.query(query, values)
      .then(result => {
        const newCustomer = result.rows[0];
        res.status(201).json({
          message: 'Customer created successfully',
          customer: newCustomer
        });
      })
      .catch(err => {
        console.error('Error inserting customer:', err);
        res.status(500).json({ error: 'Internal server error' });
      });
  });
  
  // Get all customers (use authenticateToken before checkRole)
  router.get('/all-customers', authenticateToken, checkAccess('all_customer'), (req, res) => {
    client.query('SELECT * FROM customers')
      .then(result => res.json(result.rows))
      .catch(err => {
        console.error('Error fetching customers:', err);
        res.status(500).json({ error: 'Internal server error' });
      });
  });
  
  // Update a customer by ID
  router.put('/customers/:id', authenticateToken,checkAccess('update_customer'), (req, res) => {
    const id = req.params.id;
    const { customer_name, gst_number, landline_num, email_id, pan_no, tan_number, address, city, state, country, pincode } = req.body;
  
    const query = `
      UPDATE customers
      SET customer_name = $1, gst_number = $2, landline_num = $3, email_id = $4, pan_no = $5, tan_number = $6, address = $7, city = $8, state = $9, country = $10, pincode = $11, updated_at = CURRENT_TIMESTAMP
      WHERE customer_id = $12 RETURNING *`;
    const values = [customer_name, gst_number, landline_num, email_id, pan_no, tan_number, address, city, state, country, pincode, id];
  
    client.query(query, values)
      .then(result => {
        if (result.rows.length > 0) {
          res.json(result.rows[0]);
        } else {
          res.status(404).json({ error: 'Customer not found' });
        }
      })
      .catch(err => {
        console.error('Error updating customer:', err);
        res.status(500).json({ error: 'Internal server error' });
      });
  });
  
  // Delete a customer by ID
  router.delete('/customers/:id',authenticateToken, checkAccess('delete_customer'), (req, res) => {
    const id = req.params.id;
    const query = 'DELETE FROM customers WHERE customer_id = $1 RETURNING *';
    client.query(query, [id])
      .then(result => {
        if (result.rows.length > 0) {
          res.json({ message: 'Customer deleted successfully', customer: result.rows[0] });
        } else {
          res.status(404).json({ error: 'Customer not found' });
        }
      })
      .catch(err => {
        console.error('Error deleting customer:', err);
        res.status(500).json({ error: 'Internal server error' });
      });
  });
  

  // Export the router
module.exports = router;