import { insertEventDeposit } from '.';
import { portalABI } from '../abi/portalABI';
import { ENV } from '../constant';
import { publicClientL1 } from './chain';
import { EventDeposit } from './types';

// Fetch past events and index them
export const fetchEventDeposit = async (
  db: any,
  fromBlock: bigint,
  toBlock: bigint,
) => {
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
      await insertEventDeposit(db, event);
      // console.log(`Event inserted successfully hash : ${transactionHash}`);
    } catch (err) {
      // console.error('Error inserting event deposit:', err);
    }
  }

  console.log(`Fetched ${logs.length} events`);

};

export const getLastEventDeposit = async (db: any): Promise<EventDeposit> => {
  const stmt = await db.prepare(
    `SELECT * FROM deposit ORDER BY blockNumber DESC LIMIT 1`
  );
  const row = await stmt.get();
  return row;
};
