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
app.get('/transactions', async (req: Request, res: Response) => {
  try {
    const address = req.query.address as string;

    if (!address) {
      return res.status(400).json({ error: 'Invalid address' });
    }

    let baseQuery = 'FROM transactions';
    const params: (string | number)[] = [];

    baseQuery += ' WHERE "sender" = $1 OR "receiver" = $1';
    params.push(address);

    // write me get total count of transactions and return transactions

    const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
    const countResult = await pool.query(countQuery, params);

    const totalCount = countResult.rows[0].total;

    const transactions = await pool.query(
      `SELECT * ${baseQuery} ORDER BY blocknumber DESC`,
      params
    );

    res.json({ totalCount, transactions: transactions.rows });
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
