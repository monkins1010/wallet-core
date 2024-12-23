import { Chain, Client, Swap, Wallet } from '@chainify/client';
import {
  BitcoinEsploraApiProvider,
  BitcoinFeeApiProvider,
  BitcoinHDWalletProvider,
  BitcoinSwapEsploraProvider,
  BitcoinTypes,
} from '@chainify/bitcoin';
import { BitcoinLedgerProvider, CreateBitcoinLedgerApp } from '@chainify/bitcoin-ledger';
import { VerusJsonRpcProvider, VerusHDWalletProvider, VerusTypes } from '@chainify/verus';
import { ChainifyNetwork } from '../../types';
import { NearChainProvider, NearSwapProvider, NearTypes, NearWalletProvider } from '@chainify/near';
import { SolanaChainProvider, SolanaNftProvider, SolanaWalletProvider } from '@chainify/solana';
import { TerraChainProvider, TerraSwapProvider, TerraTypes, TerraWalletProvider } from '@chainify/terra';

import { AccountInfo, ClientSettings } from '../../store/types';
import { LEDGER_BITCOIN_OPTIONS } from '../../utils/ledger';
import { walletOptionsStore } from '../../walletOptions';
import { CUSTOM_ERRORS, createInternalError } from '@liquality/error-parser';
import { Network } from '@chainify/types';

export function createBtcClient(
  settings: ClientSettings<ChainifyNetwork>,
  mnemonic: string,
  accountInfo: AccountInfo
): Client<Chain<any, Network>, Wallet<any, any>, Swap<any, any, Wallet<any, any>>> {
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

  const swapProvider = new BitcoinSwapEsploraProvider({
    network: chainifyNetwork as BitcoinTypes.BitcoinNetwork,
    scraperUrl: chainifyNetwork.scraperUrl,
  });

  // TODO: make sure Ledger works
  if (accountInfo.type.includes('bitcoin_ledger')) {
    const option = LEDGER_BITCOIN_OPTIONS.find((o) => o.name === accountInfo.type);
    if (!option) {
      throw createInternalError(CUSTOM_ERRORS.NotFound.AccountTypeOption(accountInfo.type));
    }
    const { addressType } = option;
    if (!walletOptionsStore.walletOptions.ledgerTransportCreator) {
      throw createInternalError(CUSTOM_ERRORS.NotFound.LedgerTransportCreator);
    }
    const ledgerProvider = new BitcoinLedgerProvider(
      {
        network: chainifyNetwork as BitcoinTypes.BitcoinNetwork,
        addressType,
        baseDerivationPath: accountInfo.derivationPath,
        basePublicKey: accountInfo?.publicKey,
        baseChainCode: accountInfo?.chainCode,
        transportCreator: walletOptionsStore.walletOptions.ledgerTransportCreator,
        createLedgerApp: CreateBitcoinLedgerApp,
      },
      chainProvider as any
    );
    swapProvider.setWallet(ledgerProvider as any);
  } else {
    const walletOptions = {
      network: chainifyNetwork as BitcoinTypes.BitcoinNetwork,
      baseDerivationPath: accountInfo.derivationPath,
      mnemonic,
    };
    const walletProvider = new BitcoinHDWalletProvider(walletOptions, chainProvider);
    swapProvider.setWallet(walletProvider);
  }

  return new Client().connect(swapProvider);
}

export function createNearClient(
  settings: ClientSettings<NearTypes.NearNetwork>,
  mnemonic: string,
  accountInfo: AccountInfo
): Client<Chain<any, Network>, Wallet<any, any>, Swap<any, any, Wallet<any, any>>> {
  const walletOptions = {
    mnemonic,
    derivationPath: accountInfo.derivationPath,
    helperUrl: settings.chainifyNetwork.helperUrl,
  };
  const chainProvider = new NearChainProvider(settings.chainifyNetwork);
  const walletProvider = new NearWalletProvider(walletOptions, chainProvider);
  const swapProvider = new NearSwapProvider(settings.chainifyNetwork.helperUrl, walletProvider);
  return new Client(chainProvider as any, walletProvider as any).connect(swapProvider as any);
}

export function createTerraClient(
  settings: ClientSettings<TerraTypes.TerraNetwork>,
  mnemonic: string,
  accountInfo: AccountInfo
): Client<Chain<any, Network>, Wallet<any, any>, Swap<any, any, Wallet<any, any>>> {
  const { helperUrl } = settings.chainifyNetwork;
  const walletOptions = { mnemonic, derivationPath: accountInfo.derivationPath, helperUrl };
  const chainProvider = new TerraChainProvider(settings.chainifyNetwork);
  const walletProvider = new TerraWalletProvider(walletOptions, chainProvider);
  const swapProvider = new TerraSwapProvider(helperUrl, walletProvider);
  return new Client(chainProvider as any, walletProvider as any).connect(swapProvider as any);
}

export function createSolanaClient(
  settings: ClientSettings<ChainifyNetwork>,
  mnemonic: string,
  accountInfo: AccountInfo
): Client<Chain<any, Network>, Wallet<any, any>, Swap<any, any, Wallet<any, any>>> {
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
): Client<Chain<any, Network>, Wallet<any, any>, Swap<any, any, Wallet<any, any>>> {
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
