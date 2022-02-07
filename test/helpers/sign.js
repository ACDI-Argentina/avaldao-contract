const ethUtil = require('ethereumjs-util');

const typedData = {
    types: {
        EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' },
            { name: 'salt', type: 'bytes32' }
        ],
        Aval: [
            { name: 'id', type: 'uint256' },
            { name: 'infoCid', type: 'string' },
            { name: 'avaldao', type: 'address' },
            { name: 'solicitante', type: 'address' },
            { name: 'comerciante', type: 'address' },
            { name: 'avalado', type: 'address' }
        ]
    },
    primaryType: 'Aval',
    domain: {
        name: 'Avaldao',
        version: '1',
        chainId: 1,
        verifyingContract: '0x669E348cAd8aBeB10F489bF81c685f3eEA72798F',
        salt: '0xf2d857f4a3edcb9b78b4d503bfe733db1e3f6cdc2b7971ee739626c97e86a558'
    },
    message: {
        id: 1,
        infoCid: 'Qmd4PvCKbFbbB8krxajCSeHdLXQamdt7yFxFxzTbedwiYM',
        avaldao: '0xeFb80DB9E2d943A492Bd988f4c619495cA815643',
        solicitante: '0xeFb80DB9E2d943A492Bd988f4c619495cA815643',
        comerciante: '0xeFb80DB9E2d943A492Bd988f4c619495cA815643',
        avalado: '0xeFb80DB9E2d943A492Bd988f4c619495cA815643'
    }
};

const signHash = () => {
    return ethUtil.keccak256(
        Buffer.concat([
            Buffer.from('1901', 'hex'),
            structHash('EIP712Domain', typedData.domain),
            structHash(typedData.primaryType, typedData.message),
        ]),
    );
}

const structHash = (primaryType, data) => {
    return ethUtil.keccak256(encodeData(primaryType, data));
}

module.exports = {
    signHash
}
