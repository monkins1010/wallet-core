import { Nullable } from '../../modules/types';
import { IAsset } from '../../modules/cryptoassets';

export interface NameResolver {
  reverseLookup(address: string): Promise<Nullable<string>>;
  lookupDomain(address: string, asset: IAsset): Promise<Nullable<string>>;
  isValidTLD(domain: string): Promise<boolean>;
}
