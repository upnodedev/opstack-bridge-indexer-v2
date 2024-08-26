import { BigNumber } from 'ethers';

export interface EventDepositLogType {
  blocknumber: number;
  blockHash: string;
  transactionIndex: number;
  removed: boolean;
  address: string;
  data: string;
  receiverpics: string[];
  transactionHash: string;
  logIndex: number;
  removeListener: Function;
  getBlock: Function;
  getTransaction: Function;
  getTransactionReceipt: Function;
  event: string;
  eventSignature: string;
  decode: Function;
  args: [
    string,
    string,
    BigNumber,
    string,
    {
      sender: string;
      receiver: string;
      version: BigNumber;
      opaqueData: string;
    }
  ];
}

export interface EventDeposit {
  transactionhash: string;
  sender: string;
  receiver: string;
  amount: string;
  iseth: boolean;
  extradata: string;
  remotetoken: string;
  localtoken: string;
  blocknumber: number;
  addresscontract: string;
  version: string;
}

export interface EventWithdrawal {
  l1token: string;
  l2token: string;
  sender: string;
  receiver: string;
  amount: string;
  extradata: string;
  transactionhash: string;
  blocknumber: number;
  addresscontract: string;
}
