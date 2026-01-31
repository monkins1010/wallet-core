import { TxNotFoundError } from '../../modules/errors';
import { LiqualityError } from '../../modules/error-parser';

export function isTransactionNotFoundError(error: Error): boolean {
  if (error instanceof LiqualityError) {
    return ((error as LiqualityError).rawError as Error)?.name === TxNotFoundError.prototype.name;
  } else {
    return error.name === TxNotFoundError.prototype.name;
  }
}
