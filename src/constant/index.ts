import { Address } from 'viem';
import 'dotenv/config';

export const ENV = {
  L1_RPC_URL_1: process.env.L1_RPC_URL_1,
  L1_RPC_URL_2: process.env.L1_RPC_URL_2,
  L1_RPC_URL_3: process.env.L1_RPC_URL_3,
  L1_CHAIN_NAME: process.env.L1_CHAIN_NAME,
  L1_CHAIN_ID: +process.env.L1_CHAIN_ID,
  L1_PORTAL_ADDRESS: process.env.L1_PORTAL_ADDRESS as Address,
  L1_PORTAL_BLOCK_CREATED: +(process.env.L1_PORTAL_BLOCK_CREATED || 0),
  L1_LIMIT_BLOCKS: +process.env.L1_LIMIT_BLOCKS,

  L2_RPC_URL_1: process.env.L2_RPC_URL_1,
  L2_RPC_URL_2: process.env.L2_RPC_URL_2,
  L2_RPC_URL_3: process.env.L2_RPC_URL_3,
  L2_CHAIN_NAME: process.env.L2_CHAIN_NAME,
  L2_CHAIN_ID: +process.env.L2_CHAIN_ID,
  L2_STANDARD_BRIDGE_ADDRESS: process.env.L2_STANDARD_BRIDGE_ADDRESS as Address,
  L2_STANDARD_BRIDGE_BLOCK_CREATED: +(
    process.env.L2_STANDARD_BRIDGE_BLOCK_CREATED || 0
  ),
  L2_LIMIT_BLOCKS: +process.env.L2_LIMIT_BLOCKS,

  PORT: +process.env.PORT || 3000,

  DATABASE_URL: `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.DATABASE_URL}/${process.env.POSTGRES_DB}`,
};
