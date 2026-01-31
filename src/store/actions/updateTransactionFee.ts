import { Transaction } from '../../../modules/types';
import { CUSTOM_ERRORS, createInternalError } from '../../../modules/error-parser';
import { isObject } from 'lodash';
import { ActionContext, rootActionContext } from '..';
import { Asset, HistoryItem, Network, WalletId } from '../types';
import { unlockAsset } from '../utils';

export const updateTransactionFee = async (
  context: ActionContext,
  {
    network,
    walletId,
    asset,
    id,
    hash,
    newFee,
  }: { network: Network; walletId: WalletId; asset: Asset; id: string; hash: string; newFee: number }
): Promise<Transaction> => {
  const { dispatch, commit, getters } = rootActionContext(context);
  const item = getters.historyItemById(network, walletId, id);

  if (!item) {
    throw createInternalError(CUSTOM_ERRORS.NotFound.History.Item);
  }

  const hashKey = Object.keys(item).find((key: keyof HistoryItem) => item[key] === hash);

  // @ts-ignore TODO: this needs refactoring to be more typescripty
  const txKey = Object.keys(item).find((key: keyof HistoryItem) => isObject(item[key]) && item[key].hash === hash);

  if (!hashKey || !txKey) {
    throw createInternalError(CUSTOM_ERRORS.NotFound.History.Transaction);
  }

  const feeKey = {
    tx: 'fee',
  }[txKey] as string;

  const accountId = (item as any).accountId;
  const account = getters.accountItem(accountId)!;

  const client = getters.client({
    network,
    walletId,
    chainId: account.chain,
    accountId,
  });

  const oldTx = (item as any)[txKey] as Transaction | string;

  let newTx;
  const lock = await dispatch.getLockForAsset({
    item,
    network,
    walletId,
    asset,
  });
  try {
    newTx = await client.wallet.updateTransactionFee(oldTx, newFee);
  } catch (e) {
    console.warn(e);
    throw e;
  } finally {
    unlockAsset(lock);
  }

  const updates = {
    [hashKey]: newTx.hash,
    [txKey]: newTx,
    [feeKey]: newTx.feePrice,
  };

  commit.UPDATE_HISTORY({
    network,
    walletId,
    id: id,
    updates,
  });

  return newTx;
};
