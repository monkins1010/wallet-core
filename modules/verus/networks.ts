import { VerusNetwork } from './types'
const bitgo = require('@bitgo/utxo-lib') // eslint-disable-line

const verus: VerusNetwork = {
    name: 'verus',
    ...bitgo.networks.verus,
    coinType: '0',
    isTestnet: false
}

const verus_testnet: VerusNetwork = {
    name: 'verustest',
    ...bitgo.networks.verustest,
    coinType: '0',
    isTestnet: true
}

const VerusNetworks = {
    verus,
    verus_testnet
}

export { VerusNetworks }
