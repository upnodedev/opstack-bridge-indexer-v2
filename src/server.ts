// src/app.ts

import express, { Request, Response } from 'express';
import cors from 'cors';
import { ENV } from './constant';
import { testConnection } from './utils';
import { Pool } from 'pg';
import pool from './utils/db';

// Create express app
const app = express();
const PORT = ENV.PORT || 3000;

app.use(express.json());

// Define your CORS options
const corsOptions = {
  origin: '*', // Allow all origins
  methods: 'GET', // Allow only GET requests
  allowedHeaders: ['Content-Type', 'Authorization'], // Specify the allowed headers
};

// Use the CORS middleware with the options
app.use(cors(corsOptions));

app.get('/transactions', async (req: Request, res: Response) => {
  try {
    const address = req.query.address as string;

    if (!address) {
      return res.status(400).json({ error: 'Invalid address' });
    }

    let baseQuery = `
      FROM transactions t
      LEFT JOIN prove_transactions pt ON t.withdrawalHash = pt.withdrawalHash
      LEFT JOIN finalize_transactions ft ON t.withdrawalHash = ft.withdrawalHash
    `;
    
    const params: (string | number)[] = [];

    baseQuery += ' WHERE t."sender" = $1 OR t."receiver" = $1';
    params.push(address);

    // Get total count of transactions
    const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
    const countResult = await pool.query(countQuery, params);

    const totalCount = countResult.rows[0].total;

    // Get the transactions with the joined data
    const transactionsQuery = `
      SELECT 
        t.*, 
        pt.transactionHash AS proveTransactionHash, 
        pt.blockNumber AS proveBlockNumber, 
        pt.created_at AS proveCreatedAt,
        pt.blockTimestamp AS proveBlockTimestamp,
        ft.transactionHash AS finalizeTransactionHash, 
        ft.blockNumber AS finalizeBlockNumber, 
        ft.created_at AS finalizeCreatedAt,
        ft.blockTimestamp AS finalizeBlockTimestamp
      ${baseQuery}
      ORDER BY t.blockNumber DESC
    `;
    
    const transactionsResult = await pool.query(transactionsQuery, params);

    console.log(transactionsResult.rows);

    // Transform the result to include prove and finalize as nested objects
    const transactions = transactionsResult.rows.map(row => ({
      transactionHash: row.transactionhash,
      sender: row.sender,
      receiver: row.receiver,
      amount: row.amount,
      isEth: row.iseth,
      extraData: row.extradata,
      remoteToken: row.remotetoken,
      localToken: row.localtoken,
      blockNumber: row.blocknumber,
      addressContract: row.addresscontract,
      version: row.version,
      transactionType: row.transactiontype,
      blockTimestamp: row.blocktimestamp,
      prove: row.provetransactionhash ? {
        transactionHash: row.provetransactionhash,
        blockNumber: row.proveblocknumber,
        createdAt: row.provecreatedat,
        blockTimestamp: row.proveblocktimestamp
      } : null,
      finalize: row.finalizetransactionhash ? {
        transactionHash: row.finalizetransactionhash,
        blockNumber: row.finalizeblocknumber,
        createdAt: row.finalizecreatedat,
        blockTimestamp: row.finalizeblocktimestamp
      } : null
    }));

    res.json({ totalCount, transactions });
  } catch (err) {
    console.error(err);
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
