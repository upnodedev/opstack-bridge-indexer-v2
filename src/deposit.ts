import { portalABI } from './abi/portalABI';
import { ENV } from './constant';
import { connectDb } from './utils';
import { publicClientL1 } from './utils/chain';
import { fetchEventDeposit, getLastEventDeposit } from './utils/event';
const sleep = require('util').promisify(setTimeout);

// const MAX_RETRIES = 5;
// let estimateTime = 0;
const LIMIT_BLOCK = [50000, 40000, 30000, 20000, 10000];
let sleepTime = 100;

function findRange(x: number, n: number) {
  const lowerBound = Math.floor(x / n) * n;
  const upperBound = Math.ceil(x / n) * n;

  if (x % n === 0) {
    return [lowerBound - n, upperBound];
  } else {
    return [lowerBound, upperBound];
  }
}

async function main() {
  const db = await connectDb();
  let LIMIT = 0;

  // check limit block
  for (const limitBlock of LIMIT_BLOCK) {
    try {
      await publicClientL1.getContractEvents({
        address: ENV.L1_PORTAL_ADDRESS,
        abi: portalABI,
        eventName: 'TransactionDeposited',
        fromBlock: BigInt(0),
        toBlock: BigInt(limitBlock),
      });
      LIMIT = limitBlock;
      console.info(`[checking] use limit block ${limitBlock}`);
      break;
    } catch (error) {
      console.error(`[checking] cannot use limit block ${limitBlock}`);
    }
    await sleep(100);
  }

  let fromBlock = ENV.L1_PORTAL_BLOCK_CREATED
    ? BigInt(ENV.L1_PORTAL_BLOCK_CREATED)
    : BigInt(0);
  let toBlock = BigInt(fromBlock) + BigInt(LIMIT);

  const lastestEvent = await getLastEventDeposit(db);

  if (lastestEvent) {
    fromBlock = BigInt(findRange(lastestEvent.blockNumber, LIMIT)[0]);
    toBlock = BigInt(findRange(lastestEvent.blockNumber, LIMIT)[1]);
  }

  while (true) {
    const currentBlock = await publicClientL1.getBlockNumber();

    if (currentBlock > fromBlock && currentBlock < toBlock) {
      fromBlock = currentBlock - 100n;
      sleepTime = 10000;
    }

    // check if toBlock is greater than current block
    if (toBlock > BigInt(currentBlock)) {
      toBlock = currentBlock;
    }

    try {
      console.log(`[fetching] from block ${fromBlock} to block ${toBlock}`);
      await fetchEventDeposit(db, fromBlock, toBlock);
      fromBlock = toBlock;
      toBlock = BigInt(toBlock) + BigInt(LIMIT);
    } catch (error) {}
    await sleep(sleepTime);
  }
}

main();

// 6443895    6443908
// 6443818

// 6443823