const arg = require("arg");

const Kernel = artifacts.require('@aragon/os/build/contracts/kernel/Kernel')
const ACL = artifacts.require('@aragon/os/build/contracts/acl/ACL')

const Admin = artifacts.require('Admin')
const Avaldao = artifacts.require('Avaldao')
const FondoGarantiaVault = artifacts.require('FondoGarantiaVault')
const MoCStateMock = artifacts.require('MoCStateMock');
const RoCStateMock = artifacts.require('RoCStateMock');
const DocTokenMock = artifacts.require('DocTokenMock');
const RifTokenMock = artifacts.require('RifTokenMock');
const ExchangeRateProvider = artifacts.require('ExchangeRateProvider');
const BN = require('bn.js');

const { newDao, newApp } = require('../scripts/dao')
const { createPermission, grantPermission } = require('../scripts/permissions')

const args = arg({ '--network': String }, process.argv);
const network = args["--network"] || "rskRegtest";

function sleep() {
    if (network === "rskTestnet") {
        // 1 minuto
        return new Promise(resolve => setTimeout(resolve, 60000));
    } else if (network === "rskMainnet") {
        // 5 minuto
        return new Promise(resolve => setTimeout(resolve, 300000));
    }
    return new Promise(resolve => setTimeout(resolve, 1));
}

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {

    const VERSION = '1';
    const CHAIN_ID = await getChainId();

    const { log } = deployments;
    const { deployer, account1, account2, account3, account4, account5 } = await getNamedAccounts();

    console.log(`Network: ${CHAIN_ID} ${network}.`);

    let dao;
    let acl;
    if (process.env.DAO_ADDRESS) {
        // Se especificó la dirección de la DAO, por lo que no es creada.
        log(`Aragon DAO upgrade: ${process.env.DAO_ADDRESS}.`);
        dao = await Kernel.at(process.env.DAO_ADDRESS);
        acl = await ACL.at(await dao.acl());
    } else {
        // No se especificó DAO, por lo que es desplegada una nueva.
        log(`Aragon DAO deploy.`);
        // Deploy de la DAO
        const response = await newDao(deployer);
        dao = response.dao;
        acl = response.acl;
        await sleep();
    }

    log(` - DAO: ${dao.address}`);
    log(` - ACL: ${acl.address}`);

    log(`Admin deploy`);
    const adminBase = await Admin.new({ from: deployer });
    log(` - Admin Base: ${adminBase.address}`);
    await sleep();
    const adminAppAddress = await newApp(dao, 'admin', adminBase.address, deployer);
    const adminApp = await Admin.at(adminAppAddress);
    log(` - Admin: ${adminApp.address}`);
    await sleep();

    log(`Fondo de Garantía Vault deploy`);
    const fondoGarantiaVaultBase = await FondoGarantiaVault.new({ from: deployer });
    log(` - Fondo de Garantía Vault Base: ${fondoGarantiaVaultBase.address}`);
    await sleep();
    const fondoGarantiaVaultAppAddress = await newApp(dao, 'fondoGarantiaVault', fondoGarantiaVaultBase.address, deployer);
    const fondoGarantiaVaultApp = await FondoGarantiaVault.at(fondoGarantiaVaultAppAddress);
    log(` - Fondo de Garantía Vault: ${fondoGarantiaVaultApp.address}`);
    await sleep();

    log(`Avaldao deploy`);
    const avaldaoBase = await Avaldao.new({ from: deployer/*, gas: 6800000*/ });
    log(` - Avaldao Base: ${avaldaoBase.address}`);
    await sleep();
    const avaldaoAppAddress = await newApp(dao, 'avaldao', avaldaoBase.address, deployer);
    const avaldaoApp = await Avaldao.at(avaldaoAppAddress);
    log(` - Avaldao: ${avaldaoApp.address}`);
    await sleep();

    // Configuración de grupos y permisos

    log(`Set permissions`);

    let CREATE_PERMISSIONS_ROLE = await acl.CREATE_PERMISSIONS_ROLE();
    let SET_EXCHANGE_RATE_PROVIDER_ROLE = await fondoGarantiaVaultBase.SET_EXCHANGE_RATE_PROVIDER_ROLE();
    let ENABLE_TOKEN_ROLE = await fondoGarantiaVaultBase.ENABLE_TOKEN_ROLE();
    let TRANSFER_ROLE = await fondoGarantiaVaultBase.TRANSFER_ROLE()

    log(` - CREATE_PERMISSIONS_ROLE`);
    await grantPermission(acl, adminApp.address, acl.address, CREATE_PERMISSIONS_ROLE, deployer);
    await sleep();

    log(` - SET_EXCHANGE_RATE_PROVIDER_ROLE`);
    await createPermission(acl, deployer, fondoGarantiaVaultApp.address, SET_EXCHANGE_RATE_PROVIDER_ROLE, deployer);
    log(`     - Deployer: ${deployer}`);
    await sleep();

    log(` - ENABLE_TOKEN_ROLE`);
    await createPermission(acl, deployer, fondoGarantiaVaultApp.address, ENABLE_TOKEN_ROLE, deployer);
    log(`     - Deployer: ${deployer}`);
    await sleep();

    log(` - TRANSFER_ROLE`);
    await createPermission(acl, avaldaoApp.address, fondoGarantiaVaultApp.address, TRANSFER_ROLE, deployer);
    log(`     - Avaldao: ${avaldaoApp.address}`);
    await grantPermission(acl, account1, fondoGarantiaVaultApp.address, TRANSFER_ROLE, deployer);
    log(`     - Account 1: ${account1}`);
    await sleep();

    // Se inicializan los contratos.

    await adminApp.initialize(adminApp.address, account1);
    log(`Admin initialized`);
    await sleep();

    // ERC20 Token

    log(`- ERC20 Tokens`);

    let rifAddress;
    let docAddress;
    let DOC_PRICE = new BN('00001000000000000000000'); // Precio del DOC: 1,00 US$
    if (network === "rskRegtest") {

        let rifTokenMock = await RifTokenMock.new({ from: deployer });
        rifAddress = rifTokenMock.address;
        log(` - RifTokenMock: ${rifAddress}`);

        let docTokenMock = await DocTokenMock.new({ from: deployer });
        docAddress = docTokenMock.address;
        log(` - DocTokenMock: ${docAddress}`);

    } else if (network === "rskTestnet") {

        rifAddress = '0x19f64674d8a5b4e652319f5e239efd3bc969a1fe';
        docAddress = '0xCB46c0ddc60D18eFEB0E586C17Af6ea36452Dae0';

    } else if (network === "rskMainnet") {

        rifAddress = '0x2acc95758f8b5f583470ba265eb685a8f45fc9d5';
        docAddress = '0xe700691dA7b9851F2F35f8b8182c69c53CcaD9Db';
    }

    // Exchange Rate

    log(`- RBTC Exchange Rate`);

    const RBTC = '0x0000000000000000000000000000000000000000';

    let moCStateAddress;
    let roCStateAddress;

    if (network === "rskRegtest") {
        const RBTC_PRICE = new BN('58172000000000000000000'); // Precio del RBTC: 58172,00 US$
        const moCStateMock = await MoCStateMock.new(RBTC_PRICE, { from: deployer });
        moCStateAddress = moCStateMock.address;
        const RIF_PRICE = new BN('00000391974000000000000'); // Precio del RIF: 0,391974 US$
        const roCStateMock = await RoCStateMock.new(RIF_PRICE, { from: deployer });
        roCStateAddress = roCStateMock.address;
    } else if (network === "rskTestnet") {
        // MoCState de MOC Oracles en Testnet 
        moCStateAddress = "0x0adb40132cB0ffcEf6ED81c26A1881e214100555";
        // RoCState de MOC Oracles en Testnet 
        roCStateAddress = "0x496eD67F77D044C8d9471fe86085Ccb5DC4d2f63";
    } else if (network === "rskMainnet") {
        // MoCState de MOC Oracles en Mainnet 
        moCStateAddress = "0xb9C42EFc8ec54490a37cA91c423F7285Fa01e257";
        // RoCState de MOC Oracles en Mainnet 
        roCStateAddress = "0x541F68a796Fe5ae3A381d2Aa5a50b975632e40A6";
    }

    log(` - MoCState: ${moCStateAddress}`);
    log(` - RoCState: ${roCStateAddress}`);

    let exchangeRateProviderAddress;
    if (process.env.EXCHANGE_RATE_PROVIDER_ADDRESS) {
        // Se especificó la dirección del Exchange Rate Provider, por lo que no es creado.
        exchangeRateProviderAddress = process.env.EXCHANGE_RATE_PROVIDER_ADDRESS;
    } else {
        // No se especificó la dirección del Exchange Rate Provider, por lo que es creado.
        log(`Exchange Rate Provider deploy.`);
        const exchangeRateProvider = await ExchangeRateProvider.new(
            moCStateAddress,
            roCStateAddress,
            rifAddress,
            docAddress,
            DOC_PRICE,
            { from: deployer });
        exchangeRateProviderAddress = exchangeRateProvider.address;
        await sleep();
    }

    await fondoGarantiaVaultApp.initialize();
    log(`Fondo de Garantía Vault initialized`);

    log(` - ExchangeRateProvider: ${exchangeRateProviderAddress}`);
    await fondoGarantiaVaultApp.setExchangeRateProvider(exchangeRateProviderAddress, { from: deployer });
    await sleep();

    log(`Enable token funds`);

    await fondoGarantiaVaultApp.enableToken(RBTC, { from: deployer });
    log(` - Enable RBTC`);
    await sleep();

    await fondoGarantiaVaultApp.enableToken(rifAddress, { from: deployer });
    log(` - RifToken`);
    await sleep();

    await fondoGarantiaVaultApp.enableToken(docAddress, { from: deployer });
    log(` - DocToken`);
    await sleep();

    await avaldaoApp.initialize(fondoGarantiaVaultApp.address, "Avaldao", VERSION, CHAIN_ID, avaldaoApp.address);
    log(`Avaldao initialized`);
}