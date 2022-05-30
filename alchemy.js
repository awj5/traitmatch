'use strict';

import { createAlchemyWeb3 } from '@alch/alchemy-web3'
const apiKey = 'kA0GvyDvzb_9brFE0cU4YM5cKdbdmWe9'
const web3 = createAlchemyWeb3(`https://eth-mainnet.alchemyapi.io/v2/${ apiKey }`)

/* Queries */

const getNFT = async (request, response) => {
    const nft = await web3.alchemy.getNftMetadata({
        contractAddress: request.params.contract,
        tokenId: request.params.token
    })

    response.status(200).json(nft)
}

const getContracts = async (request, response) => {
    const wallet = await web3.alchemy.getNfts({
        owner: request.params.wallet,
        pageKey: request.params.page ? request.params.page : undefined
    })

    response.status(200).json(wallet)
}

const getContractNFTs = async (request, response) => {
    const wallet = await web3.alchemy.getNfts({
        owner: request.params.wallet,
        contractAddresses: [request.params.collection]
    })

    response.status(200).json(wallet)
}

/* Export */

export default { getNFT, getContracts, getContractNFTs }