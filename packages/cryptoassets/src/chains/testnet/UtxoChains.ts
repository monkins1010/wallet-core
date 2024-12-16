import { ChainId, ChainsMap } from '../../types';

import BitcoinChain from './utxo/bitcoin';
import VerusChain from './utxo/verus';

export const TESTNET_UTXO_CHAINS: ChainsMap = {
  [ChainId.Bitcoin]: BitcoinChain,
  [ChainId.Verus]: VerusChain
};