import { mainnet, type Chain } from 'viem/chains';
import { createPublicClient, http, webSocket } from 'viem';
import 'dotenv/config';
import { ethers } from 'ethers';
import { JsonRpcProvider } from '@ethersproject/providers';
import { ENV } from '../constant';
import { publicActionsL2, publicActionsL1 } from "viem/op-stack";

export const RPC_URLS_L1 = [
  ENV.L1_RPC_URL_1,
];
export const RPC_URLS_L2 = [
  ENV.L2_RPC_URL_1,
];

// clone of mainnet and edit the chainId
export const l1ChainConfig: Chain = {
  name: ENV.L1_CHAIN_NAME,
  id: ENV.L1_CHAIN_ID,
  rpcUrls: {
    default: {
      http: RPC_URLS_L1,
    },
  },
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18,
  },
};

export const l2ChainConfig: Chain = {
  name: ENV.L2_CHAIN_NAME,
  id: ENV.L2_CHAIN_ID,
  rpcUrls: {
    default: {
      http: RPC_URLS_L2,
    },
  },
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18,
  },
};

export const publicClientL1 = createPublicClient({
  chain: l1ChainConfig,
  transport: http(),
}).extend(publicActionsL1());;

export const publicClientL2 = createPublicClient({
  chain: l2ChainConfig,
  transport: http(),
}).extend(publicActionsL2());;


export const StandartBridgeABI = [
  'event WithdrawalInitiated(address indexed l1Token, address indexed l2Token, address indexed from, address to, uint256 amount, bytes extraData)',
];

export const PortalAbi = [
  'event TransactionDeposited(address indexed from, address indexed to, uint256 indexed version, bytes opaqueData)',
];

export const getContractStandartBridge = async (provider: JsonRpcProvider) => {
  return new ethers.Contract(
    ENV.L2_STANDARD_BRIDGE_ADDRESS,
    StandartBridgeABI,
    provider
  );
};

export const getContractPortal = async (provider: JsonRpcProvider) => {
  return new ethers.Contract(ENV.L1_PORTAL_ADDRESS, PortalAbi, provider);
};
