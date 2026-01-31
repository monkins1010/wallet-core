import { ChainId, ChainsMap } from '../../types';

import SolanaChain from './non-evm/solana';

export const NON_EVM_CHAINS: ChainsMap = {
  [ChainId.Solana]: SolanaChain,
};
