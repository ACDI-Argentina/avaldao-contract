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
const AVAL_STATUS_VIGENTE = 4;

const VERSION = '1';

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
    let CHAIN_ID;

    before(async () => {
        avaldaoBase = await newAvaldao(deployerAddress);
        vaultBase = await Vault.new({ from: deployerAddress });
        // Setup constants
        CREATE_AVAL_ROLE = await avaldaoBase.CREATE_AVAL_ROLE();
        RBTC = '0x0000000000000000000000000000000000000000';
        CHAIN_ID = await bre.getChainId();
    })

    beforeEach(async () => {

        try {




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
            await avaldao.initialize(vault.address, VERSION, CHAIN_ID, avaldaoContractAddress);

        } catch (err) {
            console.error(err);
        }
    });

    context('Inicialización', function () {

        it('Falla al reinicializar', async () => {

            await assertRevert(avaldao.initialize(vault.address, VERSION, CHAIN_ID, avaldao.address), errors.INIT_ALREADY_INITIALIZED)
        })
    });

    context('Manejo de Avales', function () {

        it('Creación de Aval', async () => {

            const avalId = '6130197bf45de20013f29190';

            let receipt = await avaldao.saveAval(avalId, INFO_CID, avaldaoAddress, comercianteAddress, avaladoAddress, { from: solicitanteAddress });

            let avalEventId = getEventArgument(receipt, 'SaveAval', 'id');
            assert.equal(avalEventId, avalId);

            let avales = await getAvales(avaldao);

            assert.equal(avales.length, 1)
            assertAval(avales[0], {
                id: avalId,
                infoCid: INFO_CID,
                avaldao: avaldaoAddress,
                solicitante: solicitanteAddress,
                comerciante: comercianteAddress,
                avalado: avaladoAddress,
                status: AVAL_STATUS_COMPLETADO
            });
        });

        it('Creación de Aval no autorizado', async () => {

            const avalId = '613147122919060012190e66';

            await assertRevert(avaldao.saveAval(
                avalId,
                INFO_CID,
                avaldaoAddress,
                comercianteAddress,
                avaladoAddress,
                { from: notAuthorized }
            ), errors.APP_AUTH_FAILED)
        });

        it('Edición de Aval', async () => {

            const avalId = '613166ebcccc9e0012c4229b';

            let receipt = await avaldao.saveAval(avalId, INFO_CID, avaldaoAddress, comercianteAddress, avaladoAddress, { from: solicitanteAddress });
            const avalEventId = getEventArgument(receipt, 'SaveAval', 'id');

            const NEW_INFO_CID = "b4B1A3935bF977bad5Ec753325B4CD8D889EF0e7e7c7424";
            const receiptUpdated = await avaldao.saveAval(avalEventId, NEW_INFO_CID, avaldaoAddress, comercianteAddress, avaladoAddress, { from: solicitanteAddress });
            const updatedAvalEventId = getEventArgument(receiptUpdated, 'SaveAval', 'id');

            assert.equal(avalEventId, updatedAvalEventId);

            const updatedAval = await avaldao.getAval(avalId);

            assertAval(updatedAval, {
                id: avalId,
                infoCid: NEW_INFO_CID,
                avaldao: avaldaoAddress,
                solicitante: solicitanteAddress,
                comerciante: comercianteAddress,
                avalado: avaladoAddress,
                status: AVAL_STATUS_COMPLETADO
            });
        });

        it('Edición de Aval no autorizado', async () => {

            const avalId = '61316fa69a53310013d86292';

            let receipt = await avaldao.saveAval(avalId, INFO_CID, avaldaoAddress, comercianteAddress, avaladoAddress, { from: solicitanteAddress });
            const avalEventId = getEventArgument(receipt, 'SaveAval', 'id');

            const NEW_INFO_CID = "b4B1A3935bF977bad5Ec753325B4CD8D889EF0e7e7c7424";

            await assertRevert(
                avaldao.saveAval(avalEventId, NEW_INFO_CID, avaldaoAddress, comercianteAddress, avaladoAddress, { from: notAuthorized }),
                errors.APP_AUTH_FAILED
            );
        });
    });

    context('Firma de Avales', function () {

        it.skip('Firma de aval', async () => {

            const avalId = '613389b55ee0c60012a42adf';
            const infoCid = '/ipfs/QmWCKd1JacFZ3W2ygfYT4uwvmAsnrA6QZ9X5k3mPxb8QjW'

            const typedData = {
                types: {
                    EIP712Domain: [
                        { name: 'name', type: 'string' },
                        { name: 'version', type: 'string' },
                        { name: 'chainId', type: 'uint256' },
                        { name: 'verifyingContract', type: 'address' }
                    ],
                    AvalSignable: [
                        { name: 'id', type: 'string' },
                        { name: 'infoCid', type: 'string' },
                        { name: 'avaldao', type: 'address' },
                        { name: 'solicitante', type: 'address' },
                        { name: 'comerciante', type: 'address' },
                        { name: 'avalado', type: 'address' }
                    ]
                },
                primaryType: 'AvalSignable',
                domain: {
                    name: 'Avaldao',
                    version: VERSION,
                    chainId: CHAIN_ID,
                    verifyingContract: config.avaldaoContractAddress
                },
                message: {
                    id: avalId,
                    infoCid: infoCid,
                    avaldao: avaldaoAddress,
                    solicitante: solicitanteAddress,
                    comerciante: comercianteAddress,
                    avalado: avaladoAddress
                }
            };

            const data = JSON.stringify(typedData);

            let result = await bre.network.provider.request(
                {
                    method: "eth_signTypedData_v4",
                    params: [avaldaoAddress, data],
                    from: avaldaoAddress
                });

            console.log('Firma.', result);

            // TODO El método bre.network.provider.request no es una función en Buidler.
            // Según la documentación de Hardhat, éste puede invocarse, pero no hay nada respecto Buidler.
            // https://hardhat.org/hardhat-network/reference/
            // Una vez migrado a Hardhat (Issue https://github.com/ACDI-Argentina/avaldao/issues/23)
            // debe agregarse este test.
        });
    });
})