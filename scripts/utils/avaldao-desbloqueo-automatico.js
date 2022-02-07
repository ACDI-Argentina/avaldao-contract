require('dotenv').config({ path: `./scripts/utils/.env.${process.env.NODE_ENV}` });

var Web3 = require('web3');
var AvaldaoJson = require('../../artifacts/Avaldao.json');
var ERC20Json = require('../../artifacts/ERC20.json');

var Transaction = require('@ethereumjs/tx').Transaction;
var Common = require('@ethereumjs/common').default;

/**
 * How to Send Ethereum Transactions Using Web3
 * https://betterprogramming.pub/how-to-send-ethereum-transactions-using-web3-d05e0c95f820
 * https://web3js.readthedocs.io/en/v1.7.0/web3-eth.html#sendsignedtransaction
 * 
 */
async function main() {

    const { NETWORK_CHAIN_ID,
        NETWORK_NODE_URL,
        AVALDAO_CONTRACT_ADDRESS,
        VAULT_CONTRACT_ADDRESS,
        RIF_TOKEN_ADDRESS,
        DOC_TOKEN_ADDRESS,
        AVALDAO_ADDRESS,
        AVALDAO_PRIVATE_KEY } = process.env;

    console.log(`${new Date()}`);
    console.log(`Desbloqueo automático de fondos`);
    console.log(`  Network: ${NETWORK_NODE_URL}`);
    console.log(`  Avaldao Contract: ${AVALDAO_CONTRACT_ADDRESS}`);
    console.log(`  Vault Contract: ${VAULT_CONTRACT_ADDRESS}`);
    console.log(`  RIF Token: ${RIF_TOKEN_ADDRESS}`);
    console.log(`  DOC Token: ${DOC_TOKEN_ADDRESS}`);
    console.log(`  Avaldao: ${AVALDAO_ADDRESS}`);

    var web3 = new Web3(NETWORK_NODE_URL);

    let avaldaoContract = new web3.eth.Contract(AvaldaoJson.abi, AVALDAO_CONTRACT_ADDRESS);
    // Get ERC20 Token contract instance
    let rifContract = new web3.eth.Contract(ERC20Json.abi, RIF_TOKEN_ADDRESS);
    // Get ERC20 Token contract instance
    let docContract = new web3.eth.Contract(ERC20Json.abi, DOC_TOKEN_ADDRESS);

    console.log('');
    console.log('Balances iniciales de Vault');
    console.log('---------------------------');

    let vaultBalance = await web3.eth.getBalance(VAULT_CONTRACT_ADDRESS);
    let vaultRifBalance = await rifContract.methods.balanceOf(VAULT_CONTRACT_ADDRESS).call();
    let vaultDocBalance = await docContract.methods.balanceOf(VAULT_CONTRACT_ADDRESS).call();

    console.log(` - Vault RBTC Balance: ${vaultBalance}`);
    console.log(` - Vault RIF Balance: ${vaultRifBalance}`);
    console.log(` - Vault DOC Balance: ${vaultDocBalance}`);

    const avalBalances = new Map();

    const avalIds = await avaldaoContract.methods.getAvalIds().call();

    // Balances de avales previo al desbloqueo.

    for (let i = 0; i < avalIds.length; i++) {

        const avalAddress = await avaldaoContract.methods.getAvalAddress(avalIds[i]).call();

        let rbtcBalance = await web3.eth.getBalance(avalAddress);
        let rifBalance = await rifContract.methods.balanceOf(avalAddress).call();
        let docBalance = await docContract.methods.balanceOf(avalAddress).call();

        let balances = {
            prev: {
                rbtcBalance: rbtcBalance,
                rifBalance: rifBalance,
                docBalance: docBalance
            },
            post: {
                rbtcBalance: null,
                rifBalance: null,
                docBalance: null
            }
        };

        avalBalances.set(avalAddress, balances);
    }

    // Desbloqueo de todos los fondos de avales.

    // Tx
    // ----------------------------

    const common = Common.custom({ chainId: NETWORK_CHAIN_ID });
    const avaldaoPrivateKey = Buffer.from(AVALDAO_PRIVATE_KEY, 'hex');
    const nonce = await web3.eth.getTransactionCount(AVALDAO_ADDRESS, 'latest'); // nonce starts counting from 0
    const unlockFundsData = avaldaoContract.methods.unlockFunds().encodeABI();

    var txParams = {
        to: AVALDAO_CONTRACT_ADDRESS,
        data: unlockFundsData,
        nonce: nonce,
        gasLimit: 500000
    }

    const tx = Transaction.fromTxData(txParams, { common });
    const signedTx = tx.sign(avaldaoPrivateKey);
    const serializedTx = signedTx.serialize();

    await web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'));

    // ----------------------------
    // Tx

    // Balances de avales posterior al desbloqueo.

    let avalAddressIt = avalBalances.keys();
    let avalAddressOb = avalAddressIt.next();
    while (!avalAddressOb.done) {

        let avalAddress = avalAddressOb.value;
        let rbtcBalance = await web3.eth.getBalance(avalAddress);
        let rifBalance = await rifContract.methods.balanceOf(avalAddress).call();
        let docBalance = await docContract.methods.balanceOf(avalAddress).call();

        let balances = avalBalances.get(avalAddress);

        balances.post.rbtcBalance = rbtcBalance;
        balances.post.rifBalance = rifBalance;
        balances.post.docBalance = docBalance;

        avalAddressOb = avalAddressIt.next();
    }

    avalAddressIt = avalBalances.keys();
    avalAddressOb = avalAddressIt.next();
    while (!avalAddressOb.done) {

        let avalAddress = avalAddressOb.value;

        let balances = avalBalances.get(avalAddress);

        console.log('-------------------------------------------');
        console.log(`  Aval Contract: ${avalAddress}`);
        console.log('  -------------');
        console.log('  Prev');
        console.log(`    RBTC Balance: ${balances.prev.rbtcBalance}`);
        console.log(`    RIF Balance: ${balances.prev.rifBalance}`);
        console.log(`    DOC Balance: ${balances.prev.docBalance}`);
        console.log('  Post');
        console.log(`    RBTC Balance: ${balances.post.rbtcBalance}`);
        console.log(`    RIF Balance: ${balances.post.rifBalance}`);
        console.log(`    DOC Balance: ${balances.post.docBalance}`);

        avalAddressOb = avalAddressIt.next();
    }

    vaultBalance = await web3.eth.getBalance(VAULT_CONTRACT_ADDRESS);
    vaultRifBalance = await rifContract.methods.balanceOf(VAULT_CONTRACT_ADDRESS).call();
    vaultDocBalance = await docContract.methods.balanceOf(VAULT_CONTRACT_ADDRESS).call();

    console.log('');
    console.log('Balances finales de Vault');
    console.log('-------------------------');
    console.log(` - Vault RBTC Balance: ${vaultBalance}`);
    console.log(` - Vault RIF Balance: ${vaultRifBalance}`);
    console.log(` - Vault DOC Balance: ${vaultDocBalance}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });