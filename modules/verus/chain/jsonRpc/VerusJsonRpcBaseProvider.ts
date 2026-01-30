import { JsonRpcProvider } from '@chainify/client';
import { AddressType, BigNumber, Transaction, Address } from '../types';
import { AddressTxCounts, UTXO as VerusUTXO, AddressDeltas } from '../../types';
import { decodeRawTransaction, normalizeTransactionObject } from '../../utils';
import { VerusBaseChainProvider } from '../VerusBaseChainProvider';
import { ProviderOptions, UTXO } from './types';
import { AddressDelta } from '../../rpc';

export class VerusJsonRpcBaseProvider extends VerusBaseChainProvider {
    public jsonRpc: JsonRpcProvider;
    protected _options: ProviderOptions;

    constructor(options: ProviderOptions) {
        super();
        this.jsonRpc = new JsonRpcProvider(options.uri, options.username, options.password);
        this._options = {
            feeBlockConfirmations: 1,
            defaultFeePerByte: 3,
            ...options,
        };
    }

    public async formatTransaction(tx: any, currentHeight: number): Promise<Transaction<any>> {
        const hex = await this.getTransactionHex(tx.txid);
        const confirmations = tx.status.confirmed ? currentHeight - tx.status.block_height + 1 : 0;
        const decodedTx = decodeRawTransaction(hex, this._options.network);
        decodedTx.confirmations = confirmations;
        return normalizeTransactionObject(decodedTx, tx.fee, { hash: tx.status.block_hash, number: tx.status.block_height });
    }

    public async getRawTransactionByHash(transactionHash: string): Promise<string> {
        return await this.jsonRpc.send('getrawtransaction', [transactionHash, 0]);
    }

    public async getTransactionHex(transactionHash: string): Promise<string> {
        return this.jsonRpc.send('getrawtransaction', [transactionHash]);
    }

    public async getFeePerByte(numberOfBlocks?: number): Promise<number> {
        try {
            const { feerate } = await this.jsonRpc.send('estimatesmartfee', [numberOfBlocks]);

            if (feerate && feerate > 0) {
                return Math.ceil((feerate * 1e8) / 1000);
            }

            throw new Error('Invalid estimated fee');
        } catch (e) {
            return this._options.defaultFeePerByte;
        }
    }

    public async getUnspentTransactions(_addresses: AddressType[]): Promise<VerusUTXO[]> {
        const addresses = _addresses.map((a) => a.toString());
        const utxos: UTXO[] = await this.jsonRpc.send('listunspent', [0, 9999999, addresses]);
        return utxos.map((utxo) => ({ ...utxo, value: new BigNumber(utxo.amount).times(1e8).toNumber() }));
    }

    public async getAddressTransactionCounts(_addresses: AddressType[]): Promise<AddressTxCounts> {
        const addresses = _addresses.map((a) => a.toString());
        const addressDeltasRec: AddressDelta[] = await this.jsonRpc.send('getaddressdeltas', [{ addresses: addresses }])
        const addressTxCounts: AddressTxCounts = {}

        for (const delta of addressDeltasRec) {
            if (addressTxCounts[delta.address]) addressTxCounts[delta.address]++
            else addressTxCounts[delta.address] = 1
        }

        return addressTxCounts;
    }

    public async getAddressDeltas(_addresses: (Address | string)[]) {
        const addresses = _addresses.map((a) => a.toString());
        const addressDeltasRec: AddressDelta[] = await this.jsonRpc.send('getaddressdeltas', [{ addresses: addresses }])
        const deltasFormatted: AddressDeltas = {}

        for (const address of addresses) {
            deltasFormatted[address] = []
        }

        for (const delta of addressDeltasRec) {
            if (deltasFormatted[delta.address]) deltasFormatted[delta.address].push(delta)
            else deltasFormatted[delta.address] = [delta]
        }

        return deltasFormatted
    }

    public async getMinRelayFee(): Promise<number> {
        const { relayfee } = await this.jsonRpc.send('getnetworkinfo', []);
        return (relayfee * 1e8) / 1000;
    }
}
