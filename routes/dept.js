const express = require('express');
const router = express.Router();
const { Client } = require('pg');

// PostgreSQL database connection configuration
const client = new Client(config.database);

// Middleware to parse JSON bodies
router.use(express.json());


// POST /departments - Add a new department with dept_data
router.post('/departments', async (req, res) => {
    const { dept_name, dept_data } = req.body;
  
    // Ensure department name is provided
    if (!dept_name) {
      return res.status(400).json({ error: 'Department name is required' });
    }
  
    try {
      const query = 'INSERT INTO departments (dept_name, dept_data) VALUES ($1, $2) RETURNING *';
      const values = [dept_name, dept_data || null];  // If dept_data is not provided, default to null
      const result = await client.query(query, values);
      const newDepartment = result.rows[0];
      res.status(201).json({
        message: 'Department added successfully.',
        department: newDepartment,
      });
    } catch (err) {
      console.error('Error adding department:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // GET /departments - Retrieve all departments including dept_data
  router.get('/departments', async (req, res) => {
    try {
      const result = await client.query('SELECT * FROM departments');
      res.status(200).json(result.rows);
    } catch (err) {
      console.error('Error retrieving departments:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  
  // GET /departments - Retrieve all departments
  router.get('/departments', async (req, res) => {
    try {
      const result = await client.query('SELECT * FROM departments');
      res.status(200).json(result.rows);
    } catch (err) {
      console.error('Error retrieving departments:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Delete 
  router.delete('/departments',(req, res) => {
    const {id} = req.body;
    const query = 'DELETE FROM departments WHERE dept_id = $1 RETURNING *';
    client.query(query, [id])
      .then(result => {
        if (result.rows.length > 0) {
          res.json({ message: 'deleted successfully', customer: result.rows[0] });
        } else {
          res.status(404).json({ error: 'Department not found' });
        }
      })
      .catch(err => {
        console.error('Error deleting :', err);
        res.status(500).json({ error: 'Internal server error' });
      });
  });
  

// Export the router
module.exports = router;
