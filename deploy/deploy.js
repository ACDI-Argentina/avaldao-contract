const arg = require("arg");

const args = arg({ '--network': String }, process.argv);
const network = args["--network"] || "rskRegtest";

console.log(`[${new Date().toISOString()}] Deploying on ${network}...`);

const { newDao } = require('../scripts/dao')

function sleep() {
    // Mainnet
    //return new Promise(resolve => setTimeout(resolve, 300000));
    return new Promise(resolve => setTimeout(resolve, 1));
}

module.exports = async ({ getNamedAccounts, deployments }) => {

    const { log } = deployments;
    const { deployer, account1, account2, account3, account4, account5 } = await getNamedAccounts();

    log(`Aragon DAO deploy`);

    // Deploy de la DAO
    const { kernelBase, aclBase, dao, acl } = await newDao(deployer);

    log(` - Kernel Base: ${kernelBase.address}`);
    log(` - ACL Base: ${aclBase.address}`);
    log(` - DAO: ${dao.address}`);
    log(` - ACL: ${acl.address}`);

    //const dao = await Kernel.at('0xd598F0116dd8c36b4E2aEcF7ac54553E93bD340A');
    //const acl = await ACL.at(await dao.acl());

    await sleep();
}