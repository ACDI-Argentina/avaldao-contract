var Web3 = require('web3');
var network = "http://localhost:4444";

async function main() {

    var text = 'AVALADO_ROLE';
    var web3 = new Web3(network);
    var keccak256 = web3.utils.keccak256(text);
    console.log('');
    console.log(`Get keccak256: ${text}: ${keccak256}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });