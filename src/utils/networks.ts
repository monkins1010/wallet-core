import { BitcoinNetworks } from '../../modules/bitcoin';
import { VerusNetworks } from '../../modules/verus';
import { SolanaNetworks } from '../../modules/solana';
import { Network as ChainifyNetwork } from '../../modules/types';
import { ChainId, getChain } from '../../modules/cryptoassets';
import { CUSTOM_ERRORS, createInternalError } from '../../modules/error-parser';
import { Network } from '../store/types';

export const Networks = [Network.Mainnet, Network.Testnet];

export type ChainNetworksType = Record<string, { mainnet: ChainifyNetwork; testnet: ChainifyNetwork }>;

export const ChainNetworks: ChainNetworksType = {
  [ChainId.Bitcoin]: {
    testnet: BitcoinNetworks.bitcoin_testnet,
    mainnet: BitcoinNetworks.bitcoin,
  },

  [ChainId.Verus]: {
    testnet: VerusNetworks.verus_testnet,
    mainnet: VerusNetworks.verus,
  },

  [ChainId.Solana]: {
    testnet: SolanaNetworks.solana_testnet,
    mainnet: {
      ...SolanaNetworks.solana_mainnet,
      rpcUrl: process.env.VUE_APP_SOLANA_MAINNET_URL || SolanaNetworks.solana_mainnet.rpcUrl,
    },
  },
};

export function getRpcUrl(chainId: ChainId, network = Network.Mainnet) {
  const rpcUrl = getChain(network, chainId).network.rpcUrls[0];
  if (!rpcUrl) {
    throw createInternalError(CUSTOM_ERRORS.NotFound.RPC(chainId, network));
  }
  return rpcUrl;
}
