const arg = require("arg");

const Kernel = artifacts.require('@aragon/os/build/contracts/kernel/Kernel')
const ACL = artifacts.require('@aragon/os/build/contracts/acl/ACL')

const Avaldao = artifacts.require('Avaldao')
const Vault = artifacts.require('Vault')
const MoCStateMock = artifacts.require('MoCStateMock');
const RoCStateMock = artifacts.require('RoCStateMock');
const DocTokenMock = artifacts.require('DocTokenMock');
const RifTokenMock = artifacts.require('RifTokenMock');
const ExchangeRateProvider = artifacts.require('ExchangeRateProvider');
const BN = require('bn.js');

const { newDao, newApp } = require('../scripts/dao')
const { createPermission, grantPermission } = require('../scripts/permissions')

const { linkLib,
    AVAL_LIB_PLACEHOLDER } = require('../scripts/libs')

const args = arg({ '--network': String }, process.argv);
const network = args["--network"] || "rskRegtest";



function sleep() {
    // Mainnet
    //return new Promise(resolve => setTimeout(resolve, 300000));
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
        log(`Aragon DAO update: ${process.env.DAO_ADDRESS}.`);
        dao = await Kernel.at(process.env.DAO_ADDRESS);
        acl = await ACL.at(await dao.acl());
    } else {
        // No se especificó DAO, por lo que es desplegada una nueva.
        log(`Aragon DAO deploy.`);
        // Deploy de la DAO
        const response = await newDao(deployer);
        dao = response.dao;
        acl = response.acl;
    }

    log(` - DAO: ${dao.address}`);
    log(` - ACL: ${acl.address}`);

    await sleep();

    log(`Avaldao deploy`);

    const avaldaoBase = await Avaldao.new({ from: deployer });
    log(` - Avaldao Base: ${avaldaoBase.address}`);
    await sleep();

    const avaldaoContractAddress = await newApp(dao, 'avaldao', avaldaoBase.address, deployer);
    const avaldao = await Avaldao.at(avaldaoContractAddress);
    log(` - Avaldao: ${avaldao.address}`);
    await sleep();

    const vaultBase = await Vault.new({ from: deployer });
    await sleep();
    const vaultAddress = await newApp(dao, 'avaldaoVault', vaultBase.address, deployer);
    await sleep();
    const vault = await Vault.at(vaultAddress);
    await sleep();

    log(` - Vault Base: ${vaultBase.address}`);
    log(` - Vault: ${vault.address}`);

    // Configuración de grupos y permisos

    log(` - Set groups`);

    log(` - Set permissions`);

    let CREATE_AVAL_ROLE = await avaldaoBase.CREATE_AVAL_ROLE();
    let SET_EXCHANGE_RATE_PROVIDER = await avaldaoBase.SET_EXCHANGE_RATE_PROVIDER();
    let ENABLE_TOKEN_ROLE = await avaldaoBase.ENABLE_TOKEN_ROLE();
    let TRANSFER_ROLE = await vaultBase.TRANSFER_ROLE()

    log(`   - CREATE_AVAL_ROLE`);
    await createPermission(acl, account1, avaldao.address, CREATE_AVAL_ROLE, deployer);
    await sleep();
    log(`       - Account1: ${account1}`);
    await grantPermission(acl, account2, avaldao.address, CREATE_AVAL_ROLE, deployer);
    await sleep();
    log(`       - Account2: ${account2}`);

    log(`   - SET_EXCHANGE_RATE_PROVIDER`);
    await createPermission(acl, deployer, avaldao.address, SET_EXCHANGE_RATE_PROVIDER, deployer);
    await sleep();
    log(`       - Deployer: ${deployer}`);

    log(`   - ENABLE_TOKEN_ROLE`);
    await createPermission(acl, deployer, avaldao.address, ENABLE_TOKEN_ROLE, deployer);

    await createPermission(acl, avaldao.address, vault.address, TRANSFER_ROLE, deployer);
    await sleep();
    log(`       - Avaldao: ${avaldao.address}`);

    // Inicialización
    await vault.initialize();
    await sleep();
    await avaldao.initialize(vault.address, VERSION, CHAIN_ID, avaldao.address);
    await sleep();

    // ERC20 Token

    log(` - ERC20 Tokens`);

    let rifAddress;
    let docAddress;
    let DOC_PRICE = new BN('00001000000000000000000'); // Precio del DOC: 1,00 US$
    if (network === "rskRegtest") {

        let rifTokenMock = await RifTokenMock.new({ from: deployer });
        rifAddress = rifTokenMock.address;
        log(`   - RifTokenMock: ${rifAddress}`);

        let docTokenMock = await DocTokenMock.new({ from: deployer });
        docAddress = docTokenMock.address;
        log(`   - DocTokenMock: ${docAddress}`);

    } else if (network === "rskTestnet") {

        // TODO
        rifAddress = '0x19f64674d8a5b4e652319f5e239efd3bc969a1fe';
        docAddress = '';

    } else if (network === "rskMainnet") {

        // TODO
        rifAddress = '0x2acc95758f8b5f583470ba265eb685a8f45fc9d5';
        docAddress = '';
    }

    // Exchange Rate

    log(` - RBTC Exchange Rate`);

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
        moCStateAddress = "0x541F68a796Fe5ae3A381d2Aa5a50b975632e40A6";
    }

    log(`   - MoCState: ${moCStateAddress}`);
    log(`   - RoCState: ${roCStateAddress}`);

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

    log(`   - ExchangeRateProvider: ${exchangeRateProviderAddress}`);
    await avaldao.setExchangeRateProvider(exchangeRateProviderAddress, { from: deployer });
    await sleep();

    log(` - Enable token funds`);

    await avaldao.enableToken(RBTC, { from: deployer });
    log(`   - Enable RBTC`);

    await avaldao.enableToken(rifAddress, { from: deployer });
    log(`   - RifToken`);
    
    await avaldao.enableToken(docAddress, { from: deployer });
    log(`   - DocToken`);

    log(` - Initialized`);
}