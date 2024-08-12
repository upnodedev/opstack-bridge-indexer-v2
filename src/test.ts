import { ENV } from './constant';
import { findRange } from './utils';

const main = () => {
  let fromBlock = ENV.L1_PORTAL_BLOCK_CREATED
    ? BigInt(ENV.L1_PORTAL_BLOCK_CREATED)
    : BigInt(0);
  let toBlock = BigInt(fromBlock) + BigInt(10000);

  console.log({ fromBlock, toBlock });
};

main();
