export enum ChainId {
    Bitcoin = 'bitcoin',
    BitcoinCash = 'bitcoin_cash',
    Ethereum = 'ethereum',
    Rootstock = 'rsk',
    BinanceSmartChain = 'bsc',
    Near = 'near',
    Polygon = 'polygon',
    Arbitrum = 'arbitrum',
    Solana = 'solana',
    Fuse = 'fuse',
    Terra = 'terra',
    Avalanche = 'avalanche',
    Verus = 'verus'
}

export type AssetType = 'native' | 'erc20' | 'nft';

export enum AssetTypes {
    native = 'native',
    erc20 = 'erc20',
    nft = 'nft',
}

export interface Asset {
    name: string;
    code: string;
    chain: ChainId;
    type: AssetType;
    decimals: number;
    contractAddress?: string;
}

export interface TokenDetails {
    decimals: number;
    name: string;
    symbol: string;
}
