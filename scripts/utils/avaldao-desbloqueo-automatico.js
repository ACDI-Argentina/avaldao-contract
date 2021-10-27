var Web3 = require('web3');
var AvaldaoJson = require('../../artifacts/Avaldao.json');
var AvalJson = require('../../artifacts/Aval.json');
var ERC20Json = require('../../artifacts/ERC20.json');

async function main() {

    var network;
    var avaldaoContractAddress;
    var avaldaoAddress;
    var vaultAddress;
    // RIF Token
    let rifTokenAddress;
    // DOC Token
    let docTokenAddress;

    if (/*process.env.NETWORK === 'regtest'*/true) {
        network = "http://localhost:4444";
        avaldaoContractAddress = '0x05A55E87d40572ea0F9e9D37079FB9cA11bdCc67';
        avaldaoAddress = '0xee4b388fb98420811C9e04AE8378330C05A2735a';
        // - privateKey: 9b467901129c0ee1366819d8df37fb9c4f87e875b36ff05739831cebdfc5d5e7
        vaultAddress = '0x669E348cAd8aBeB10F489bF81c685f3eEA72798F';

        // RIF Token
        rifTokenAddress = '0x463F29B11503e198f6EbeC9903b4e5AaEddf6D29';
        // DOC Token
        docTokenAddress = '0x987c1f13d417F7E04d852B44badc883E4E9782e1';

    } else if (process.env.NETWORK === 'testnet') {

    }

    const avalAddress = '0x6ff5BB53B6dB6Dcba65F3552B07df22Cf217C7A4';

    var web3 = new Web3(network);

    // Get ERC20 Token contract instance
    let rifContract = new web3.eth.Contract(ERC20Json.abi, rifTokenAddress);
    // Get ERC20 Token contract instance
    let docContract = new web3.eth.Contract(ERC20Json.abi, docTokenAddress);

    var avalBalance = await web3.eth.getBalance(avalAddress);
    var avalRifBalance = await rifContract.methods.balanceOf(avalAddress).call();
    var avalDocBalance = await docContract.methods.balanceOf(avalAddress).call();
    var vaultBalance = await web3.eth.getBalance(vaultAddress);
    var vaultRifBalance = await rifContract.methods.balanceOf(vaultAddress).call();
    var vaultDocBalance = await docContract.methods.balanceOf(vaultAddress).call();

    console.log('');
    console.log('Desbloqueo automático de fondos');
    console.log(`  Network: ${network}`);
    console.log(`  RIF Token: ${rifTokenAddress}`);
    console.log(`  DOC Token: ${docTokenAddress}`);
    console.log(`  Aval: ${avalAddress}`);
    console.log(`  Vault: ${vaultAddress}`);
    console.log('  -----');
    console.log(`  Aval RBTC Balance: ${avalBalance}`);
    console.log(`  Aval RIF Balance: ${avalRifBalance}`);
    console.log(`  Aval DOC Balance: ${avalDocBalance}`);
    console.log('  -----');
    console.log(`  Vault RBTC Balance: ${vaultBalance}`);
    console.log(`  Vault RIF Balance: ${vaultRifBalance}`);
    console.log(`  Vault DOC Balance: ${vaultDocBalance}`);
    console.log('-------------------------------------------');

    // Avaldao Contract

    var avaldaoContract = new web3.eth.Contract(AvaldaoJson.abi, avaldaoContractAddress);
    await avaldaoContract.methods.unlockFundAuto(avalAddress).send({
        from: avaldaoAddress,
        gas: 500000
    });
    console.log(`  Fondos de aval desbloqueados.`);

    /*var events = await avaldaoContract.getPastEvents(
        'Prueba',
        function (error, events) {
            //console.log(events);
        });
    console.log(events);*/

    /*var avaldaoContract = new web3.eth.Contract(AvaldaoJson.abi, avaldaoContractAddress);
    const gasEstimated = await avaldaoContract.methods.unlockFundAuto(avalAddress).estimateGas({
        from: avaldaoAddress
    });
    console.log(`  Gas estimated: ${gasEstimated}`);*/


    avalBalance = await web3.eth.getBalance(avalAddress);
    avalRifBalance = await rifContract.methods.balanceOf(avalAddress).call();
    avalDocBalance = await docContract.methods.balanceOf(avalAddress).call();
    vaultBalance = await web3.eth.getBalance(vaultAddress);
    vaultRifBalance = await rifContract.methods.balanceOf(vaultAddress).call();
    vaultDocBalance = await docContract.methods.balanceOf(vaultAddress).call();

    console.log('  -----');
    console.log(`  Aval RBTC Balance: ${avalBalance}`);
    console.log(`  Aval RIF Balance: ${avalRifBalance}`);
    console.log(`  Aval DOC Balance: ${avalDocBalance}`);
    console.log('  -----');
    console.log(`  Vault RBTC Balance: ${vaultBalance}`);
    console.log(`  Vault RIF Balance: ${vaultRifBalance}`);
    console.log(`  Vault DOC Balance: ${vaultDocBalance}`);
    console.log('  -----');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });