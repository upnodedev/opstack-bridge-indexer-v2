// src/app.ts

import express, { Request, Response } from 'express';
import cors from 'cors';
import { ENV } from './constant';
import { testConnection } from './utils';
import { Pool } from 'pg';
import pool from './utils/db';

// Create express app
const app = express();
const PORT = 3000 || ENV.PORT;

app.use(express.json());

// Define your CORS options
const corsOptions = {
  origin: '*', // Allow all origins
  methods: 'GET', // Allow only GET requests
  allowedHeaders: ['Content-Type', 'Authorization'], // Specify the allowed headers
};

// Use the CORS middleware with the options
app.use(cors(corsOptions));

// Endpoint to fetch data with cursor and optional filter
// prevent SQL injection
// Function to query deposits
app.get('/deposit', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10; // Number of records per page
    const page = parseInt(req.query.page as string) || 1; // Current page number
    const sender = (req.query.sender as string) || '';
    const receiver = (req.query.receiver as string) || '';

    // Validate page and limit values
    if (page < 1 || limit < 1) {
      return res.status(400).json({ error: 'Page and limit must be positive numbers' });
    }

    let baseQuery = 'FROM deposit';
    const params: (string | number)[] = [];

    if (sender && receiver) {
      baseQuery += ' WHERE "sender" = $1 OR "receiver" = $2';
      params.push(sender, receiver);
    } else if (sender) {
      baseQuery += ' WHERE "sender" = $1';
      params.push(sender);
    } else if (receiver) {
      baseQuery += ' WHERE "receiver" = $1';
      params.push(receiver);
    }

    // Get the total number of items
    const totalItemsQuery = `SELECT COUNT(*) AS totalItems ${baseQuery}`;
    const totalItemsResult = await pool.query(totalItemsQuery, params);
    const totalItems = parseInt(totalItemsResult.rows[0].totalitems, 10);

    // Calculate total pages
    const totalPages = Math.ceil(totalItems / limit);
    const offset = (page - 1) * limit;

    // Fetch the items for the current page
    const dataQuery = `SELECT * ${baseQuery} ORDER BY blockNumber DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    const dataResult = await pool.query(dataQuery, params);

    res.json({
      totalItems,
      totalPages,
      currentPage: page,
      items: dataResult.rows,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/withdrawal', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10; // Number of records per page
    const page = parseInt(req.query.page as string) || 1; // Current page number
    const sender = (req.query.sender as string) || '';
    const receiver = (req.query.receiver as string) || '';

    // Validate page and limit values
    if (page < 1 || limit < 1) {
      return res.status(400).json({ error: 'Page and limit must be positive numbers' });
    }

    let baseQuery = 'FROM withdrawal';
    const params: (string | number)[] = [];

    if (sender && receiver) {
      baseQuery += ' WHERE "sender" = $1 OR "receiver" = $2';
      params.push(sender, receiver);
    } else if (sender) {
      baseQuery += ' WHERE "sender" = $1';
      params.push(sender);
    } else if (receiver) {
      baseQuery += ' WHERE "receiver" = $1';
      params.push(receiver);
    }

    // Get the total number of items
    const totalItemsQuery = `SELECT COUNT(*) AS totalItems ${baseQuery}`;
    const totalItemsResult = await pool.query(totalItemsQuery, params);
    const totalItems = parseInt(totalItemsResult.rows[0].totalitems, 10);

    // Calculate total pages
    const totalPages = Math.ceil(totalItems / limit);
    const offset = (page - 1) * limit;

    // Fetch the items for the current page
    const dataQuery = `SELECT * ${baseQuery} ORDER BY blockNumber DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    const dataResult = await pool.query(dataQuery, params);

    res.json({
      totalItems,
      totalPages,
      currentPage: page,
      items: dataResult.rows,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  pool.end(() => {
    console.log('Database pool has ended');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  pool.end(() => {
    console.log('Database pool has ended');
    process.exit(0);
  });
});

app.listen(PORT, async () => {
  await testConnection(pool);
  console.log(`Server running on http://localhost:${PORT}`);
});
