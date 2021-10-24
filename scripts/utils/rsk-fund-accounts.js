var Web3 = require('web3');
var network = "http://localhost:4444";

var VaultJson = require('../../artifacts/Vault.json');
var ERC20Json = require('../../artifacts/ERC20.json');

// Vault Contract
var vaultAddress = '0x669E348cAd8aBeB10F489bF81c685f3eEA72798F';

// USUARIOS

// Avaldao
var avaldaoAddress = '0xee4b388fb98420811C9e04AE8378330C05A2735a';
// - privateKey: 9b467901129c0ee1366819d8df37fb9c4f87e875b36ff05739831cebdfc5d5e7

// Solicitante
var solicitanteAddress = '0x0bfA3B6b0E799F2eD34444582187B2cDf2fB11a7';
// - privateKey: 86c79a03e812f125e29839c03a69c519f24c6e6ce317a5d94f64c558738a03d2

// Comerciante
var comercianteAddress = '0x36d1d3c43422EF3B1d7d23F20a25977c29BC3f0e';
// - privateKey: a6c6da072a2561cedb4287bdd4b7cf6ce57bf83dd877c610b9883f3fbb92abdb

// Avalado
var avaladoAddress = '0x9063541acBD959baeB6Bf64158944b7e5844534a';
// - privateKey: 75953f08fb622421656e6d345ed618ba8b286f485c420bbca82c6ee611b2a1f7

const RBTC = '0x0000000000000000000000000000000000000000';

async function main() {

    console.log('');
    console.log('RSK Node Status');
    console.log(`  Network: ${network}`);
    console.log('-------------------------------------------');

    var web3 = new Web3(network);

    // Ver https://github.com/trufflesuite/truffle/issues/2160

    var from = '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826';
    var value = web3.utils.toWei('1');

    // Vault
    var vault = new web3.eth.Contract(VaultJson.abi, vaultAddress);
    await vault.methods.deposit(RBTC, value).send({
        value: value,
        from: from
    });
    console.log('  - Transferencia de RBTC al Fondo de Garantía.');

    // Avaldao
    await web3.eth.sendTransaction({
        from: from,
        to: avaldaoAddress,
        value: value
    });
    console.log('  - Transferencia de RBTC a Avaldao.');

    // Solicitante
    await web3.eth.sendTransaction({
        from: from,
        to: solicitanteAddress,
        value: value
    });
    console.log('  - Transferencia de RBTC a Solicitante.');

    // Comerciante
    await web3.eth.sendTransaction({
        from: from,
        to: comercianteAddress,
        value: value
    });
    console.log('  - Transferencia de RBTC a Comerciante.');

    // Avalado
    await web3.eth.sendTransaction({
        from: from,
        to: avaladoAddress,
        value: value
    });
    console.log('  - Transferencia de RBTC a Avalado.');

    // Use BigNumber
    let decimals = web3.utils.toBN(18);
    let amount = web3.utils.toBN(500);
    // calculate ERC20 token amount
    value = amount.mul(web3.utils.toBN(10).pow(decimals));

    // RIF Token
    let rifTokenAddress = '0x463F29B11503e198f6EbeC9903b4e5AaEddf6D29';
    // Get ERC20 Token contract instance
    let rifContract = new web3.eth.Contract(ERC20Json.abi, rifTokenAddress);

    // DOC Token
    let docTokenAddress = '0x987c1f13d417F7E04d852B44badc883E4E9782e1';
    // Get ERC20 Token contract instance
    let docContract = new web3.eth.Contract(ERC20Json.abi, docTokenAddress);

    // Vault
    await rifContract.methods.approve(vaultAddress, value).send({ from: from });
    await vault.methods.deposit(rifTokenAddress, value).send({
        from: from
    });
    console.log('  - Transferencia de RIF al Fondo de Garantía.');
    await docContract.methods.approve(vaultAddress, value).send({ from: from });
    await vault.methods.deposit(docTokenAddress, value).send({
        from: from
    });
    console.log('  - Transferencia de DOC al Fondo de Garantía.');

    // Avaldao
    await rifContract.methods.transfer(avaldaoAddress, value).send({ from: from });
    console.log('  - Transferencia de RIF a Avaldao.');
    await docContract.methods.transfer(avaldaoAddress, value).send({ from: from });
    console.log('  - Transferencia de DOC a Avaldao.');

    // Solicitante
    await rifContract.methods.transfer(solicitanteAddress, value).send({ from: from });
    console.log('  - Transferencia de RIF a Solicitante.');
    await docContract.methods.transfer(solicitanteAddress, value).send({ from: from });
    console.log('  - Transferencia de DOC a Solicitante.');
    // Comerciante
    await rifContract.methods.transfer(comercianteAddress, value).send({ from: from });
    console.log('  - Transferencia de RIF a Comerciante.');
    await docContract.methods.transfer(comercianteAddress, value).send({ from: from });
    console.log('  - Transferencia de DOC a Comerciante.');
    // Avalado
    await rifContract.methods.transfer(avaladoAddress, value).send({ from: from });
    console.log('  - Transferencia de RIF a Avalado.');
    await docContract.methods.transfer(avaladoAddress, value).send({ from: from });
    console.log('  - Transferencia de DOC a Avaldao.');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });