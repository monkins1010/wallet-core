import verus from '../../mainnet/utxo/verus';
import { transformMainnetToTestnetChain } from '../../utils';

export default transformMainnetToTestnetChain(
  verus,
  {
    name: 'verus_testnet',
    coinType: '1',
    isTestnet: true,
    networkId: 'testnet',
    utxo: {
      messagePrefix: '\x18Verus Signed Data:\n',
      bech32: 'tb',
      bip32: {
        public: 0x043587cf,
        private: 0x04358394,
      },
      pubKeyHash: 0x6f,
      scriptHash: 0xc4,
      wif: 0xef,
    },
    rpcUrls: ['https://api.verustest.net/'],
    scraperUrls: ['https://electrs-batch-testnet-api.liq-chainhub.net/'],
  },
  [
    {
      tx: 'https://testex.verus.io/tx/{hash}',
      address: 'https://testex.verus.io/address/{address}',
    },
  ],
  'https://bitcoinfaucet.uo1.net/'
);
