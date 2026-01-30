import { Chain } from '@chainify/client';
import { AddressType, Asset, BigNumber } from '../types';
import { BIP32Interface, fromSeed } from 'bip32';
import { mnemonicToSeed } from 'bip39';
import { Psbt, Transaction as VerusJsTransaction } from 'bitcoinjs-lib';
import { VerusBaseChainProvider } from '../chain/VerusBaseChainProvider';
import { AddressType as VerusAddressType, VerusHDWalletProviderOptions, Input, OutputTarget, PsbtInputTarget } from '../types';
import { VerusBaseWalletProvider } from './VerusBaseWallet';
import { IVerusWallet } from './IVerusWallet';

const varuint = require('varuint-bitcoin') // eslint-disable-line
const utxolib = require('@bitgo/utxo-lib') // eslint-disable-line
const { ECPair, script } = utxolib
const createHash = require('create-hash') // eslint-disable-line
const VERUS_DATA_SIGNATURE_PREFIX = 'Verus signed data:\n'

export class VerusHDWalletProvider extends VerusBaseWalletProvider implements IVerusWallet<VerusBaseChainProvider> {
    private _mnemonic: string;
    private _seedNode: BIP32Interface;
    private _baseDerivationNode: BIP32Interface;

    constructor(options: VerusHDWalletProviderOptions, chainProvider?: Chain<VerusBaseChainProvider>) {
        const { mnemonic, baseDerivationPath, addressType = VerusAddressType.BECH32, network } = options;
        super({ baseDerivationPath, addressType, network }, chainProvider);

        if (!mnemonic) {
            throw new Error('Mnemonic should not be empty');
        }
        this._mnemonic = mnemonic;
    }

    public canUpdateFee() {
        return true;
    }

    public async getSigner(): Promise<null> {
        return null;
    }

    public async getAddress(): Promise<AddressType> {
        const addresses = await this.getAddresses();
        return addresses[0];
    }

    public async getBalance(_assets: Asset[]): Promise<BigNumber[]> {
        const addresses = await this.getAddresses();
        return await this.chainProvider.getBalance(addresses, _assets);
    }

    public async signMessage(message: string, from: AddressType) {
        const address = await this.getWalletAddress(typeof (from) === 'string' ? from : from.toString());
        const keyPair = await this.keyPair(address.derivationPath);

        const messageWithLength = Buffer.concat([varuint.encode(Buffer.from(message, 'utf8').length), Buffer.from(message, 'utf8')])
        const msgHash = createHash('sha256').update(messageWithLength).digest()
        const PREFIX = Buffer.concat([varuint.encode(Buffer.from(VERUS_DATA_SIGNATURE_PREFIX, 'utf8').length), Buffer.from(VERUS_DATA_SIGNATURE_PREFIX, 'utf8')]);
        const hash = createHash('sha256')
            .update(PREFIX)
            .update(msgHash)
            .digest()

        const sig = new utxolib.IdentitySignature(utxolib.networks[this._network.name])
        return sig.signHashOffline(hash, keyPair).toString('hex');

    }

    public async exportPrivateKey() {
        return this._toWIF(this._baseDerivationPath);
    }

    public async getConnectedNetwork() {
        return this._network;
    }

    public async isWalletAvailable() {
        return true;
    }

    protected async baseDerivationNode() {
        if (this._baseDerivationNode) {
            return this._baseDerivationNode;
        }
        const baseNode = await this.seedNode();
        this._baseDerivationNode = baseNode.derivePath(this._baseDerivationPath);
        return this._baseDerivationNode;
    }

    protected async buildTransaction(targets: OutputTarget[], feePerByte?: number, fixedInputs?: Input[]) {
        const network = this._network

        const unusedAddress = await this.getUnusedAddress(true)
        const { inputs, change, fee } = await this.getInputsForAmount(targets, feePerByte, fixedInputs)

        if (change) {
            targets.push({
                address: unusedAddress.address,
                value: change.value
            })
        }

        const tx = new utxolib.TransactionBuilder(utxolib.networks[network.name], feePerByte * 100)
        const currentHeight: number = await this.chainProvider.getBlockHeight();
        tx.setVersion(4)
        tx.setVersionGroupId(0x892f2085)
        tx.setExpiryHeight(currentHeight + 20)
        tx.setLockTime(currentHeight)

        for (let i = 0; i < inputs.length; i++) {
            tx.addInput(inputs[i].txid, inputs[i].vout)
        }

        for (const output of targets) {
            if (output.script) {
                tx.addOutput(output.script, output.value)
            } else {
                tx.addOutput(output.address, output.value)
            }
        }

        for (let i = 0; i < inputs.length; i++) {
            const wallet = await this.getWalletAddress(inputs[i].address)
            const keyPair = await this.keyPair(wallet.derivationPath)

            tx.sign(i, keyPair, null, null, inputs[i].value)
        }

        return { hex: tx.build().toHex(), fee }
    }

    protected async buildSweepTransaction(externalChangeAddress: string, feePerByte: number) {
        let _feePerByte = feePerByte || null; // TODO: fix me
        if (!_feePerByte) {
            _feePerByte = await this.chainProvider.getProvider().getFeePerByte();
        }

        const { inputs, outputs, change } = await this.getInputsForAmount([], _feePerByte, [], 100, true);

        if (change) {
            throw new Error('There should not be any change for sweeping transaction');
        }

        const _outputs = [{ address: externalChangeAddress, value: outputs[0].value }];

        // TODO: fix the inherited legacy code
        return this.buildTransaction(_outputs, feePerByte, inputs as unknown as Input[]);
    }

    public async signPSBT(data: string, inputs: PsbtInputTarget[]) {

        throw new Error('Method not implemented.');
        const psbt = Psbt.fromBase64(data, { network: this._network });
        for (const input of inputs) {
            const keyPair = await this.keyPair(input.derivationPath);
            psbt.signInput(input.index, keyPair);
        }
        return psbt.toBase64();
    }

    public async signBatchP2SHTransaction(
        inputs: [{ inputTxHex: string; index: number; vout: any; outputScript: Buffer; txInputIndex?: number }],
        addresses: string,
        tx: any,
        lockTime?: number,
        segwit?: boolean
    ) {
        const keyPairs = [];
        for (const address of addresses) {
            const wallet = await this.getWalletAddress(address);
            const keyPair = await this.keyPair(wallet.derivationPath);
            keyPairs.push(keyPair);
        }

        const sigs = [];
        for (let i = 0; i < inputs.length; i++) {
            const index = inputs[i].txInputIndex ? inputs[i].txInputIndex : inputs[i].index;
            let sigHash;
            if (segwit) {
                sigHash = tx.hashForWitnessV0(index, inputs[i].outputScript, inputs[i].vout.vSat, VerusJsTransaction.SIGHASH_ALL);
            } else {
                sigHash = tx.hashForSignature(index, inputs[i].outputScript, VerusJsTransaction.SIGHASH_ALL);
            }

            const sig = script.signature.encode(keyPairs[i].sign(sigHash), VerusJsTransaction.SIGHASH_ALL);
            sigs.push(sig);
        }

        return sigs;
    }

    private async keyPair(derivationPath: string): Promise<any> {
        const wif = await this._toWIF(derivationPath);
        return ECPair.fromWIF(wif, utxolib.networks[this._network.name]);
    }

    private async _toWIF(derivationPath: string): Promise<string> {
        const node = await this.seedNode();
        const derivedPath = node.derivePath(derivationPath);
        const privateKey = derivedPath.privateKey;
        const pair = ECPair.fromPrivateKeyBuffer(privateKey, utxolib.networks[this._network.name]);
        const wif = pair.toWIF();
        return wif;
    }

    private async seedNode() {
        if (this._seedNode) {
            return this._seedNode;
        }

        const seed = await mnemonicToSeed(this._mnemonic);
        this._seedNode = fromSeed(seed);

        return this._seedNode;
    }
}
