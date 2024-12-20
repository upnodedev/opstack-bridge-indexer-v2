import { Pool } from 'pg';
import { portalABI } from './abi/portalABI';
import { ENV } from './constant';
import {
  formatSeconds,
  getTracker,
  insertEventDeposit,
  updateTracker,
  testConnection,
  insertEventWithdrawProve,
  insertEventWithdrawFinalize,
} from './utils';
import { publicClientL1 } from './utils/chain';
import { InvalidParamsRpcError } from 'viem';
import pool from './utils/db';
import { getL2TransactionHash } from 'viem/op-stack';
const sleep = require('util').promisify(setTimeout);

// const MAX_RETRIES = 5;
let estimateTime = 0;
const LIMIT_BLOCK = ENV.L1_LIMIT_BLOCKS
  ? Number(ENV.L1_LIMIT_BLOCKS)
  : 10000000;

async function main() {
  console.log(
    `Deposit indexer started ${ENV.L1_PORTAL_ADDRESS} block ${ENV.L1_PORTAL_BLOCK_CREATED} - ${LIMIT_BLOCK}`
  );
  await testConnection(pool);

  let LIMIT = LIMIT_BLOCK;

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
    LIMIT = 1000;
  }
  await sleep(100);

  // Start both fetchEvents and startWatching in parallel
  await Promise.all([
    fetchPastEvents(BigInt(ENV.L1_PORTAL_BLOCK_CREATED), BigInt(LIMIT)), // Fetch past events
    fetchRealTimeEvents(BigInt(LIMIT)), // Start watching for real-time events
  ]);
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
    const block = await publicClientL1.getBlock({
      blockNumber: BigInt(blockNumber),
    });
    const l2TransactionHash = getL2TransactionHash({ log });

    const blockTimestamp = block.timestamp * 1000n;
    const event = {
      from,
      to,
      version: version.toString(),
      opaqueData,
      transactionHash,
      address,
      blockNumber: +blockNumber.toString(),
      blockTimestamp: +blockTimestamp.toString(),
      l2TransactionHash,
    };

    // console.log(event);

    try {
      await insertEventDeposit(pool, event);
      await sleep(10);
      // console.log(`Event inserted successfully hash : ${transactionHash}`);
    } catch (err) {
      // console.error('Error inserting event deposit:', err);
    }
  }
}

async function getEventProveLogs(fromBlock: bigint, toBlock: bigint) {
  // get Logs
  const logs = await publicClientL1.getContractEvents({
    address: ENV.L1_PORTAL_ADDRESS,
    abi: portalABI,
    eventName: 'WithdrawalProven',
    fromBlock,
    toBlock,
  });

  for (const log of logs) {
    const { withdrawalHash } = log.args;
    const { transactionHash, blockNumber } = log;

    const block = await publicClientL1.getBlock({
      blockNumber: BigInt(blockNumber),
    });
    const blockTimestamp = block.timestamp * 1000n;

    const event = {
      transactionHash,
      withdrawalHash,
      blockNumber,
      blockTimestamp: +blockTimestamp.toString(),
    };

    try {
      await insertEventWithdrawProve(pool, event);
      await sleep(10);
      // console.log(`Event inserted successfully hash : ${transactionHash}`);
    } catch (err) {
      // console.error('Error inserting event deposit:', err);
    }
  }
}

async function getEventFinalizeLogs(fromBlock: bigint, toBlock: bigint) {
  // get Logs
  const logs = await publicClientL1.getContractEvents({
    address: ENV.L1_PORTAL_ADDRESS,
    abi: portalABI,
    eventName: 'WithdrawalFinalized',
    fromBlock,
    toBlock,
  });

  for (const log of logs) {
    const { withdrawalHash } = log.args;
    const { transactionHash, blockNumber } = log;
    const block = await publicClientL1.getBlock({
      blockNumber: BigInt(blockNumber),
    });
    const blockTimestamp = block.timestamp * 1000n;

    // console.log(event);

    const event = {
      transactionHash,
      withdrawalHash,
      blockNumber,
      blockTimestamp: +blockTimestamp.toString(),
    };

    try {
      await insertEventWithdrawFinalize(pool, event);
      await sleep(10);
      // console.log(`Event inserted successfully hash : ${transactionHash}`);
    } catch (err) {
      // console.error('Error inserting event deposit:', err);
    }
  }
}

async function fetchRealTimeEvents(BLOCK_STEP: bigint) {
  try {
    let lastProcessedBlock = await getTracker(pool, 'real_time_deposit');
    console.log('lastProcessedBlock', lastProcessedBlock);

    if (lastProcessedBlock === null) {
      lastProcessedBlock = await publicClientL1.getBlockNumber();
    }

    while (true) {
      const currentBlock = await publicClientL1.getBlockNumber();

      if (lastProcessedBlock < currentBlock) {
        const fromBlock = lastProcessedBlock;
        const toBlock =
          fromBlock + BLOCK_STEP > currentBlock
            ? currentBlock
            : fromBlock + BLOCK_STEP;
        console.log(
          `Fetching real-time events from block ${fromBlock} to ${toBlock} (${
            toBlock - fromBlock
          }) currentBlock: ${currentBlock}`
        );

        await getEventsLogs(fromBlock, toBlock);
        await getEventProveLogs(fromBlock, toBlock);
        await getEventFinalizeLogs(fromBlock, toBlock);

        await updateTracker(pool, toBlock, 'real_time_deposit');

        lastProcessedBlock = toBlock;

        await sleep(1000);
      }

      await sleep(5000);
    }
  } catch (error) {
    console.error('Error in fetchRealTimeEvents:', error);
  }
}

// Function to fetch past events
async function fetchPastEvents(finalBlock: bigint, BLOCK_STEP: bigint) {
  try {
    let currentBlock = await publicClientL1.getBlockNumber();
    let fromBlock = await getTracker(pool, 'past_time_deposit');

    console.log(fromBlock, currentBlock);

    if (fromBlock === null || fromBlock > currentBlock) {
      fromBlock = currentBlock;
    }

    console.log(
      fromBlock,
      finalBlock,
      fromBlock - finalBlock,
      fromBlock > finalBlock
    );

    while (fromBlock > finalBlock) {
      const startTime = Date.now();
      const toBlock = fromBlock;
      fromBlock =
        fromBlock - BLOCK_STEP > finalBlock
          ? fromBlock - BLOCK_STEP
          : finalBlock;

      console.log(
        `Fetching past events from block ${fromBlock} to ${toBlock} (${
          toBlock - fromBlock
        })`
      );

      await getEventsLogs(
        fromBlock,
        toBlock < currentBlock ? toBlock : currentBlock
      );

      await getEventProveLogs(
        fromBlock,
        toBlock < currentBlock ? toBlock : currentBlock
      );

      await getEventFinalizeLogs(
        fromBlock,
        toBlock < currentBlock ? toBlock : currentBlock
      );

      await updateTracker(pool, toBlock, 'past_time_deposit');

      // Update current block in case it's changed
      currentBlock = await publicClientL1.getBlockNumber();
      const endTime = Date.now();

      // Estimate time to process the next batch
      const timeDiff = endTime - startTime;

      // estimate time to finalBlock
      try {
        const estimateTimeToFinalBlock =
          (BigInt(timeDiff) * (fromBlock - finalBlock)) / BLOCK_STEP;

        console.log(
          `Processed and saved past events up to block ${toBlock} , estimate time : ${formatSeconds(
            Number(estimateTimeToFinalBlock)
          )}`
        );
      } catch (error) {}
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
