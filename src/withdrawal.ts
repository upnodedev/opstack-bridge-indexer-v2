import { L2StandardBridgeABI } from './abi/L2StandardBridgeABI';
import { ENV } from './constant';
import { connectDb, findRange } from './utils';
import { publicClientL2 } from './utils/chain';
import {
  fetchEventDeposit,
  fetchEventWithdrawal,
  getLastEventDeposit,
  getLastEventWithdrawal,
} from './utils/event';
const sleep = require('util').promisify(setTimeout);

// const MAX_RETRIES = 5;
// let estimateTime = 0;
const LIMIT_BLOCK = [50000, 40000, 30000, 20000, 10000];
let sleepTime = 100;

async function main() {
  const db = await connectDb();
  let LIMIT = 0;

  // check limit block
  for (const limitBlock of LIMIT_BLOCK) {
    try {
      await publicClientL2.getContractEvents({
        address: ENV.L2_STANDARD_BRIDGE_ADDRESS,
        abi: L2StandardBridgeABI,
        eventName: 'WithdrawalInitiated',
        fromBlock: BigInt(0),
        toBlock: BigInt(limitBlock),
      });
      LIMIT = limitBlock;
      console.info(`[withdrawal] [checking] use limit block ${limitBlock}`);
      break;
    } catch (error) {
      console.error(
        `[withdrawal] [checking] cannot use limit block ${limitBlock}`
      );
    }
    await sleep(100);
  }

  let fromBlock = ENV.L2_STANDARD_BRIDGE_BLOCK_CREATED
    ? BigInt(ENV.L2_STANDARD_BRIDGE_BLOCK_CREATED)
    : BigInt(0);
  let toBlock = BigInt(fromBlock) + BigInt(LIMIT);

  const lastestEvent = await getLastEventWithdrawal(db);

  if (lastestEvent) {
    fromBlock = BigInt(findRange(lastestEvent.blockNumber, LIMIT)[0]);
    toBlock = BigInt(findRange(lastestEvent.blockNumber, LIMIT)[1]);
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
