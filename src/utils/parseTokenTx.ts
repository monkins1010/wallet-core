import { Interface } from '@ethersproject/abi';
import abi from 'human-standard-token-abi';

const hstInterface = new Interface(abi);

export const parseTokenTx = (data: string) => hstInterface.parseTransaction({ data });
