import { VerusChain } from '../../UtxoChain';
import { AssetTypes, ChainId } from '../../../types';

export default new VerusChain({
  id: ChainId.Verus,
  name: 'Verus',
  code: 'VRSC',
  color: '#EAB300',
  nativeAsset: [
    {
      name: 'Verus',
      chain: ChainId.Verus,
      type: AssetTypes.native,
      code: 'VRSC',
      priceSource: { coinGeckoId: 'verus-coin' },
      color: '#f7931a',
      decimals: 8,
    },
  ],

  isEVM: false,
  hasTokens: false,
  isMultiLayered: false,

  averageBlockTime: 60,
  safeConfirmations: 1,
  txFailureTimeoutMs: 10_800_000, // 3 hours
  network: {
    name: 'Verus',
    coinType: '0',
    isTestnet: false,
    networkId: 'mainnet',
    utxo: {
      messagePrefix: '\x18Verus Signed Data:\n',
      bech32: 'bc',
      bip32: {
        public: 0x0488b21e,
        private: 0x0488ade4,
      },
      pubKeyHash: 0x00,
      scriptHash: 0x05,
      wif: 0x80,
    },
    rpcUrls: ['https://api.verus.services/'],
    scraperUrls: ['https://explorer.verus.io/'],
  },
  explorerViews: [
    {
      tx: 'https://insight.verus.services/tx/{hash}',
      address: 'https://insight.verus.services/address/{address}',
    },
  ],
  multicallSupport: false,
  ledgerSupport: false,
  EIP1559: false,
  gasLimit: {
    send: {
      native: 290,
    },
  },
  fees: {
    unit: 'sat/b',
    magnitude: 1e8,
  },
  supportCustomFees: false,
});