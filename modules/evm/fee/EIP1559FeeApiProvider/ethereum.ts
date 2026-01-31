import { NodeError } from '../../../errors';
import { FeeDetails } from '../../../types';
import { Math } from '../../../utils';

export class EthereumFeeParser {
    public parse(response: EthereumResponse): FeeDetails {
        if (response.code === 200) {
            const suggestedBaseFeePerGas = Number(response.raw.etherscan.suggestBaseFee);

            return {
                slow: {
                    fee: {
                        maxFeePerGas: Number(response.raw.etherscan.SafeGasPrice),
                        maxPriorityFeePerGas: Math.sub(response.raw.etherscan.SafeGasPrice, suggestedBaseFeePerGas).toNumber(),
                        suggestedBaseFeePerGas,
                    },
                },
                average: {
                    fee: {
                        maxFeePerGas: Number(response.raw.etherscan.ProposeGasPrice),
                        maxPriorityFeePerGas: Math.sub(response.raw.etherscan.ProposeGasPrice, suggestedBaseFeePerGas).toNumber(),
                        suggestedBaseFeePerGas,
                    },
                },
                fast: {
                    fee: {
                        maxFeePerGas: Number(response.raw.etherscan.FastGasPrice),
                        maxPriorityFeePerGas: Math.sub(response.raw.etherscan.FastGasPrice, suggestedBaseFeePerGas).toNumber(),
                        suggestedBaseFeePerGas,
                    },
                },
            };
        } else {
            throw new NodeError('Could not fetch Ethereum fee data', response as unknown as Record<string, unknown>);
        }
    }
}

export interface EthereumResponse {
    code: number;
    data: Data;
    raw: Raw;
}

interface Data {
    timestamp: number;
    fast: number;
    standard: number;
    slow: number;
}

interface Raw {
    etherscan: Etherscan;
}

interface Etherscan {
    LastBlock: string;
    SafeGasPrice: string;
    ProposeGasPrice: string;
    FastGasPrice: string;
    suggestBaseFee: string;
    gasUsedRatio: string;
}
