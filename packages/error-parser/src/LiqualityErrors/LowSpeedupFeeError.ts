import { LiqualityError } from '.';
export default class LowSpeedupFeeError extends LiqualityError {
  public readonly name = LowSpeedupFeeError.name;

  constructor() {
    super();
  }
}
