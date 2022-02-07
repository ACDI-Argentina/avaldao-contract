require('dotenv').config({ path: `./scripts/utils/.env.${process.env.NODE_ENV}` });

var Web3 = require('web3');
var FondoGarantiaVaultJson = require('../../artifacts/FondoGarantiaVault.json');
var ERC20Json = require('../../artifacts/ERC20.json');

async function main() {

    const { NETWORK_NODE_URL,
        AVALDAO_CONTRACT_ADDRESS,
        VAULT_CONTRACT_ADDRESS,
        RIF_TOKEN_ADDRESS,
        DOC_TOKEN_ADDRESS,
        AVALDAO_ADDRESS,
        SOLICITANTE_ADDRESS,
        COMERCIANTE_ADDRESS,
        AVALADO_ADDRESS } = process.env;

    // - privateKey: 9b467901129c0ee1366819d8df37fb9c4f87e875b36ff05739831cebdfc5d5e7

    console.log(`${new Date()}`);
    console.log(`Fondeo de cuentas y contratos`);
    console.log(`  Network: ${NETWORK_NODE_URL}`);
    console.log(`  Avaldao Contract: ${AVALDAO_CONTRACT_ADDRESS}`);
    console.log(`  Vault Contract: ${VAULT_CONTRACT_ADDRESS}`);
    console.log(`  RIF Token: ${RIF_TOKEN_ADDRESS}`);
    console.log(`  DOC Token: ${DOC_TOKEN_ADDRESS}`);
    console.log(`  Usuarios`);
    console.log(`   - Avaldao: ${AVALDAO_ADDRESS}`);
    console.log(`   - Solicitante: ${SOLICITANTE_ADDRESS}`);
    console.log(`   - Comerciante: ${COMERCIANTE_ADDRESS}`);
    console.log(`   - Avalado: ${AVALADO_ADDRESS}`);

    var web3 = new Web3(NETWORK_NODE_URL);

    var from = process.env.TRANSFER_FROM_ADDRESS;
    var value = web3.utils.toWei(process.env.TRANSFER_VALUE);
    const RBTC = '0x0000000000000000000000000000000000000000';

    // Ver https://github.com/trufflesuite/truffle/issues/2160

    console.log(`  Transferencias`);

    // Vault
    var vault = new web3.eth.Contract(FondoGarantiaVaultJson.abi, VAULT_CONTRACT_ADDRESS);
    await vault.methods.deposit(RBTC, value).send({
        value: value,
        from: from
    });
    console.log('   - Transferencia de RBTC al Fondo de Garantía.');

    // Avaldao
    await web3.eth.sendTransaction({
        from: from,
        to: AVALDAO_ADDRESS,
        value: value
    });
    console.log('   - Transferencia de RBTC a Avaldao.');

    // Solicitante
    await web3.eth.sendTransaction({
        from: from,
        to: SOLICITANTE_ADDRESS,
        value: value
    });
    console.log('   - Transferencia de RBTC a Solicitante.');

    // Comerciante
    await web3.eth.sendTransaction({
        from: from,
        to: COMERCIANTE_ADDRESS,
        value: value
    });
    console.log('   - Transferencia de RBTC a Comerciante.');

    // Avalado
    await web3.eth.sendTransaction({
        from: from,
        to: AVALADO_ADDRESS,
        value: value
    });
    console.log('   - Transferencia de RBTC a Avalado.');

    // Use BigNumber
    let decimals = web3.utils.toBN(18);
    let amount = web3.utils.toBN(500);
    // calculate ERC20 token amount
    value = amount.mul(web3.utils.toBN(10).pow(decimals));

    // RIF Token
    // Get ERC20 Token contract instance
    let rifContract = new web3.eth.Contract(ERC20Json.abi, RIF_TOKEN_ADDRESS);

    // DOC Token
    // Get ERC20 Token contract instance
    let docContract = new web3.eth.Contract(ERC20Json.abi, DOC_TOKEN_ADDRESS);

    // Vault
    await rifContract.methods.approve(VAULT_CONTRACT_ADDRESS, value).send({ from: from });
    await vault.methods.deposit(RIF_TOKEN_ADDRESS, value).send({
        from: from
    });
    console.log('   - Transferencia de RIF al Fondo de Garantía.');
    await docContract.methods.approve(VAULT_CONTRACT_ADDRESS, value).send({ from: from });
    await vault.methods.deposit(DOC_TOKEN_ADDRESS, value).send({
        from: from
    });
    console.log('   - Transferencia de DOC al Fondo de Garantía.');

    // Avaldao
    await rifContract.methods.transfer(AVALDAO_ADDRESS, value).send({ from: from });
    console.log('   - Transferencia de RIF a Avaldao.');
    await docContract.methods.transfer(AVALDAO_ADDRESS, value).send({ from: from });
    console.log('   - Transferencia de DOC a Avaldao.');

    // Solicitante
    await rifContract.methods.transfer(SOLICITANTE_ADDRESS, value).send({ from: from });
    console.log('   - Transferencia de RIF a Solicitante.');
    await docContract.methods.transfer(SOLICITANTE_ADDRESS, value).send({ from: from });
    console.log('   - Transferencia de DOC a Solicitante.');
    // Comerciante
    await rifContract.methods.transfer(COMERCIANTE_ADDRESS, value).send({ from: from });
    console.log('   - Transferencia de RIF a Comerciante.');
    await docContract.methods.transfer(COMERCIANTE_ADDRESS, value).send({ from: from });
    console.log('   - Transferencia de DOC a Comerciante.');
    // Avalado
    await rifContract.methods.transfer(AVALADO_ADDRESS, value).send({ from: from });
    console.log('   - Transferencia de RIF a Avalado.');
    await docContract.methods.transfer(AVALADO_ADDRESS, value).send({ from: from });
    console.log('   - Transferencia de DOC a Avaldao.');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });