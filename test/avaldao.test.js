const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { getEventArgument } = require('@aragon/test-helpers/events')
const { newDao, newApp } = require('../scripts/dao')
const { newAvaldao, getAvales, INFO_CID } = require('./helpers/avaldao')
const { assertAval } = require('./helpers/asserts')
const { createPermission, grantPermission } = require('../scripts/permissions')
const { errors } = require('./helpers/errors')
const Avaldao = artifacts.require('Avaldao')
const Vault = artifacts.require('Vault')

const ethUtil = require('ethereumjs-util');
const { signHash } = require('./helpers/sign')
const bre = require("@nomiclabs/buidler")

// 0: Status.Solicitado;
// 1: Status.Rechazado;
// 2: Status.Aceptado;
// 3: Status.Completado;
// 4: Status.Vigente;
// 5: Status.Finalizado;
const AVAL_STATUS_COMPLETADO = 3;

contract('Avaldao App', (accounts) => {
    const [
        deployerAddress,
        avaldaoAddress,
        solicitanteAddress,
        comercianteAddress,
        avaladoAddress,
        notAuthorized
    ] = accounts;

    let avaldaoBase, avaldao;
    let vaultBase, vault;
    let RBTC;

    before(async () => {
        avaldaoBase = await newAvaldao(deployerAddress);
        vaultBase = await Vault.new({ from: deployerAddress });
        // Setup constants
        CREATE_AVAL_ROLE = await avaldaoBase.CREATE_AVAL_ROLE();
        RBTC = '0x0000000000000000000000000000000000000000';
    })

    beforeEach(async () => {

        try {

            const VERSION = '1';
            const chainId = await bre.getChainId();

            // Deploy de la DAO
            const { dao, acl } = await newDao(deployerAddress);

            // Deploy de contratos y proxies
            const avaldaoContractAddress = await newApp(dao, "avaldao", avaldaoBase.address, deployerAddress);
            const vaultAddress = await newApp(dao, "vault", vaultBase.address, deployerAddress);
            avaldao = await Avaldao.at(avaldaoContractAddress);
            vault = await Vault.at(vaultAddress);

            // Configuración de permisos
            await createPermission(acl, solicitanteAddress, avaldao.address, CREATE_AVAL_ROLE, deployerAddress);

            // Inicialización
            await vault.initialize()
            await avaldao.initialize(vault.address, VERSION, chainId, avaldaoContractAddress);

        } catch (err) {
            console.error(err);
        }
    });

    context('Inicialización', function () {

        it('Falla al reinicializar', async () => {

            const VERSION = '1';
            const chainId = await bre.getChainId();

            await assertRevert(avaldao.initialize(vault.address, VERSION, chainId, avaldao.address), errors.INIT_ALREADY_INITIALIZED)
        })
    });

    context('Manejo de Avales', function () {

        it('Creación de Aval', async () => {

            let receipt = await avaldao.saveAval(0, INFO_CID, avaldaoAddress, comercianteAddress, avaladoAddress, { from: solicitanteAddress });

            let avalId = getEventArgument(receipt, 'SaveAval', 'id');
            assert.equal(avalId, 1);

            let avales = await getAvales(avaldao);

            assert.equal(avales.length, 1)
            assertAval(avales[0], {
                id: 1,
                infoCid: INFO_CID,
                avaldao: avaldaoAddress,
                solicitante: solicitanteAddress,
                comerciante: comercianteAddress,
                avalado: avaladoAddress,
                status: AVAL_STATUS_COMPLETADO
            });
        });

        it('Creación de Aval no autorizado', async () => {

            await assertRevert(avaldao.saveAval(
                0,
                INFO_CID,
                avaldaoAddress,
                comercianteAddress,
                avaladoAddress,
                { from: notAuthorized }
            ), errors.APP_AUTH_FAILED)
        });

        it('Edición de Aval', async () => {

            let receipt = await avaldao.saveAval(0, INFO_CID, avaldaoAddress, comercianteAddress, avaladoAddress, { from: solicitanteAddress });
            const avalId = getEventArgument(receipt, 'SaveAval', 'id');

            const NEW_INFO_CID = "b4B1A3935bF977bad5Ec753325B4CD8D889EF0e7e7c7424";
            const receiptUpdated = await avaldao.saveAval(avalId, NEW_INFO_CID, avaldaoAddress, comercianteAddress, avaladoAddress, { from: solicitanteAddress });
            const updatedAvalId = getEventArgument(receiptUpdated, 'SaveAval', 'id');

            assert.equal(avalId.toNumber(), updatedAvalId.toNumber());

            const updatedAval = await avaldao.getAval(avalId);

            assertAval(updatedAval, {
                id: avalId.toNumber(),
                infoCid: NEW_INFO_CID,
                avaldao: avaldaoAddress,
                solicitante: solicitanteAddress,
                comerciante: comercianteAddress,
                avalado: avaladoAddress,
                status: AVAL_STATUS_COMPLETADO
            });
        });

        it('Edición de Aval no autorizado', async () => {

            let receipt = await avaldao.saveAval(0, INFO_CID, avaldaoAddress, comercianteAddress, avaladoAddress, { from: solicitanteAddress });
            const avalId = getEventArgument(receipt, 'SaveAval', 'id');

            const NEW_INFO_CID = "b4B1A3935bF977bad5Ec753325B4CD8D889EF0e7e7c7424";

            await assertRevert(
                avaldao.saveAval(avalId, NEW_INFO_CID, avaldaoAddress, comercianteAddress, avaladoAddress, { from: notAuthorized }),
                errors.APP_AUTH_FAILED
            );
        });

        it('Edición de Aval inexistente', async () => {
            await assertRevert(
                avaldao.saveAval(10, INFO_CID, avaldaoAddress, comercianteAddress, avaladoAddress, { from: solicitanteAddress }),
                errors.AVALDAO_AVAL_NOT_EXIST
            );
        });
    });

    /*context('Firma de Avales', function () {

        it('Firma de Aval', async () => {

            const privateKey = ethUtil.keccak256('cow');
            const address = ethUtil.privateToAddress(privateKey);
            const sig = ethUtil.ecsign(signHash(), privateKey);

            console.log('Private key: ' + privateKey);
            console.log('Address: ' + address);
            console.log('Sig: ' + sig);
        });
    });*/
})