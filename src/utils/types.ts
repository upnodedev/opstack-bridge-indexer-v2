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

export interface TransactionDepositedDreceiver {
  sender: string;
  receiver: string;
  version: string;
  opaqueData: string;
  transactionHash: string;
  blocknumber: number;
  addressContract: string;
}

export interface TransactionWithdrawnDreceiver {
  l1receiverken: string;
  l2receiverken: string;
  sender: string;
  receiver: string;
  amount: string;
  extraData: string;
  transactionHash: string;
  blocknumber: number;
  addressContract: string;
}

export interface EventDeposit {
  transactionHash: string;
  sender: string;
  receiver: string;
  amount: string;
  isEth: number;
  extraData: null;
  remotereceiverken: null;
  localreceiverken: null;
  blocknumber: number;
  addressContract: string;
  version: string;
}

export interface EventWithdrawal {
  l1receiverken: string;
  l2receiverken: string;
  sender: string;
  receiver: string;
  amount: string;
  extraData: string;
  transactionHash: string;
  blocknumber: number;
  addressContract: string;
}
