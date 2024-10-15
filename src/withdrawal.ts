import { Pool } from 'pg';
import { ENV } from './constant';
import {
  formatSeconds,
  getTracker,
  insertEventWithdraw,
  testConnection,
  updateTracker,
} from './utils';
import { publicClientL2 } from './utils/chain';
import { InvalidParamsRpcError } from 'viem';
import pool from './utils/db';
import { L2StandardBridgeABI } from './abi/L2StandardBridgeABI';
import { getWithdrawals } from 'viem/op-stack';
const sleep = require('util').promisify(setTimeout);

// const MAX_RETRIES = 5;
// let estimateTime = 0;
const LIMIT_BLOCK = ENV.L2_LIMIT_BLOCKS
  ? Number(ENV.L2_LIMIT_BLOCKS)
  : 10000000;

async function main() {
  console.log(
    `Withdrawal indexer started ${ENV.L2_STANDARD_BRIDGE_ADDRESS} block ${ENV.L2_STANDARD_BRIDGE_BLOCK_CREATED} - ${LIMIT_BLOCK}`
  );
  await testConnection(pool);

  let LIMIT = 0;

  // check limit block
  try {
    await publicClientL2.getContractEvents({
      address: ENV.L2_STANDARD_BRIDGE_ADDRESS,
      abi: L2StandardBridgeABI,
      eventName: 'WithdrawalInitiated',
      fromBlock: BigInt(0),
      toBlock: BigInt(LIMIT_BLOCK),
    });
    LIMIT = LIMIT_BLOCK;
    console.log('Limit block:', LIMIT);
  } catch (error) {
    LIMIT = 1000;
  }
  await sleep(100);

  // Start both fetchEvents and startWatching in parallel
  await Promise.all([
    fetchPastEvents(
      BigInt(ENV.L2_STANDARD_BRIDGE_BLOCK_CREATED),
      BigInt(LIMIT)
    ), // Fetch past events
    fetchRealTimeEvents(BigInt(LIMIT)), // Start watching for real-time events
  ]);
}

async function getEventsLogs(fromBlock: bigint, toBlock: bigint) {
  // get Logs
  const logs = await publicClientL2.getContractEvents({
    address: ENV.L2_STANDARD_BRIDGE_ADDRESS,
    abi: L2StandardBridgeABI,
    eventName: 'WithdrawalInitiated',
    fromBlock,
    toBlock,
  });

  for (const log of logs) {
    const { l1Token, l2Token, from, to, amount, extraData } = log.args;
    const { transactionHash, address, blockNumber } = log;

    const receipt = await publicClientL2.getTransactionReceipt({
      hash: transactionHash,
    });

    const [withdrawal] = getWithdrawals({ logs: receipt.logs });

    const withdrawalHash = withdrawal.withdrawalHash;

    const block = await publicClientL2.getBlock({
      blockNumber: BigInt(blockNumber),
    });
    const blockTimestamp = block.timestamp * 1000n;

    const event = {
      l1Token,
      l2Token,
      from,
      to,
      amount: amount.toString(),
      extraData,
      transactionHash,
      blockNumber: +blockNumber.toString(),
      address,
      withdrawalHash,
      blockTimestamp: +blockTimestamp.toString(),
    };

    // console.log(event);

    try {
      await insertEventWithdraw(pool, event);
      await sleep(10);
      // console.log(`Event inserted successfully hash : ${transactionHash}`);
    } catch (err) {
      // console.error('Error inserting event deposit:', err);
    }
  }
}

async function fetchRealTimeEvents(BLOCK_STEP: bigint) {
  try {
    let lastProcessedBlock = await getTracker(
      pool,
      'real_time_withdrawal_initiated'
    );

    if (lastProcessedBlock === null) {
      lastProcessedBlock = await publicClientL2.getBlockNumber();
    }

    while (true) {
      const currentBlock = await publicClientL2.getBlockNumber();

      while (lastProcessedBlock < currentBlock) {
        const fromBlock = lastProcessedBlock + 1n;
        const toBlock = fromBlock + BLOCK_STEP - 1n;
        const toBlockmin = toBlock < currentBlock ? toBlock : currentBlock;

        console.log(
          `Fetching real-time events from block ${fromBlock} to ${toBlockmin}`
        );

        await getEventsLogs(fromBlock, toBlockmin);

        lastProcessedBlock = toBlockmin;
        await updateTracker(
          pool,
          lastProcessedBlock,
          'real_time_withdrawal_initiated'
        );
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
    const startTime = Date.now();
    let currentBlock = await publicClientL2.getBlockNumber();
    let fromBlock = await getTracker(pool, 'past_time_withdrawal_initiated');

    if (fromBlock === null || fromBlock > currentBlock) {
      fromBlock = currentBlock;
    }

    while (fromBlock > finalBlock) {
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

      await updateTracker(pool, fromBlock, 'past_time_withdrawal_initiated');

      // Update current block in case it's changed
      currentBlock = await publicClientL2.getBlockNumber();

      const endTime = Date.now();

      // Estimate time to process the next batch
      const timeDiff = endTime - startTime;

      try {
        // estimate time to finalBlock
        const estimateTimeToFinalBlock =
          (BigInt(timeDiff) * (fromBlock - finalBlock)) / BLOCK_STEP;

        console.log(
          `Processed and saved past events up to block ${toBlock} , estimate time : ${formatSeconds(
            Number(estimateTimeToFinalBlock)
          )}`
        );
      } catch (error) {}
    }

    console.log('fetchPastEvents: All past events processed.');
  } catch (error) {
    console.error('Error in fetchPastEvents:', error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
