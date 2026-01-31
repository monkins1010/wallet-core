import Chain from './Chain';
import Nft from './Nft';
import Wallet from './Wallet';

export default class Client<
    ChainType extends Chain<any> = Chain<any>,
    WalletType extends Wallet<any, any> = Wallet<any, any>,
    NftType extends Nft<any, any> = Nft<any, any>
> {
    private _chain: ChainType;
    private _wallet: WalletType;
    private _nft: NftType;

    constructor(chain?: ChainType, wallet?: WalletType, nft?: NftType) {
        this._chain = chain;
        this._wallet = wallet;
        this._nft = nft;
    }

    connect(provider: ChainType | WalletType | NftType) {
        switch (true) {
            case provider instanceof Chain: {
                this.chain = provider as ChainType;
                if (this.wallet) {
                    this.wallet.setChainProvider(this.chain);
                }
                break;
            }

            case provider instanceof Wallet: {
                this.wallet = provider as WalletType;
                this.connectChain();

                if (this.nft) {
                    this.nft.setWallet(this.wallet);
                }
                break;
            }

            case provider instanceof Nft: {
                this._nft = provider as NftType;
                this.connectWallet(this.nft);
                this.connectChain();
                break;
            }
        }

        return this;
    }

    get chain() {
        return this._chain;
    }

    set chain(chain: ChainType) {
        this._chain = chain;
    }

    get wallet() {
        return this._wallet;
    }

    set wallet(wallet: WalletType) {
        this._wallet = wallet;
    }

    get nft() {
        return this._nft;
    }

    set nft(nft: NftType) {
        this._nft = nft;
    }

    private connectChain() {
        const chain = this.wallet?.getChainProvider() as ChainType;
        if (chain) {
            this.chain = chain;
        }
    }

    private connectWallet(source: NftType) {
        const wallet = source?.getWallet() as WalletType;
        if (wallet) {
            this.wallet = wallet;
        }
    }
}
