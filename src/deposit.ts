import { Pool } from 'pg';
import { portalABI } from './abi/portalABI';
import { ENV } from './constant';
import { connectDb, findRange, testConnection } from './utils';
import { publicClientL1 } from './utils/chain';
import { fetchEventDeposit, getLastEventDeposit } from './utils/event';
import { InvalidParamsRpcError } from 'viem';
const sleep = require('util').promisify(setTimeout);

// const MAX_RETRIES = 5;
// let estimateTime = 0;
const LIMIT_BLOCK = 100000000000;
let sleepTime = 5;

async function main() {
  const db = connectDb();
  await testConnection(db);

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

  let fromBlock = ENV.L1_PORTAL_BLOCK_CREATED
    ? BigInt(ENV.L1_PORTAL_BLOCK_CREATED)
    : BigInt(0);
  let toBlock = BigInt(fromBlock) + BigInt(LIMIT);

  const lastestEvent = await getLastEventDeposit(db);

  if (lastestEvent) {
    fromBlock = BigInt(lastestEvent.blocknumber);
    // toBlock = BigInt(findRange(lastestEvent.blocknumber, LIMIT)[1]);
  }

  while (true) {
    const currentBlock = await publicClientL1.getBlockNumber();
    console.log('currentBlock', currentBlock);
    toBlock = fromBlock + BigInt(LIMIT);

    if (currentBlock > fromBlock && currentBlock < toBlock) {
      fromBlock = currentBlock - 100n;
      sleepTime = 10000;
    }

    // check if toBlock is greater than current block
    if (toBlock > BigInt(currentBlock)) {
      toBlock = currentBlock;
    }

    try {
      console.log(
        `[deposit] [fetching] from block ${fromBlock} to block ${toBlock}`
      );
      await fetchEventDeposit(db, fromBlock, toBlock);
      fromBlock = toBlock;
    } catch (error) {}
    await sleep(sleepTime);
  }
}

main();
