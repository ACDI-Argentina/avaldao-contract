var Web3 = require('web3');
var network = "http://localhost:4444";
//var network = "https://public-node.testnet.rsk.co";

console.log('');
console.log('RSK Node Status');
console.log('  Network: ' + network);
console.log('-------------------------------------------');

var web3 = new Web3(network);

web3.eth.net.getId().then(id => {
    console.log('  Network Id ' + id);
});

web3.eth.net.getNetworkType().then(networkType => {
    console.log('  Network Type ' + networkType);
});

web3.eth.getAccounts().then(accounts => {
    console.log('  Accounts balances');
    accounts.forEach(account => {
        web3.eth.getBalance(account).then(balance => {
            console.log(`  - Balance ${account}: ${balance}`);
        })
    });
});

web3.eth.getBlockNumber().then(blockNumber => {
    console.log('Block Number: ' + blockNumber);
});

web3.eth.getBlock(1000).then(block => {
    //console.log('Block', block);
});

/*
web3.eth.getAccounts().then(accounts => {
    console.log('Balances');
    accounts.forEach(account => {
        web3.eth.getBalance(account).then(balance => {
            console.log(`Balance ${account}: ${balance}`);
        })
    });
});*/

/*let contractAddress = '0xAfCdFA78A5B7e86B317F7DbF95aB33A7aC920F77'
let index = 0
//console.log(web3.eth.getStorageAt(contractAddress, index))
web3.eth.getStorageAt(contractAddress, index).then(s => {
    console.log(s);
});*/
