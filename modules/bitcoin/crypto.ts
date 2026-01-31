import * as ecc from 'tiny-secp256k1';
import { BIP32Factory } from 'bip32';
import { ECPairFactory } from 'ecpair';

// Initialize factories with tiny-secp256k1
export const bip32 = BIP32Factory(ecc);
export const ECPair = ECPairFactory(ecc);

// Validator function for PSBT signature validation
export const validator = (pubkey: Buffer, msghash: Buffer, signature: Buffer): boolean => {
    return ecc.verify(msghash, pubkey, signature);
};

// Re-export types
export type { BIP32Interface } from 'bip32';
export type { ECPairInterface } from 'ecpair';
