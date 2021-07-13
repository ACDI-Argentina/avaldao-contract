const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { newDao, newApp } = require('../scripts/dao')
const { newAvaldao } = require('./helpers/avaldao')
const { errors } = require('./helpers/errors')
const Avaldao = artifacts.require('Avaldao')
const Vault = artifacts.require('Vault')

contract('Avaldao App', (accounts) => {
    const [
        deployer
    ] = accounts;

    let avaldaoBase, avaldao;
    let vaultBase, vault;
    let RBTC;

    before(async () => {
        avaldaoBase = await newAvaldao(deployer);
        vaultBase = await Vault.new({ from: deployer });
        RBTC = '0x0000000000000000000000000000000000000000';
    })

    beforeEach(async () => {

        try {

            // Deploy de la DAO
            const { dao, acl } = await newDao(deployer);

            // Deploy de contratos y proxies
            const avaldaoAddress = await newApp(dao, "avaldao", avaldaoBase.address, deployer);
            const vaultAddress = await newApp(dao, "vault", vaultBase.address, deployer);
            avaldao = await Avaldao.at(avaldaoAddress);
            vault = await Vault.at(vaultAddress);

            // Configuración de permisos
            //await createPermission(acl, delegate, avaldao.address, ROLE, deployer);

            // Inicialización
            await vault.initialize()
            await avaldao.initialize(vault.address);

        } catch (err) {
            console.error(err);
        }
    });

    context('Inicialización', function () {

        it('Falla al reinicializar', async () => {
            await assertRevert(avaldao.initialize(vault.address), errors.INIT_ALREADY_INITIALIZED)
        })
    });
})