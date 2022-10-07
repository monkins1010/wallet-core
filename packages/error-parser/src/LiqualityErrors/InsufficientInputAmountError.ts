import { LiqualityError } from '.';

export default class InsufficientInputAmountError extends LiqualityError<InsufficientInputAmountErrorContext> {
  public readonly name = InsufficientInputAmountError.name;

  constructor(data?: InsufficientInputAmountErrorContext) {
    super(data);
  }
}

export type InsufficientInputAmountErrorContext = { expectedMinimum: string; assetCode: string };
