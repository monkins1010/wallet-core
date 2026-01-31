import { ChainId, getChain } from '../../../modules/cryptoassets';
import { CUSTOM_ERRORS, createInternalError } from '../../../modules/error-parser';
import { AccountInfo, ClientSettings } from '../../store/types';
import { createBtcClient, createSolanaClient, createVerusClient } from './clients';
import { createEvmClient } from './evm';
import { Network as ChainifyNetwork } from '../../../modules/types';
import { BitcoinTypes } from '../../../modules/bitcoin';
import { VerusTypes } from '../../../modules/verus';

export const createClient = ({
  chainId,
  settings,
  mnemonic,
  accountInfo,
}: {
  chainId: ChainId;
  settings: ClientSettings<ChainifyNetwork>;
  mnemonic: string;
  accountInfo: AccountInfo;
}) => {
  let client;
  const chain = getChain(settings.network, chainId);

  if (chain.isEVM) {
    client = createEvmClient(chain, settings, mnemonic, accountInfo);
  } else {
    switch (chainId) {
      case ChainId.Bitcoin:
        client = createBtcClient(settings as ClientSettings<BitcoinTypes.BitcoinNetwork>, mnemonic, accountInfo);
        break;
      case ChainId.Solana:
        client = createSolanaClient(settings, mnemonic, accountInfo);
        break;
      case ChainId.Verus:
        client = createVerusClient(settings as ClientSettings<VerusTypes.VerusNetwork>, mnemonic, accountInfo);
        break;
      default:
        throw createInternalError(CUSTOM_ERRORS.NotFound.Client(chainId));
    }
  }

  // Proxify Client so that chainify errors are parsed and rethrown as Liquality Errors.
  // if (client.chain) client.chain = proxify(client.chain);
  // if (client.swap) client.swap = proxify(client.swap);
  // if (client.nft) client.nft = proxify(client.nft);
  // if (client.wallet) client.wallet = proxify(client.wallet);

  return client;
};

// const parser = getErrorParser(ChainifyErrorParser);
// function proxify(obj: any) {
//   return new Proxy(obj, {
//     get(target, prop) {
//       if (target[prop] instanceof Function) {
//         return (...args: any) => {
//           try {
//             const result = target[prop](...args);
//             if (isPromise(result)) {
//               return result.catch((e: any) => {
//                 throw parser.parseError(e, null);
//               });
//             }
//             return result;
//           } catch (e) {
//             throw parser.parseError(e, null);
//           }
//         };
//       } else {
//         return target[prop];
//       }
//     },
//   });
// }

// function isPromise(p: any) {
//   if (p !== null && typeof p === 'object' && typeof p.then === 'function' && typeof p.catch === 'function') {
//     return true;
//   }

//   return false;
// }
