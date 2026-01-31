import { Chain, Wallet } from '../../client';
import { selectCoins, normalizeTransactionObject, decodeRawTransaction, CoinSelectTarget } from '../utils'
import {
  AddressTxCounts,
  AddressType as VerusAddressType,
  VerusNetwork,
  VerusWalletProviderOptions,
  Input,
  OutputTarget,
  Output,
  PsbtInputTarget,
  Transaction as VerusTransaction,
  UTXO,
} from '../types';

import { Transaction, Address, BigNumber, TransactionRequest, AddressType, Asset } from '../../types'
import { asyncSetImmediate } from '../../utils'
import { VerusBaseChainProvider } from '../chain/VerusBaseChainProvider';
import { InsufficientBalanceError } from '../../errors'
import { BIP32Interface } from '../../bitcoin/crypto'
import memoize from 'memoizee'
import OPS from 'bitcoin-ops'

const bitgo = require('@bitgo/utxo-lib') // eslint-disable-line

const { script } = bitgo;

const ADDRESS_GAP = 20

export enum AddressSearchType {
  EXTERNAL,
  CHANGE,
  EXTERNAL_OR_CHANGE
}

type DerivationCache = { [index: string]: Address }

export abstract class VerusBaseWalletProvider<T extends VerusBaseChainProvider = any, S = any> extends Wallet<T, S> {

  protected _baseDerivationPath: string
  protected _network: VerusNetwork
  protected _addressType: VerusAddressType
  protected _derivationCache: DerivationCache

  constructor(options: VerusWalletProviderOptions, chainProvider?: Chain<T>) {

    const { baseDerivationPath, addressType = VerusAddressType.RADDRESS } = options
    const addressTypes = Object.values(VerusAddressType)
    if (!addressTypes.includes(addressType)) {
      throw new Error(`addressType must be one of ${addressTypes.join(',')}`)
    }

    super(chainProvider)

    this._baseDerivationPath = baseDerivationPath
    this._network = chainProvider ? (chainProvider.getNetwork() as VerusNetwork) : options.network;
    this._addressType = addressType
    this._derivationCache = {}
  }

  protected onChainProviderUpdate(chainProvider: Chain<T>) {
    this._network = chainProvider.getNetwork() as VerusNetwork;
  }
  protected abstract baseDerivationNode(): Promise<BIP32Interface>
  protected abstract buildTransaction(
    targets: OutputTarget[],
    feePerByte?: number,
    fixedInputs?: Input[]
  ): Promise<{ hex: string; fee: number }>
  protected abstract buildSweepTransaction(
    externalChangeAddress: string,
    feePerByte?: number
  ): Promise<{ hex: string; fee: number }>
  abstract signPSBT(data: string, inputs: PsbtInputTarget[]): Promise<string>
  abstract signBatchP2SHTransaction(
    inputs: [{ inputTxHex: string; index: number; vout: any; outputScript: Buffer }],
    addresses: string,
    tx: any,
    lockTime?: number,
    segwit?: boolean
  ): Promise<Buffer[]>

  getDerivationCache() {
    return this._derivationCache
  }

  sendOptionsToOutputs(transactions: TransactionRequest[]): OutputTarget[] {
    const targets: OutputTarget[] = []

    transactions.forEach((tx) => {
      if (tx.to && tx.value && tx.value.gt(0)) {
        targets.push({
          address: tx.to.toString(),
          value: tx.value.toNumber()
        })
      }

      if (tx.data) {
        const scriptBuffer = script.compile([OPS.OP_RETURN, Buffer.from(tx.data, 'hex')])
        targets.push({
          value: 0,
          script: scriptBuffer
        })
      }
    })

    return targets
  }

  async setDerivationCache(derivationCache: DerivationCache) {
    const address = await this.getDerivationPathAddress(Object.keys(derivationCache)[0])
    if (derivationCache[address.derivationPath].address !== address.address) {
      throw new Error(`derivationCache at ${address.derivationPath} does not match`)
    }
    this._derivationCache = derivationCache
  }

  protected async _sendTransaction(transactions: OutputTarget[], feePerByte?: number) {
    const { hex, fee } = await this.buildTransaction(transactions, feePerByte);
    await this.chainProvider.sendRawTransaction(hex);
    return normalizeTransactionObject(decodeRawTransaction(hex, this._network), fee);
  }

  public async sendTransaction(options: TransactionRequest) {
    return this._sendTransaction(this.sendOptionsToOutputs([options]), options.fee as number)
  }

  public async sendBatchTransaction(transactions: TransactionRequest[]) {
    return [await this._sendTransaction(this.sendOptionsToOutputs(transactions))];
  }

  public async sendSweepTransaction(externalChangeAddress: AddressType, _asset: Asset, feePerByte: number) {
    const { hex, fee } = await this.buildSweepTransaction(externalChangeAddress.toString(), feePerByte);
    await this.chainProvider.sendRawTransaction(hex);
    return normalizeTransactionObject(decodeRawTransaction(hex, this._network), fee);
  }

  async updateTransactionFee(tx: Transaction<VerusTransaction> | string, newFeePerByte: number) {
    const txHash = typeof tx === 'string' ? tx : tx.hash
    const transaction: VerusTransaction = (await this.chainProvider.getTransactionByHash(txHash))._raw;
    const fixedInputs = [transaction.vin[0]] // TODO: should this pick more than 1 input? RBF doesn't mandate it

    const lookupAddresses = transaction.vout.map((vout: Output) => vout.scriptPubKey.addresses[0])
    const changeAddress = await this.findAddress(lookupAddresses, true)
    const changeOutput = transaction.vout.find((vout: Output) => vout.scriptPubKey.addresses[0] === changeAddress.address)

    let outputs = transaction.vout
    if (changeOutput) {
      outputs = outputs.filter((vout: Output) => vout.scriptPubKey.addresses[0] !== changeOutput.scriptPubKey.addresses[0])
    }

    // TODO more checks?
    const transactions = outputs.map((output: Output) => ({
      address: output.scriptPubKey.addresses[0],
      value: new BigNumber(output.value).times(1e8).toNumber()
    }))
    const { hex, fee } = await this.buildTransaction(transactions, newFeePerByte, fixedInputs)
    await this.chainProvider.sendRawTransaction(hex);
    return normalizeTransactionObject(decodeRawTransaction(hex, this._network), fee)
  }

  async findAddress(addresses: string[], change = false) {
    // A maximum number of addresses to lookup after which it is deemed that the wallet does not contain this address
    const maxAddresses = 5000
    const addressesPerCall = 50
    let index = 0
    while (index < maxAddresses) {
      const walletAddresses = await this.getAddresses(index, addressesPerCall, change)
      const walletAddress = walletAddresses.find((walletAddr) =>
        addresses.find((addr) => walletAddr.address === addr)
      )
      if (walletAddress) return walletAddress
      index += addressesPerCall
    }
  }

  public async getWalletAddress(address: string) {
    const externalAddress = await this.findAddress([address], false);
    if (externalAddress) {
      return externalAddress;
    }

    const changeAddress = await this.findAddress([address], true);
    if (changeAddress) {
      return changeAddress;
    }

    throw new Error('Wallet does not contain address');
  }

  getAddressFromPublicKey(publicKey: Buffer | Uint8Array) {
    const pubkeyBuffer = Buffer.from(publicKey);
    return bitgo.ECPair.fromPublicKeyBuffer(pubkeyBuffer, bitgo.networks[this._network.name]).getAddress()
  }

  protected async getDerivationPathAddress(path: string) {
    if (path in this._derivationCache) {
      return this._derivationCache[path]
    }

    const baseDerivationNode = await this.baseDerivationNode()
    const subPath = path.replace(this._baseDerivationPath + '/', '')
    const publicKey = baseDerivationNode.derivePath(subPath).publicKey
    const address = this.getAddressFromPublicKey(publicKey)
    const addressObject = new Address({
      address,
      publicKey: Buffer.from(publicKey).toString('hex'),
      derivationPath: path
    })

    this._derivationCache[path] = addressObject
    return addressObject
  }

  async getAddresses(startingIndex = 0, numAddresses = 1, change = false) {
    if (numAddresses < 1) {
      throw new Error('You must return at least one address')
    }

    const addresses = []
    const lastIndex = startingIndex + numAddresses
    const changeVal = change ? '1' : '0'

    for (let currentIndex = startingIndex; currentIndex < lastIndex; currentIndex++) {
      const subPath = changeVal + '/' + currentIndex
      const path = this._baseDerivationPath + '/' + subPath
      const addressObject = await this.getDerivationPathAddress(path)
      addresses.push(addressObject)

      await asyncSetImmediate()
    }

    return addresses
  }

  async _getUsedUnusedAddresses(numAddressPerCall = 100, addressType: AddressSearchType) {
    const usedAddresses = []
    const addressCountMap = { change: 0, external: 0 }
    const unusedAddressMap: { change: Address; external: Address } = { change: null, external: null }

    let addrList: Address[]
    let addressIndex = 0
    let changeAddresses: Address[] = []
    let externalAddresses: Address[] = []

    /* eslint-disable no-unmodified-loop-condition */
    while (
      (addressType === AddressSearchType.EXTERNAL_OR_CHANGE &&
        (addressCountMap.change < ADDRESS_GAP || addressCountMap.external < ADDRESS_GAP)) ||
      (addressType === AddressSearchType.EXTERNAL && addressCountMap.external < ADDRESS_GAP) ||
      (addressType === AddressSearchType.CHANGE && addressCountMap.change < ADDRESS_GAP)
    ) {
      /* eslint-enable no-unmodified-loop-condition */
      addrList = []

      if (
        (addressType === AddressSearchType.EXTERNAL_OR_CHANGE || addressType === AddressSearchType.CHANGE) &&
        addressCountMap.change < ADDRESS_GAP
      ) {
        // Scanning for change addr
        changeAddresses = await this.getAddresses(addressIndex, numAddressPerCall, true)
        addrList = addrList.concat(changeAddresses)
      } else {
        changeAddresses = []
      }

      if (
        (addressType === AddressSearchType.EXTERNAL_OR_CHANGE || addressType === AddressSearchType.EXTERNAL) &&
        addressCountMap.external < ADDRESS_GAP
      ) {
        // Scanning for non change addr
        externalAddresses = await this.getAddresses(addressIndex, numAddressPerCall, false)
        addrList = addrList.concat(externalAddresses)
      }

      const transactionCounts: AddressTxCounts = await this.chainProvider.getProvider().getAddressTransactionCounts(addrList);

      for (const address of addrList) {
        const isUsed = transactionCounts[address.toString()] > 0;
        const isChangeAddress = changeAddresses.find((a) => address.toString() === a.toString());
        const key = isChangeAddress ? 'change' : 'external';

        if (isUsed) {
          usedAddresses.push(address);
          addressCountMap[key] = 0;
          unusedAddressMap[key] = null;
        } else {
          addressCountMap[key]++;

          if (!unusedAddressMap[key]) {
            unusedAddressMap[key] = address;
          }
        }
      }

      addressIndex += numAddressPerCall;
    }

    return {
      usedAddresses,
      unusedAddress: unusedAddressMap
    }
  }

  async getUsedAddresses(numAddressPerCall = 100) {
    return this._getUsedUnusedAddresses(numAddressPerCall, AddressSearchType.EXTERNAL_OR_CHANGE).then(
      ({ usedAddresses }) => usedAddresses
    )
  }

  async getUnusedAddress(change = false, numAddressPerCall = 100) {
    const addressType = change ? AddressSearchType.CHANGE : AddressSearchType.EXTERNAL
    const key = change ? 'change' : 'external'
    return this._getUsedUnusedAddresses(numAddressPerCall, addressType).then(
      ({ unusedAddress }) => unusedAddress[key]
    )
  }

  protected async withCachedUtxos(func: () => any) {
    const originalProvider = this.chainProvider.getProvider();
    const memoizedGetFeePerByte = memoize(originalProvider.getFeePerByte, { primitive: true });
    const memoizedGetUnspentTransactions = memoize(originalProvider.getUnspentTransactions, { primitive: true });
    const memoizedGetAddressTransactionCounts = memoize(originalProvider.getAddressTransactionCounts, { primitive: true });

    const newProvider = originalProvider;
    newProvider.getFeePerByte = memoizedGetFeePerByte;
    newProvider.getUnspentTransactions = memoizedGetUnspentTransactions;
    newProvider.getAddressTransactionCounts = memoizedGetAddressTransactionCounts;

    this.chainProvider.setProvider(newProvider);
    const result = await func.bind(this)();
    this.chainProvider.setProvider(originalProvider);

    return result;
  }

  async getTotalFee(opts: TransactionRequest, max: boolean) {
    const targets = this.sendOptionsToOutputs([opts])
    if (!max) {
      const { fee } = await this.getInputsForAmount(targets, opts.fee as number)
      return fee
    } else {
      const { fee } = await this.getInputsForAmount(
        targets.filter((t) => !t.value),
        opts.fee as number,
        [],
        100,
        true
      )
      return fee
    }
  }

  async getTotalFees(transactions: TransactionRequest[], max: boolean) {
    const fees = await this.withCachedUtxos(async () => {
      const fees: { [index: number]: BigNumber } = {}
      for (const tx of transactions) {
        const fee = await this.getTotalFee(tx, max)
        fees[tx.fee as number] = new BigNumber(fee)
      }
      return fees
    })
    return fees
  }

  async getInputsForAmount(
    _targets: OutputTarget[],
    feePerByte?: number,
    fixedInputs: Input[] = [],
    numAddressPerCall = 100,
    sweep = false
  ) {
    let addressIndex = 0
    let changeAddresses: Address[] = []
    let externalAddresses: Address[] = []
    const addressCountMap = {
      change: 0,
      nonChange: 0
    }

    const feePerBytePromise = this.chainProvider.getProvider().getFeePerByte();
    let utxos: UTXO[] = []

    while (addressCountMap.change < ADDRESS_GAP || addressCountMap.nonChange < ADDRESS_GAP) {
      let addrList: Address[] = []

      if (addressCountMap.change < ADDRESS_GAP) {
        // Scanning for change addr
        changeAddresses = await this.getAddresses(addressIndex, numAddressPerCall, true)
        addrList = addrList.concat(changeAddresses)
      } else {
        changeAddresses = []
      }

      if (addressCountMap.nonChange < ADDRESS_GAP) {
        // Scanning for non change addr
        externalAddresses = await this.getAddresses(addressIndex, numAddressPerCall, false)
        addrList = addrList.concat(externalAddresses)
      }

      const fixedUtxos: UTXO[] = []
      if (fixedInputs.length > 0) {
        for (const input of fixedInputs) {
          const txHex = await this.chainProvider.getProvider().getRawTransactionByHash(input.txid);
          const tx = decodeRawTransaction(txHex, this._network)
          const value = new BigNumber(tx.vout[input.vout].value).times(1e8).toNumber()
          const address = tx.vout[input.vout].scriptPubKey.addresses[0]
          const walletAddress = await this.getWalletAddress(address)
          const utxo = { ...input, value, address, derivationPath: walletAddress.derivationPath }
          fixedUtxos.push(utxo)
        }
      }

      if (!sweep || fixedUtxos.length === 0) {
        const _utxos: UTXO[] = await this.chainProvider.getProvider().getUnspentTransactions(addrList);
        utxos.push(
          ..._utxos.map((utxo) => {
            const addr = addrList.find((a) => a.address === utxo.address)
            return {
              ...utxo,
              derivationPath: addr.derivationPath
            }
          })
        )
      } else {
        utxos = fixedUtxos
      }

      const utxoBalance = utxos.reduce((a, b) => a + (b.value || 0), 0)

      const transactionCounts: AddressTxCounts = await this.chainProvider.getProvider().getAddressTransactionCounts(addrList);

      if (!feePerByte) feePerByte = await feePerBytePromise;
      const minRelayFee = await this.chainProvider.getProvider().getMinRelayFee();
      if (feePerByte < minRelayFee) {
        throw new Error(`Fee supplied (${feePerByte} sat/b) too low. Minimum relay fee is ${minRelayFee} sat/b`);
      }

      let targets: CoinSelectTarget[]
      if (sweep) {
        const outputBalance = _targets.reduce((a, b) => a + (b['value'] || 0), 0)

        const sweepOutputSize = 39
        const paymentOutputSize = _targets.filter((t) => t.value && t.address).length * 39
        const scriptOutputSize = _targets
          .filter((t) => !t.value && t.script)
          .reduce((size, t) => size + 39 + t.script.byteLength, 0)

        const outputSize = sweepOutputSize + paymentOutputSize + scriptOutputSize
        const inputSize = utxos.length * 153

        const sweepFee = feePerByte * (inputSize + outputSize)
        const amountToSend = new BigNumber(utxoBalance).minus(sweepFee)

        targets = _targets.map((target) => ({ id: 'main', value: target.value, script: target.script }))
        targets.push({ id: 'main', value: amountToSend.minus(outputBalance).toNumber() })
      } else {
        targets = _targets.map((target) => ({ id: 'main', value: target.value, script: target.script }))
      }

      const { inputs, outputs, change, fee } = selectCoins(utxos, targets, Math.ceil(feePerByte), fixedUtxos)

      if (inputs && outputs) {
        return {
          inputs,
          change,
          outputs,
          fee
        }
      }


      for (const address of addrList) {
        const isUsed = transactionCounts[address.address];
        const isChangeAddress = changeAddresses.find((a) => address.address === a.address);
        const key = isChangeAddress ? 'change' : 'nonChange';

        if (isUsed) {
          addressCountMap[key] = 0;
        } else {
          addressCountMap[key]++;
        }
      }

      addressIndex += numAddressPerCall;
    }

    throw new InsufficientBalanceError('Not enough balance')
  }
}