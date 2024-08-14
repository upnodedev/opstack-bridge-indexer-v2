import { Pool } from 'pg';
import { portalABI } from './abi/portalABI';
import { ENV } from './constant';
import { formatSeconds, insertEventDeposit, testConnection } from './utils';
import { publicClientL1 } from './utils/chain';
import { InvalidParamsRpcError } from 'viem';
import pool from './utils/db';
const sleep = require('util').promisify(setTimeout);

// const MAX_RETRIES = 5;
let estimateTime = 0;
const LIMIT_BLOCK = ENV.L1_LIMIT_BLOCKS ? Number(ENV.L1_LIMIT_BLOCKS) : 10000000;

async function main() {
  await testConnection(pool);

  let LIMIT = 0;

  // check limit block
  try {
    await publicClientL1.getContractEvents({
      address: ENV.L1_PORTAL_ADDRESS,
      abi: portalABI,
      eventName: 'TransactionDeposited',
      fromBlock: BigInt(0),
      toBlock: BigInt(LIMIT_BLOCK),
    });
  } catch (error) {
    if (error instanceof InvalidParamsRpcError) {
      const detail = error.details;
      // Use a regular expression to find a number followed by "block range"
      const match = detail.match(/(\d+)\s*block\s*range/i);

      if (match) {
        const blockRangeValue = parseInt(match[1], 10);
        console.log('Extracted block range value:', blockRangeValue);
        LIMIT = blockRangeValue;
      } else {
        console.log('No block range value found in the string.');
        throw error;
      }
    } else {
      throw error;
    }
  }
  await sleep(100);

  // Start both fetchEvents and startWatching in parallel
  await Promise.all([
    fetchPastEvents(BigInt(0), BigInt(LIMIT)), // Fetch past events
    fetchRealTimeEvents(BigInt(LIMIT)), // Start watching for real-time events
  ]);
}

async function getLastProcessedRealTimeBlock() {
  const res = await pool.query(
    'SELECT last_block FROM real_time_tracker_deposit ORDER BY id DESC LIMIT 1'
  );
  return res.rows.length > 0 ? BigInt(res.rows[0].last_block) : null;
}

async function saveLastProcessedRealTimeBlock(blockNumber) {
  await pool.query(
    'INSERT INTO real_time_tracker_deposit (last_block) VALUES ($1)',
    [blockNumber.toString()]
  );
}

async function getLastProcessedPastBlock() {
  const res = await pool.query(
    'SELECT last_block FROM past_event_tracker_deposit ORDER BY id DESC LIMIT 1'
  );
  return res.rows.length > 0 ? BigInt(res.rows[0].last_block) : null;
}

async function saveLastProcessedPastBlock(blockNumber) {
  await pool.query(
    'INSERT INTO past_event_tracker_deposit (last_block) VALUES ($1)',
    [blockNumber.toString()]
  );
}

async function getEventsLogs(fromBlock: bigint, toBlock: bigint) {
  // get Logs
  const logs = await publicClientL1.getContractEvents({
    address: ENV.L1_PORTAL_ADDRESS,
    abi: portalABI,
    eventName: 'TransactionDeposited',
    fromBlock,
    toBlock,
  });

  for (const log of logs) {
    const { from, to, version, opaqueData } = log.args;
    const { transactionHash, address, blockNumber } = log;
    const event = {
      from,
      to,
      version: version.toString(),
      opaqueData,
      transactionHash,
      address,
      blockNumber: +blockNumber.toString(),
    };

    // console.log(event);

    try {
      await insertEventDeposit(pool, event);
      // console.log(`Event inserted successfully hash : ${transactionHash}`);
    } catch (err) {
      // console.error('Error inserting event deposit:', err);
    }
  }
}

async function fetchRealTimeEvents(BLOCK_STEP: bigint) {
  try {
    let lastProcessedBlock = await getLastProcessedRealTimeBlock();

    if (lastProcessedBlock === null) {
      lastProcessedBlock = await publicClientL1.getBlockNumber();
    }

    while (true) {
      const currentBlock = await publicClientL1.getBlockNumber();

      while (lastProcessedBlock < currentBlock) {
        const fromBlock = lastProcessedBlock + 1n;
        const toBlock = fromBlock + BLOCK_STEP - 1n;
        const toBlockmin = toBlock < currentBlock ? toBlock : currentBlock;

        console.log(
          `Fetching real-time events from block ${fromBlock} to ${toBlockmin}`
        );

        await getEventsLogs(fromBlock, toBlockmin);

        lastProcessedBlock = toBlockmin;
        await saveLastProcessedRealTimeBlock(lastProcessedBlock);
        console.log(
          `Processed and saved real-time events up to block ${lastProcessedBlock}`
        );
      }

      // Wait for a minute before checking again
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  } catch (error) {
    console.error('Error in fetchRealTimeEvents:', error);
  }
}

// Function to fetch past events
async function fetchPastEvents(finalBlock: bigint, BLOCK_STEP: bigint) {
  try {
    let currentBlock = await publicClientL1.getBlockNumber();
    let fromBlock = await getLastProcessedPastBlock();

    if (fromBlock === null || fromBlock > currentBlock) {
      fromBlock = currentBlock;
    }

    while (fromBlock > finalBlock) {
      const startTime = Date.now();
      const toBlock = fromBlock;
      fromBlock =
        fromBlock - BLOCK_STEP > finalBlock
          ? fromBlock - BLOCK_STEP
          : finalBlock;

      console.log(`Fetching past events from block ${fromBlock} to ${toBlock}`);

      await getEventsLogs(
        fromBlock,
        toBlock < currentBlock ? toBlock : currentBlock
      );

      await saveLastProcessedPastBlock(toBlock);

      // Update current block in case it's changed
      currentBlock = await publicClientL1.getBlockNumber();
      const endTime = Date.now();

      // Estimate time to process the next batch
      const timeDiff = endTime - startTime;

      // estimate time to finalBlock
      const estimateTimeToFinalBlock =
        (BigInt(timeDiff) * (fromBlock - finalBlock)) / BLOCK_STEP;

      console.log(
        `Processed and saved past events up to block ${toBlock} , estimate time : ${formatSeconds(
          Number(estimateTimeToFinalBlock)
        )}`
      );
    }

    console.log(`fetchPastEvents: All past events processed.`);
  } catch (error) {
    console.error('Error in fetchPastEvents:', error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
