import * as rpc from './rpc';
import { Network as VerusJsLibNetwork } from 'bitcoinjs-lib'
import { Network } from '../types';

export * as VerusJsonRpcTypes from './chain/jsonRpc/types';

export interface bitgo {
    name: string
    coinType: string
    isTestnet: boolean
}

export interface VerusNetwork extends Network, VerusJsLibNetwork, bitgo { }

export interface VerusNodeWalletOptions {
    addressType?: AddressType;
    network?: VerusNetwork;
}
export interface VerusWalletProviderOptions extends VerusNodeWalletOptions {
    baseDerivationPath: string;
}

export interface VerusHDWalletProviderOptions extends VerusWalletProviderOptions {
    mnemonic: string;
}

export interface OutputTarget {
    address?: string;
    script?: Buffer;
    value: number;
}

export interface ScriptPubKey {
    asm: string;
    hex: string;
    reqSigs: number;
    type: string;
    addresses: string[];
}

export interface Output {
    value: number;
    n: number;
    scriptPubKey: ScriptPubKey;
}

export interface Input {
    txid: string;
    vout: number;
    scriptSig: {
        asm: string;
        hex: string;
    };
    txinwitness: string[];
    sequence: number;
    coinbase?: string;
}

export interface Transaction {
    txid: string
    hash: string
    version: number
    locktime: number
    vin: Input[]
    vout: Output[]
    confirmations?: number
    hex: string
    blockhash?: string
    size?: number
    vsize?: number;
    weight?: number;
}

export interface UTXO {
    txid: string;
    vout: number;
    value: number;
    address: string;
    derivationPath?: string;
}

export enum AddressType {
    RADDRESS = 'raddress',
    IADDRESS = 'iaddress',
    ZADDRESS = 'zaddress',
    BECH32 = 'bech32',
}

export enum SwapMode {
    P2SH = 'p2sh',
    P2SH_SEGWIT = 'p2shSegwit',
    P2WSH = 'p2wsh',
}

export type AddressTxCounts = { [index: string]: number };

export type AddressDeltas = { [index: string]: Array<rpc.AddressDelta> }
export interface PsbtInputTarget {
    index: number;
    derivationPath: string;
}

export interface P2SHInput {
    inputTxHex: string;
    index: number;
    vout: any;
    outputScript: Buffer;
}

export { rpc }