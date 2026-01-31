import SovrynMainnetAddresses from '@blobfishkate/sovryncontracts/lib/contracts-mainnet.json';
import SovrynTestnetAddresses from '@blobfishkate/sovryncontracts/lib/contracts-testnet.json';
import { ChainId } from '../modules/cryptoassets';
import { Asset, Network } from './store/types';

export interface WalletCoreConfig {
  defaultAssets: {
    [key in Network]: Asset[];
  };
  networks: Network[];
  chains: ChainId[];
  supportedBridgeAssets: Asset[];
  discordUrl: string;
  infuraApiKey: string;
  exploraApis: {
    [key in Network]: string;
  };
  batchEsploraApis: {
    [key in Network]: string;
  };
  nameResolvers: {
    uns: {
      resolutionService: string;
      tldAPI: string;
      alchemyKey: string;
    };
  };
}

const config: WalletCoreConfig = {
  defaultAssets: {
    mainnet: [
      'BTC',
      'ETH',
      'VRSC',
      'DAI',
      'USDC',
      'USDT',
      'WBTC',
      'UNI',
      'RBTC',
      'SOV',
      'BNB',
      'NEAR',
      'SOL',
      'MATIC',
      'PWETH',
      'ARBETH',
      'AVAX',
      'FISH',
      'LUNA',
      'UST',
      'OPTETH',
      'ARBDAI',
      'OPDAI',
      'PDAI',
      'OPTUSDC',
      'ARBUSDC',
      'PUSDC',
      'sUSDC',
      'USDC.e',
      'ARBUSDT',
      'OPUSDT',
      'PUSDT',
      'sUSDT',
      'USDT.e',
      'TELEBTC',
    ],
    testnet: [
      'BTC',
      'ETH',
      'VRSC',
      'DAI',
      'RBTC',
      'BNB',
      'NEAR',
      'SOL',
      'SOV',
      'MATIC',
      'PWETH',
      'ARBETH',
      'AVAX',
      'LUNA',
      'UST',
      'OPTETH',
      'OPTUSDC',
      'TELEBTC',
    ],
  },
  infuraApiKey: 'da99ebc8c0964bb8bb757b6f8cc40f1f',
  exploraApis: {
    testnet: 'https://electrs-testnet-api.liq-chainhub.net/',
    mainnet: 'https://electrs-mainnet-api.liq-chainhub.net/',
  },
  batchEsploraApis: {
    testnet: 'https://electrs-batch-testnet-api.liq-chainhub.net/',
    mainnet: 'https://electrs-batch-mainnet-api.liq-chainhub.net/',
  },
  discordUrl: 'https://discord.gg/Xsqw7PW8wk',
  networks: [Network.Mainnet, Network.Testnet],
  chains: Object.values(ChainId),
  supportedBridgeAssets: [],
  nameResolvers: {
    uns: {
      resolutionService: 'https://unstoppabledomains.g.alchemy.com/domains/',
      tldAPI: 'https://resolve.unstoppabledomains.com/supported_tlds',
      alchemyKey: 'bKmEKAC4HJUEDNlnoYITvXYuhrIshFsa',
    },
  },
};

export default config;
