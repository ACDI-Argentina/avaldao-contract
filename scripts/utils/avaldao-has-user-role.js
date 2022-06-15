require('dotenv').config({ path: `./scripts/utils/.env.${process.env.NODE_ENV}` });

var Web3 = require('web3');
var AdminJson = require('../../artifacts/Admin.json');

/**
 * Consulta por role de un usuario.
 * 
 */
async function main() {

    const {
        NETWORK_NODE_URL,
        ADMIN_CONTRACT_ADDRESS } = process.env;

    const SOLICITANTE_ROLE = "SOLICITANTE_ROLE";

    console.log(`${new Date()}`);
    console.log(`Has user role`);
    console.log(`  Network: ${NETWORK_NODE_URL}`);
    console.log(`  Admin Contract: ${ADMIN_CONTRACT_ADDRESS}`);

    var web3 = new Web3(NETWORK_NODE_URL);

    let adminContract = new web3.eth.Contract(AdminJson.abi, ADMIN_CONTRACT_ADDRESS);

    const hasUserRole = await adminContract.methods.hasUserRole(
        //"0xFEF920D44230D08dDcCDcBA539c2c1C03D76D8D8",
        "0xFEF920D44230D08dDcCDcBA539c2c1C03D76D8D8",
        //"0xF3DC026B103EeEB4df54806E325Ce1C16cBB5Ed0",
        "0x8B5A25dBAdfA0c252060ee0b052B59dAf1009F13",
        web3.utils.keccak256(SOLICITANTE_ROLE)).call();


    console.log(`Has user role: ${hasUserRole}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });