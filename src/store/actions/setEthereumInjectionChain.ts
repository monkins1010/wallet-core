import { ChainId } from '../../../modules/cryptoassets';
import { ActionContext, rootActionContext } from '..';

export const setEthereumInjectionChain = async (context: ActionContext, { chain }: { chain: ChainId }) => {
  const { commit } = rootActionContext(context);
  commit.SET_ETHEREUM_INJECTION_CHAIN({ chain });
};
