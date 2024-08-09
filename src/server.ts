// src/app.ts

import express, { Request, Response } from 'express';
import cors from 'cors';
import { ENV } from './constant';
import { connectDb, testConnection } from './utils';
import { Pool } from 'pg';

// Create express app
const app = express();
const PORT = 3000 || ENV.PORT;

app.use(express.json());

const db = new Pool({
  connectionString: ENV.DATABASE_URL,
});

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
    const client = await db.connect();
    const limit = parseInt(req.query.limit as string) || 10; // Validate and default to 10 if invalid
    const from = (req.query.from as string) || '';
    const to = (req.query.to as string) || '';

    let query = 'SELECT * FROM deposit';
    const params: (string | number)[] = [];

    if (from && to) {
      query += ' WHERE "from" = $1 AND "to" = $2';
      params.push(from, to);
    } else if (from) {
      query += ' WHERE "from" = $1';
      params.push(from);
    } else if (to) {
      query += ' WHERE "to" = $1';
      params.push(to);
    }

    query += ' ORDER BY blockNumber DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await client.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  } finally {
    await db.end(); // Ensure the client is released
  }
});

app.get('/withdrawal', async (req: Request, res: Response) => {
  try {
    const client = await db.connect();
    const limit = parseInt(req.query.limit as string) || 10; // Validate and default to 10 if invalid
    const from = (req.query.from as string) || '';
    const to = (req.query.to as string) || '';

    let query = 'SELECT * FROM withdrawal';
    const params: (string | number)[] = [];

    if (from && to) {
      query += ' WHERE "from" = $1 AND "to" = $2';
      params.push(from, to);
    } else if (from) {
      query += ' WHERE "from" = $1';
      params.push(from);
    } else if (to) {
      query += ' WHERE "to" = $1';
      params.push(to);
    }

    query += ' ORDER BY blockNumber DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await client.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  } finally {
    await db.end(); // Ensure the client is released
  }
});

app.listen(PORT, async () => {
  console.log(ENV.DATABASE_URL)
  await testConnection(db);
  console.log(`Server running on http://localhost:${PORT}`);
});
