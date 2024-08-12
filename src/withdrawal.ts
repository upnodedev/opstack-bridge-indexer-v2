import { InvalidParamsRpcError } from 'viem';
import { L2StandardBridgeABI } from './abi/L2StandardBridgeABI';
import { ENV } from './constant';
import { connectDb, findRange, testConnection } from './utils';
import { publicClientL2 } from './utils/chain';
import {
  fetchEventWithdrawal,
  getLastEventWithdrawal,
} from './utils/event';
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
    await publicClientL2.getContractEvents({
      address: ENV.L2_STANDARD_BRIDGE_ADDRESS,
      abi: L2StandardBridgeABI,
      eventName: 'WithdrawalInitiated',
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

  let fromBlock = ENV.L2_STANDARD_BRIDGE_BLOCK_CREATED
    ? BigInt(ENV.L2_STANDARD_BRIDGE_BLOCK_CREATED)
    : BigInt(0);
  let toBlock = BigInt(fromBlock) + BigInt(LIMIT);

  const lastestEvent = await getLastEventWithdrawal(db);

  if (lastestEvent) {
    fromBlock = BigInt(findRange(lastestEvent.blocknumber, LIMIT)[0]);
    toBlock = BigInt(findRange(lastestEvent.blocknumber, LIMIT)[1]);
  }

  while (true) {
    const currentBlock = await publicClientL2.getBlockNumber();

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
        `[withdrawal] [fetching] from block ${fromBlock} to block ${toBlock}`
      );
      await fetchEventWithdrawal(db, fromBlock, toBlock);
      fromBlock = toBlock;
      toBlock = BigInt(toBlock) + BigInt(LIMIT);
    } catch (error) {}
    await sleep(sleepTime);
  }
}

main();
