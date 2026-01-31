import { Chain, Client, Wallet } from '../../../modules/client';
import {
  BitcoinEsploraApiProvider,
  BitcoinFeeApiProvider,
  BitcoinHDWalletProvider,
  BitcoinTypes,
} from '../../../modules/bitcoin';
import { VerusJsonRpcProvider, VerusHDWalletProvider, VerusTypes } from '../../../modules/verus';
import { ChainifyNetwork } from '../../types';

import { SolanaChainProvider, SolanaNftProvider, SolanaWalletProvider } from '../../../modules/solana';

import { AccountInfo, ClientSettings } from '../../store/types';
import { walletOptionsStore } from '../../walletOptions';
import { CUSTOM_ERRORS, createInternalError } from '../../../modules/error-parser';
import { Network } from '../../../modules/types';

export function createBtcClient(
  settings: ClientSettings<ChainifyNetwork>,
  mnemonic: string,
  accountInfo: AccountInfo
): Client<Chain<any, Network>, Wallet<any, any>> {
  const isMainnet = settings.network === 'mainnet';
  const { chainifyNetwork } = settings;
  const chainProvider = new BitcoinEsploraApiProvider({
    batchUrl: chainifyNetwork.batchScraperUrl!,
    url: chainifyNetwork.scraperUrl!,
    network: chainifyNetwork as BitcoinTypes.BitcoinNetwork,
    numberOfBlockConfirmation: 2,
  });

  if (isMainnet) {
    const feeProvider = new BitcoinFeeApiProvider(chainifyNetwork.feeProviderUrl);
    chainProvider.setFeeProvider(feeProvider);
  }

  const walletOptions = {
    network: chainifyNetwork as BitcoinTypes.BitcoinNetwork,
    baseDerivationPath: accountInfo.derivationPath,
    mnemonic,
  };
  const walletProvider = new BitcoinHDWalletProvider(walletOptions, chainProvider);

  return new Client(chainProvider as any, walletProvider);
}

export function createSolanaClient(
  settings: ClientSettings<ChainifyNetwork>,
  mnemonic: string,
  accountInfo: AccountInfo
): Client<Chain<any, Network>, Wallet<any, any>> {
  const walletOptions = { mnemonic, derivationPath: accountInfo.derivationPath };
  const chainProvider = new SolanaChainProvider(settings.chainifyNetwork);
  const walletProvider = new SolanaWalletProvider(walletOptions, chainProvider);
  const nftProvider = new SolanaNftProvider(walletProvider as any);

  return new Client(chainProvider as any, walletProvider as any).connect(nftProvider);
}

export function createVerusClient(
  settings: ClientSettings<ChainifyNetwork>,
  mnemonic: string,
  accountInfo: AccountInfo
): Client<Chain<any, Network>, Wallet<any, any>> {
  const { chainifyNetwork } = settings;
  const chainProvider = new VerusJsonRpcProvider({
    uri: chainifyNetwork.rpcUrl as string,
    network: chainifyNetwork as VerusTypes.VerusNetwork
  });

  const walletOptions = {
    network: chainifyNetwork as VerusTypes.VerusNetwork,
    baseDerivationPath: accountInfo.derivationPath,
    mnemonic,
  };
  const walletProvider = new VerusHDWalletProvider(walletOptions, chainProvider);

  return new Client(chainProvider as any, walletProvider as any);
}
