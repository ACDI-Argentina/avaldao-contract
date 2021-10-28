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
const web3 = require("web3")

// 0: Status.Solicitado;
// 1: Status.Rechazado;
// 2: Status.Aceptado;
// 3: Status.Completado;
// 4: Status.Vigente;
// 5: Status.Finalizado;
const AVAL_STATUS_COMPLETADO = 3;
const AVAL_STATUS_VIGENTE = 4;

// 0: CuotaStatus.Pendiente;
const AVAL_CUOTA_STATUS_PENDIENTE = 0;

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
            await avaldao.initialize(vault.address, "Avaldao", VERSION, CHAIN_ID, avaldaoContractAddress);

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

            await assertRevert(avaldao.initialize(vault.address, "Avaldao", VERSION, CHAIN_ID, avaldao.address), errors.INIT_ALREADY_INITIALIZED)
        })
    });

    context('Manejo de Avales', function () {

        it('Creación de Aval', async () => {

            const avalId = '6130197bf45de20013f29190';
            const montoFiat = 60000;

            const usersArr = [solicitanteAddress, comercianteAddress, avaladoAddress, avaldaoAddress];

            // Cuota 1: Vencimiento Thursday, July 1, 2021 12:00:00 AM / Desbloqueo Saturday, July 10, 2021 12:00:00 AM
            const cuota1 = {
                numero: 1,
                montoFiat: 10000,
                timestampVencimiento: 1625097600,
                timestampDesbloqueo: 1625875200,
                status: AVAL_CUOTA_STATUS_PENDIENTE
            };

            // Cuota 2: Vencimiento Sunday, August 1, 2021 12:00:00 AM / Desbloqueo Tuesday, August 10, 2021 12:00:00 AM
            const cuota2 = {
                numero: 2,
                montoFiat: 10000,
                timestampVencimiento: 1627776000,
                timestampDesbloqueo: 1628553600,
                status: AVAL_CUOTA_STATUS_PENDIENTE
            };

            // Cuota 3: Wednesday, September 1, 2021 12:00:00 AM / Desbloqueo Friday, September 10, 2021 12:00:00 AM
            const cuota3 = {
                numero: 3,
                montoFiat: 10000,
                timestampVencimiento: 1630454400,
                timestampDesbloqueo: 1631232000,
                status: AVAL_CUOTA_STATUS_PENDIENTE
            };

            // Cuota 4: Vencimiento Friday, October 1, 2021 12:00:00 AM / Desbloqueo Sunday, October 10, 2021 12:00:00 AM
            const cuota4 = {
                numero: 4,
                montoFiat: 10000,
                timestampVencimiento: 1633046400,
                timestampDesbloqueo: 1633824000,
                status: AVAL_CUOTA_STATUS_PENDIENTE
            };

            // Cuota 5: Vencimiento Monday, November 1, 2021 12:00:00 AM / Desbloqueo Wednesday, November 10, 2021 12:00:00 AM
            const cuota5 = {
                numero: 5,
                montoFiat: 10000,
                timestampVencimiento: 1635724800,
                timestampDesbloqueo: 1636502400,
                status: AVAL_CUOTA_STATUS_PENDIENTE
            };

            // Cuota 6: Vencimiento Wednesday, December 1, 2021 12:00:00 AM / Desbloqueo Friday, December 10, 2021 12:00:00 AM
            const cuota6 = {
                numero: 6,
                montoFiat: 10000,
                timestampVencimiento: 1638316800,
                timestampDesbloqueo: 1639094400,
                status: AVAL_CUOTA_STATUS_PENDIENTE
            };

            const cuotas = [cuota1, cuota2, cuota3, cuota4, cuota5, cuota6];

            const timestampCuotas = [];
            for (let i = 0; i < cuotas.length; i++) {
                const cuota = cuotas[i];
                timestampCuotas.push(web3.utils.numberToHex(cuota.timestampVencimiento));
                timestampCuotas.push(web3.utils.numberToHex(cuota.timestampDesbloqueo));
            }

            let receipt = await avaldao.saveAval(
                avalId,
                INFO_CID,
                usersArr,
                montoFiat,
                timestampCuotas,
                { from: solicitanteAddress }
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
                montoFiat: montoFiat,
                cuotasCantidad: timestampCuotas.length / 2,
                cuotas: cuotas,
                status: AVAL_STATUS_COMPLETADO
            });
        });

        it('Creación de Aval no autorizado', async () => {

            const avalId = '613147122919060012190e66';
            const montoFiat = 60000;

            const usersArr = [solicitanteAddress, comercianteAddress, avaladoAddress, avaldaoAddress];

            // Cuota 1: Vencimiento Thursday, July 1, 2021 12:00:00 AM / Desbloqueo Saturday, July 10, 2021 12:00:00 AM
            const cuota1 = {
                numero: 1,
                montoFiat: 10000,
                timestampVencimiento: 1625097600,
                timestampDesbloqueo: 1625875200,
                status: AVAL_CUOTA_STATUS_PENDIENTE
            };

            // Cuota 2: Vencimiento Sunday, August 1, 2021 12:00:00 AM / Desbloqueo Tuesday, August 10, 2021 12:00:00 AM
            const cuota2 = {
                numero: 2,
                montoFiat: 10000,
                timestampVencimiento: 1627776000,
                timestampDesbloqueo: 1628553600,
                status: AVAL_CUOTA_STATUS_PENDIENTE
            };

            // Cuota 3: Wednesday, September 1, 2021 12:00:00 AM / Desbloqueo Friday, September 10, 2021 12:00:00 AM
            const cuota3 = {
                numero: 3,
                montoFiat: 10000,
                timestampVencimiento: 1630454400,
                timestampDesbloqueo: 1631232000,
                status: AVAL_CUOTA_STATUS_PENDIENTE
            };

            // Cuota 4: Vencimiento Friday, October 1, 2021 12:00:00 AM / Desbloqueo Sunday, October 10, 2021 12:00:00 AM
            const cuota4 = {
                numero: 4,
                montoFiat: 10000,
                timestampVencimiento: 1633046400,
                timestampDesbloqueo: 1633824000,
                status: AVAL_CUOTA_STATUS_PENDIENTE
            };

            // Cuota 5: Vencimiento Monday, November 1, 2021 12:00:00 AM / Desbloqueo Wednesday, November 10, 2021 12:00:00 AM
            const cuota5 = {
                numero: 5,
                montoFiat: 10000,
                timestampVencimiento: 1635724800,
                timestampDesbloqueo: 1636502400,
                status: AVAL_CUOTA_STATUS_PENDIENTE
            };

            // Cuota 6: Vencimiento Wednesday, December 1, 2021 12:00:00 AM / Desbloqueo Friday, December 10, 2021 12:00:00 AM
            const cuota6 = {
                numero: 6,
                montoFiat: 10000,
                timestampVencimiento: 1638316800,
                timestampDesbloqueo: 1639094400,
                status: AVAL_CUOTA_STATUS_PENDIENTE
            };

            const cuotas = [cuota1, cuota2, cuota3, cuota4, cuota5, cuota6];

            const timestampCuotas = [];
            for (let i = 0; i < cuotas.length; i++) {
                const cuota = cuotas[i];
                timestampCuotas.push(web3.utils.numberToHex(cuota.timestampVencimiento));
                timestampCuotas.push(web3.utils.numberToHex(cuota.timestampDesbloqueo));
            }

            await assertRevert(avaldao.saveAval(
                avalId,
                INFO_CID,
                usersArr,
                montoFiat,
                timestampCuotas,
                {
                    from: notAuthorized
                }
            ), errors.APP_AUTH_FAILED)
        });

        it.skip('Edición de Aval', async () => {

            const avalId = '613166ebcccc9e0012c4229b';
            const montoFiat = 60000;

            const usersArr = [solicitanteAddress, comercianteAddress, avaladoAddress, avaldaoAddress];

            // Cuota 1: Vencimiento Thursday, July 1, 2021 12:00:00 AM / Desbloqueo Saturday, July 10, 2021 12:00:00 AM
            const cuota1 = {
                numero: 1,
                montoFiat: 10000,
                timestampVencimiento: 1625097600,
                timestampDesbloqueo: 1625875200,
                status: AVAL_CUOTA_STATUS_PENDIENTE
            };

            // Cuota 2: Vencimiento Sunday, August 1, 2021 12:00:00 AM / Desbloqueo Tuesday, August 10, 2021 12:00:00 AM
            const cuota2 = {
                numero: 2,
                montoFiat: 10000,
                timestampVencimiento: 1627776000,
                timestampDesbloqueo: 1628553600,
                status: AVAL_CUOTA_STATUS_PENDIENTE
            };

            // Cuota 3: Wednesday, September 1, 2021 12:00:00 AM / Desbloqueo Friday, September 10, 2021 12:00:00 AM
            const cuota3 = {
                numero: 3,
                montoFiat: 10000,
                timestampVencimiento: 1630454400,
                timestampDesbloqueo: 1631232000,
                status: AVAL_CUOTA_STATUS_PENDIENTE
            };

            // Cuota 4: Vencimiento Friday, October 1, 2021 12:00:00 AM / Desbloqueo Sunday, October 10, 2021 12:00:00 AM
            const cuota4 = {
                numero: 4,
                montoFiat: 10000,
                timestampVencimiento: 1633046400,
                timestampDesbloqueo: 1633824000,
                status: AVAL_CUOTA_STATUS_PENDIENTE
            };

            // Cuota 5: Vencimiento Monday, November 1, 2021 12:00:00 AM / Desbloqueo Wednesday, November 10, 2021 12:00:00 AM
            const cuota5 = {
                numero: 5,
                montoFiat: 10000,
                timestampVencimiento: 1635724800,
                timestampDesbloqueo: 1636502400,
                status: AVAL_CUOTA_STATUS_PENDIENTE
            };

            // Cuota 6: Vencimiento Wednesday, December 1, 2021 12:00:00 AM / Desbloqueo Friday, December 10, 2021 12:00:00 AM
            const cuota6 = {
                numero: 6,
                montoFiat: 10000,
                timestampVencimiento: 1638316800,
                timestampDesbloqueo: 1639094400,
                status: AVAL_CUOTA_STATUS_PENDIENTE
            };

            const cuotas = [cuota1, cuota2, cuota3, cuota4, cuota5, cuota6];

            const timestampCuotas = [];
            for (let i = 0; i < cuotas.length; i++) {
                const cuota = cuotas[i];
                timestampCuotas.push(web3.utils.numberToHex(cuota.timestampVencimiento));
                timestampCuotas.push(web3.utils.numberToHex(cuota.timestampDesbloqueo));
            }

            let receipt = await avaldao.saveAval(
                avalId,
                INFO_CID,
                usersArr,
                montoFiat,
                timestampCuotas,
                {
                    from: solicitanteAddress
                }
            );
            const avalEventId = getEventArgument(receipt, 'SaveAval', 'id');

            const NEW_INFO_CID = "b4B1A3935bF977bad5Ec753325B4CD8D889EF0e7e7c7424";
            const receiptUpdated = await avaldao.saveAval(
                avalEventId,
                NEW_INFO_CID,
                usersArr,
                montoFiat,
                timestampCuotas,
                {
                    from: solicitanteAddress
                }
            );
            const updatedAvalEventId = getEventArgument(receiptUpdated, 'SaveAval', 'id');

            assert.equal(avalEventId, updatedAvalEventId);

            const updatedAvalAddress = await avaldao.getAvalAddress(avalId);
            const updatedAval = await Aval.at(updatedAvalAddress);
            const updatedAvalCuotasCantidad = await updatedAval.cuotasCantidad();
            let updatedAvalCuotas = [];
            for (let cuotaNumero = 1; cuotaNumero <= updatedAvalCuotasCantidad; cuotaNumero++) {
                updatedAvalCuotas.push(await updatedAval.getCuotaByNumero(cuotaNumero));

            }
            assertAval({
                id: await updatedAval.id(),
                infoCid: await updatedAval.infoCid(),
                avaldao: await updatedAval.avaldao(),
                solicitante: await updatedAval.solicitante(),
                comerciante: await updatedAval.comerciante(),
                avalado: await updatedAval.avalado(),
                montoFiat: await updatedAval.montoFiat(),
                cuotasCantidad: updatedAvalCuotasCantidad,
                cuotas: updatedAvalCuotas,
                status: await updatedAval.status(),
            }, {
                id: avalId,
                infoCid: NEW_INFO_CID,
                avaldao: avaldaoAddress,
                solicitante: solicitanteAddress,
                comerciante: comercianteAddress,
                avalado: avaladoAddress,
                montoFiat: montoFiat,
                cuotasCantidad: timestampCuotas.length / 2,
                cuotas: cuotas,
                status: AVAL_STATUS_COMPLETADO
            });
        });

        it.skip('Edición de Aval no autorizado', async () => {

            const avalId = '61316fa69a53310013d86292';
            const montoFiat = 60000;

            const usersArr = [solicitanteAddress, comercianteAddress, avaladoAddress, avaldaoAddress];

            // Cuota 1: Vencimiento Thursday, July 1, 2021 12:00:00 AM / Desbloqueo Saturday, July 10, 2021 12:00:00 AM
            const cuota1 = {
                numero: 1,
                montoFiat: 10000,
                timestampVencimiento: 1625097600,
                timestampDesbloqueo: 1625875200,
                status: AVAL_CUOTA_STATUS_PENDIENTE
            };

            // Cuota 2: Vencimiento Sunday, August 1, 2021 12:00:00 AM / Desbloqueo Tuesday, August 10, 2021 12:00:00 AM
            const cuota2 = {
                numero: 2,
                montoFiat: 10000,
                timestampVencimiento: 1627776000,
                timestampDesbloqueo: 1628553600,
                status: AVAL_CUOTA_STATUS_PENDIENTE
            };

            // Cuota 3: Wednesday, September 1, 2021 12:00:00 AM / Desbloqueo Friday, September 10, 2021 12:00:00 AM
            const cuota3 = {
                numero: 3,
                montoFiat: 10000,
                timestampVencimiento: 1630454400,
                timestampDesbloqueo: 1631232000,
                status: AVAL_CUOTA_STATUS_PENDIENTE
            };

            // Cuota 4: Vencimiento Friday, October 1, 2021 12:00:00 AM / Desbloqueo Sunday, October 10, 2021 12:00:00 AM
            const cuota4 = {
                numero: 4,
                montoFiat: 10000,
                timestampVencimiento: 1633046400,
                timestampDesbloqueo: 1633824000,
                status: AVAL_CUOTA_STATUS_PENDIENTE
            };

            // Cuota 5: Vencimiento Monday, November 1, 2021 12:00:00 AM / Desbloqueo Wednesday, November 10, 2021 12:00:00 AM
            const cuota5 = {
                numero: 5,
                montoFiat: 10000,
                timestampVencimiento: 1635724800,
                timestampDesbloqueo: 1636502400,
                status: AVAL_CUOTA_STATUS_PENDIENTE
            };

            // Cuota 6: Vencimiento Wednesday, December 1, 2021 12:00:00 AM / Desbloqueo Friday, December 10, 2021 12:00:00 AM
            const cuota6 = {
                numero: 6,
                montoFiat: 10000,
                timestampVencimiento: 1638316800,
                timestampDesbloqueo: 1639094400,
                status: AVAL_CUOTA_STATUS_PENDIENTE
            };

            const cuotas = [cuota1, cuota2, cuota3, cuota4, cuota5, cuota6];

            const timestampCuotas = [];
            for (let i = 0; i < cuotas.length; i++) {
                const cuota = cuotas[i];
                timestampCuotas.push(web3.utils.numberToHex(cuota.timestampVencimiento));
                timestampCuotas.push(web3.utils.numberToHex(cuota.timestampDesbloqueo));
            }

            let receipt = await avaldao.saveAval(
                avalId,
                INFO_CID,
                usersArr,
                montoFiat,
                timestampCuotas,
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
                    usersArr,
                    montoFiat,
                    timestampCuotas,
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