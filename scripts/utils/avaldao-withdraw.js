require('dotenv').config({ path: `./scripts/utils/.env.${process.env.NODE_ENV}` });

var Web3 = require('web3');
var VaultJson = require('../../artifacts/FondoGarantiaVault.json');
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
        VAULT_CONTRACT_ADDRESS,
        RIF_TOKEN_ADDRESS,
        DOC_TOKEN_ADDRESS,
        AVALDAO_ADDRESS,
        AVALDAO_PRIVATE_KEY,
        WITHDRAW_TOKEN,
        WITHDRAW_TO,
        WITHDRAW_VALUE } = process.env;

    console.log(`${new Date()}`);
    console.log(`Retiro de fondos`);
    console.log(`  Network: ${NETWORK_NODE_URL}`);
    console.log(`  Vault Contract: ${VAULT_CONTRACT_ADDRESS}`);
    console.log(`  Avaldao: ${AVALDAO_ADDRESS}`);
    console.log(`  Withdraw token: ${WITHDRAW_TOKEN}`);
    console.log(`  Withdraw to: ${WITHDRAW_TO}`);
    console.log(`  Withdraw value: ${WITHDRAW_VALUE}`);

    var web3 = new Web3(NETWORK_NODE_URL);

    let vaultContract = new web3.eth.Contract(VaultJson.abi, VAULT_CONTRACT_ADDRESS);
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

    // Tx
    // ----------------------------

    const common = Common.custom({ chainId: NETWORK_CHAIN_ID });
    const avaldaoPrivateKey = Buffer.from(AVALDAO_PRIVATE_KEY, 'hex');
    const nonce = await web3.eth.getTransactionCount(AVALDAO_ADDRESS, 'latest'); // nonce starts counting from 0
    const withdrawData = vaultContract.methods.transfer(
        WITHDRAW_TOKEN,
        WITHDRAW_TO,
        web3.utils.toWei(process.env.WITHDRAW_VALUE)
    ).encodeABI();

    var txParams = {
        to: VAULT_CONTRACT_ADDRESS,
        data: withdrawData,
        nonce: nonce,
        gasLimit: 500000
    }

    const tx = Transaction.fromTxData(txParams, { common });
    const signedTx = tx.sign(avaldaoPrivateKey);
    const serializedTx = signedTx.serialize();

    await web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'));

    console.log('');
    console.log('-------------------------');
    console.log('Fondos retirados');
    console.log('-------------------------');

    // ----------------------------
    // Tx

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