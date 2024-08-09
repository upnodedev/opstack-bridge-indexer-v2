import { Pool, PoolClient } from 'pg';
import { decodeOpqdata } from './decodeOpaquedata';
import { ENV } from '../constant';

const sleep = require('util').promisify(setTimeout);

export const formatSeconds = (seconds: number) => {
  // format seconds to human readable format
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours}h ${mins}m ${secs}s`;
};

// Function to handle retries with exponential backoff
export const attemptOperation = async (operation, retries = 3, delay = 100) => {
  let lastError = null;

  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      console.error(`Attempt ${i + 1}:`, err.message);
      await sleep(delay * Math.pow(2, i)); // exponential backoff
    }
  }

  throw lastError; // throw the last encountered error after retries are exhausted
};

export const attemptOperationInfinitely = async (
  operation,
  retries = 3,
  delay = 100
) => {
  let lastError = null;
  let timeShutdown = 0;

  while (true) {
    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (err) {
        lastError = err;
        console.error(`Attempt ${i + 1}:`, err.message);
        await sleep(delay * Math.pow(2, i)); // exponential backoff
      }
    }

    timeShutdown += 1;
    const retryS = timeShutdown * 60000;
    console.log(
      `Retrying in ${formatSeconds(retryS)} after ${retries} attempts.`
    );
    await sleep(retryS);
  }
};

export const insertEventWithdraw = async (db, event) => {
  const {
    l1Token,
    l2Token,
    from,
    to,
    amount,
    extraData,
    transactionHash,
    blockNumber,
    address,
  } = event;

  const client = await db.connect();

  try {
    const query = `
      INSERT INTO withdraw (
        transactionHash, 
        "from", 
        "to", 
        amount, 
        extraData, 
        blockNumber, 
        addressContract, 
        l1Token, 
        l2Token
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`;

    const value = [
      transactionHash,
      from,
      to,
      amount,
      extraData,
      blockNumber,
      address,
      l1Token,
      l2Token,
    ];

    await client.query(query, value);
  } catch (err) {
    console.error('Failed to insert event:', err);
  } finally {
    client.release();
  }
};

export const insertEventDeposit = async (db: Pool, event) => {
  const decodeOpaque = decodeOpqdata(event.opaqueData);

  const transactionHash = event.transactionHash;
  const version = event.version;
  const blockNumber = event.blockNumber;
  const addressContract = event.address;

  let amount = decodeOpaque._value;
  let from = decodeOpaque._from ?? event.from;
  let to = decodeOpaque._to ?? event.to;
  let isEth = true;
  let extraData = decodeOpaque._extraData;

  let remoteToken = null;
  let localToken = null;

  // finalBridgeEth
  if (decodeOpaque.isFinalizeBridgeETH) {
    amount = decodeOpaque._amount;
  }

  if (decodeOpaque.isFinalizeBridgeERC20) {
    remoteToken = decodeOpaque._remoteToken;
    localToken = decodeOpaque._localToken;
    amount = decodeOpaque._amount;
    isEth = false;
  }

  const client = await db.connect();

  try {
    const query = `
      INSERT INTO deposit (
        transactionHash, 
        "from", 
        "to", 
        amount,
        isEth,
        extraData,
        remoteToken,
        localToken,
        blockNumber, 
        addressContract, 
        version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`;

    const value = [
      transactionHash,
      from,
      to,
      amount,
      isEth,
      extraData,
      remoteToken,
      localToken,
      blockNumber,
      addressContract,
      version,
    ];

    await client.query(query, value);
  } catch (err) {
    console.error('Failed to insert event:', err);
  } finally {
    client.release();
  }
};

// Connect to the SQLite database
export const connectDb = () => {
  return new Pool({
    connectionString: ENV.DATABASE_URL,
  });
};

export function findRange(x: number, n: number) {
  const lowerBound = Math.floor(x / n) * n;
  const upperBound = Math.ceil(x / n) * n;

  if (x % n === 0) {
    return [lowerBound - n, upperBound];
  } else {
    return [lowerBound, upperBound];
  }
}

// Function to test the database connection
export const testConnection = async (pool: Pool): Promise<void> => {
  let client: PoolClient | undefined;
  try {
    client = await pool.connect();
    console.log('Connected to the database successfully.');
  } catch (err) {
    throw err;
  } finally {
    client?.release();
  }
};
