import { FeeDetails, NFTAsset, Nullable, Transaction } from '../../modules/types';
import { ChainId } from '../../modules/cryptoassets';
import { Step } from '@lifi/sdk';
import BN from 'bignumber.js';
import { LiqualityErrorJSON } from '../../modules/error-parser';
import { ChainifyNetwork } from '../types';
export type NetworkWalletIdMap<T> = Partial<Record<Network, Record<WalletId, T>>>;
export type WalletIdNetworkMap<T> = Partial<Record<WalletId, Record<Network, T>>>;

export enum Network {
  Mainnet = 'mainnet',
  Testnet = 'testnet',
}

export interface ClientSettings<T> {
  network: Network;
  chainifyNetwork: T;
}

export type WalletId = string;
export type AccountId = string;
export type Asset = string;
export type FiatRates = Record<Asset, number>;
export type CurrenciesInfo = Record<Asset, BN>;

export type AnalyticsState = {
  userId: string;
  acceptedDate: number;
  askedDate: number;
  askedTimes: number;
  notAskAgain: boolean;
};
export type AssetInfo = { asset: string; type: string; amount: BN };

export interface Wallet {
  id: WalletId;
  name: string;
  mnemonic: string;
  at: number;
  imported: boolean;
}

export interface CustomToken {
  symbol: string;
  name: string;
  contractAddress: string;
  decimals: number;
  chain: ChainId;
}

export enum AccountType {
  Default = 'default',
  BitcoinLedgerNativeSegwit = 'bitcoin_ledger_nagive_segwit',
  BitcoinLedgerLegacy = 'bitcoin_ledger_legacy',
  EthereumLedger = 'ethereum_ledger',
  RskLedger = 'rsk_ledger',
}

export interface AccountDefinition {
  type: AccountType;
  name: string;
  alias?: string;
  chain: ChainId;
  index: number;
  derivationPath?: string;
  addresses: string[];
  assets: Asset[];
  balances: Record<Asset, string>;
  updatedAt?: number;
  color: string;
  enabled?: boolean;
  chainCode?: string;
  publicKey?: string;
  nfts?: NFT[];
}

export interface AccountInfo {
  derivationPath: string;
  type: string;
  chainCode?: string;
  publicKey?: string;
  address?: string;
}

export interface Account extends AccountDefinition {
  id: AccountId;
  walletId: WalletId;
  createdAt: number;
  enabled: boolean;
  derivationPath: string;
  chainCode?: string;
  publicKey?: string;
  nfts?: NFT[];
}
export interface PairData {
  from: Asset;
  to: Asset;
  rate: string;
  max: string;
  min: string;
}

export interface MarketData extends PairData {
  provider: string;
}

export enum FeeLabel {
  Slow = 'slow',
  Average = 'average',
  Fast = 'fast',
}

export enum TransactionType {
  Send = 'SEND',
  NFT = 'NFT',
}

export interface BaseHistoryItem {
  fee: number;
  feeLabel: FeeLabel;
  from: Asset;
  id: string;
  network: Network;
  startTime: number;
  endTime?: number;
  status: string; // TODO: actual types?
  to: Asset;
  type: TransactionType;
  walletId: WalletId;
  error?: Nullable<string>;
  waitingForLock?: boolean;
}

export interface NFTSendTransactionParams {
  network: Network;
  accountId: AccountId;
  walletId: WalletId;
  receiver: string;
  values: number[];
  fee: number;
  feeLabel: FeeLabel;
  nft: NFT;
}

export enum SendStatus {
  WAITING_FOR_CONFIRMATIONS = 'WAITING_FOR_CONFIRMATIONS',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export interface SendHistoryItem extends BaseHistoryItem {
  type: TransactionType.Send;
  toAddress: string;
  amount: string;
  tx: Transaction;
  txHash: string;
  accountId: AccountId;
  fiatRate: number;
  status: SendStatus;
}

export interface NFTSendHistoryItem extends BaseHistoryItem {
  type: TransactionType.NFT;
  toAddress: string;
  tx: Transaction;
  nft: NFT;
  txHash: string;
  accountId: AccountId;
  status: SendStatus;
}

export type HistoryItem = NFTSendHistoryItem | SendHistoryItem;

export enum ExperimentType {
  ManageAccounts = 'manageAccounts',
  ReportErrors = 'reportErrors',
}

export type ChainAccountIdMap = {
  [key in ChainId]: string[];
};

export interface Connections extends ChainAccountIdMap {
  defaultEthereum: string;
}

export type ExternalConnections = Record<WalletId, Record<string, Connections>>;

export interface RootState {
  version: number;

  // <do not keep these in localStorage>
  key: string;
  wallets: Wallet[];
  unlockedAt: number;
  // </do not keep these in localStorage>

  brokerReady: boolean;

  encryptedWallets: string;

  enabledAssets: NetworkWalletIdMap<Asset[]>;
  customTokens: NetworkWalletIdMap<CustomToken[]>;

  accounts: WalletIdNetworkMap<Account[]>;

  fiatRates: FiatRates;
  currenciesInfo: CurrenciesInfo;
  fees: NetworkWalletIdMap<Record<Asset, FeeDetails>>;
  history: NetworkWalletIdMap<HistoryItem[]>;
  marketData: Partial<Record<Network, MarketData[]>>;

  activeNetwork: Network;
  activeWalletId: WalletId;

  keyUpdatedAt: number;
  keySalt: string;
  termsAcceptedAt: number;
  setupAt: number;

  injectEthereum: boolean;
  injectEthereumChain: ChainId;
  usbBridgeWindowsId: number;

  externalConnections: ExternalConnections;
  rskLegacyDerivation: boolean;
  analytics: AnalyticsState;
  experiments: Partial<Record<ExperimentType, boolean>>;
  whatsNewModalVersion: string;
  enabledChains: WalletIdNetworkMap<ChainId[]>;

  errorLog: LiqualityErrorJSON[];
  customChainSeetings: NetworkWalletIdMap<Record<ChainId, ChainifyNetwork>>;
}

export type NFTCollections<T> = {
  [collectionName: string]: T[];
};

export interface NFTWithAccount extends NFT {
  accountId: AccountId;
}

export interface NFT extends NFTAsset {
  starred: boolean;
}

export enum NftProviderType {
  OpenSea = 'opensea',
  Infura = 'infura',
  Covalent = 'covalent',
}
