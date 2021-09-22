const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { getEventArgument } = require('@aragon/test-helpers/events')
const { newDao, newApp } = require('../scripts/dao')
const { newAvaldao, getAvales, INFO_CID } = require('./helpers/avaldao')
const { assertAval } = require('./helpers/asserts')
const { createPermission, grantPermission } = require('../scripts/permissions')
const { errors } = require('./helpers/errors')
const Avaldao = artifacts.require('Avaldao')
const Vault = artifacts.require('Vault')
//Price providers
const ExchangeRateProvider = artifacts.require('ExchangeRateProvider')
const MoCStateMock = artifacts.require('./mocks/MoCStateMock')
const RoCStateMock = artifacts.require('./mocks/RoCStateMock')
const RifTokenMock = artifacts.require('./mocks/RifTokenMock')
const DocTokenMock = artifacts.require('./mocks/DocTokenMock')
const BN = require('bn.js');
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
    let RBTC_PRICE;
    let RIF_PRICE;
    let DOC_PRICE;
    let CHAIN_ID;

    before(async () => {
        avaldaoBase = await newAvaldao(deployerAddress);
        vaultBase = await Vault.new({ from: deployerAddress });
        // Setup constants
        SET_EXCHANGE_RATE_PROVIDER = await avaldaoBase.SET_EXCHANGE_RATE_PROVIDER();
        CREATE_AVAL_ROLE = await avaldaoBase.CREATE_AVAL_ROLE();
        ENABLE_TOKEN_ROLE = await avaldaoBase.ENABLE_TOKEN_ROLE();
        RBTC = '0x0000000000000000000000000000000000000000';
        RBTC_PRICE = new BN('58172000000000000000000'); // Precio del RBTC: 58172,00 US$
        RIF_PRICE = new BN('00000391974000000000000'); // Precio del RIF: 0,391974 US$
        DOC_PRICE = new BN('00001000000000000000000'); // Precio del DOC: 1,00 US$
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
            await createPermission(acl, deployerAddress, avaldao.address, SET_EXCHANGE_RATE_PROVIDER, deployerAddress);
            await createPermission(acl, deployerAddress, avaldao.address, ENABLE_TOKEN_ROLE, deployerAddress);
            await createPermission(acl, solicitanteAddress, avaldao.address, CREATE_AVAL_ROLE, deployerAddress);

            // Inicialización
            await vault.initialize()
            await avaldao.initialize(vault.address, VERSION, CHAIN_ID, avaldaoContractAddress);

            // Se habilita el RBTC para mantener fondos de garantía.
            await avaldao.enableToken(RBTC, { from: deployerAddress });

            //Inicializacion de Token y Price Provider

            const rifTokenMock = await RifTokenMock.new({ from: deployerAddress });
            const docTokenMock = await DocTokenMock.new({ from: deployerAddress });

            const moCStateMock = await MoCStateMock.new(RBTC_PRICE);
            const roCStateMock = await RoCStateMock.new(RIF_PRICE);
            const exchangeRateProvider = await ExchangeRateProvider.new(
                moCStateMock.address,
                roCStateMock.address,
                rifTokenMock.address,
                docTokenMock.address,
                DOC_PRICE,
                { from: deployerAddress });

            await avaldao.setExchangeRateProvider(exchangeRateProvider.address);

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
            const monto = 10000;
            const cuotasCantidad = 6;

            let receipt = await avaldao.saveAval(
                avalId,
                INFO_CID,
                avaldaoAddress,
                comercianteAddress,
                avaladoAddress,
                monto,
                cuotasCantidad,
                {
                    from: solicitanteAddress
                }
            );

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
                monto: monto,
                cuotasCantidad: cuotasCantidad,
                status: AVAL_STATUS_COMPLETADO
            });
        });

        it('Creación de Aval no autorizado', async () => {

            const avalId = '613147122919060012190e66';
            const monto = 10000;
            const cuotasCantidad = 6;
            
            await assertRevert(avaldao.saveAval(
                avalId,
                INFO_CID,
                avaldaoAddress,
                comercianteAddress,
                avaladoAddress,
                monto,
                cuotasCantidad,
                {
                    from: notAuthorized
                }
            ), errors.APP_AUTH_FAILED)
        });

        it('Edición de Aval', async () => {

            const avalId = '613166ebcccc9e0012c4229b';
            const monto = 10000;
            const cuotasCantidad = 6;

            let receipt = await avaldao.saveAval(
                avalId,
                INFO_CID,
                avaldaoAddress,
                comercianteAddress,
                avaladoAddress,
                monto,
                cuotasCantidad,
                {
                    from: solicitanteAddress
                }
            );
            const avalEventId = getEventArgument(receipt, 'SaveAval', 'id');

            const NEW_INFO_CID = "b4B1A3935bF977bad5Ec753325B4CD8D889EF0e7e7c7424";
            const receiptUpdated = await avaldao.saveAval(
                avalEventId,
                NEW_INFO_CID,
                avaldaoAddress,
                comercianteAddress,
                avaladoAddress,
                monto,
                cuotasCantidad,
                {
                    from: solicitanteAddress
                }
            );
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
                monto: monto,
                cuotasCantidad: cuotasCantidad,
                status: AVAL_STATUS_COMPLETADO
            });
        });

        it('Edición de Aval no autorizado', async () => {

            const avalId = '61316fa69a53310013d86292';
            const monto = 10000;
            const cuotasCantidad = 6;

            let receipt = await avaldao.saveAval(
                avalId,
                INFO_CID,
                avaldaoAddress,
                comercianteAddress,
                avaladoAddress,
                monto,
                cuotasCantidad,
                {
                    from: solicitanteAddress
                }
            );
            const avalEventId = getEventArgument(receipt, 'SaveAval', 'id');

            const NEW_INFO_CID = "b4B1A3935bF977bad5Ec753325B4CD8D889EF0e7e7c7424";

            await assertRevert(
                avaldao.saveAval(
                    avalEventId,
                    NEW_INFO_CID,
                    avaldaoAddress,
                    comercianteAddress,
                    avaladoAddress,
                    monto,
                    cuotasCantidad,
                    {
                        from: notAuthorized
                    }
                ),
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

    context('Fondo de garantía', function () {

        it('Fondo de garantía cero', async () => {

            const availableFundFiatExpected = new BN('0');
            const availableFundFiat = await avaldao.getAvailableFundFiat();

            assert.equal(availableFundFiat.toString(), availableFundFiatExpected.toString());
        });
    });
})