pragma solidity ^0.4.24;

import "@aragon/os/contracts/common/SafeERC20.sol";
import "@aragon/os/contracts/lib/token/ERC20.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";
import "./Avaldao.sol";
import "./Constants.sol";

/**
 * @title Contrato de Aval
 * @author ACDI
 * @notice Contrato de Aval.
 */
contract Aval is Constants {
    using SafeERC20 for ERC20;
    using SafeMath for uint256;
    enum Status {
        Solicitado,
        Rechazado,
        Aceptado,
        Vigente,
        Finalizado
    }
    enum CuotaStatus {
        Pendiente,
        Pagada,
        Reintegrada
    }
    enum ReclamoStatus {
        Vigente,
        Cerrado
    }

    struct AvalSignable {
        address aval;
        string infoCid;
        address avaldao;
        address solicitante;
        address comerciante;
        address avalado;
    }

    /// @dev Estructura que define los datos de una Cuota.
    struct Cuota {
        uint8 numero; // Número de cuota.
        uint256 montoFiat; // Monto de la cuota en moneda fiat;
        uint32 timestampVencimiento; // Timestamp con la fecha de vencimiento de la cuota. 4 bytes.
        uint32 timestampDesbloqueo; // Timestamp con la fecha de desbloqueo de la cuota. 4 bytes.
        CuotaStatus status; // Estado de la cuota.
    }

    /// @dev Estructura que define los datos de un Reclamo.
    struct Reclamo {
        uint8 numero; // Número de reclamo.
        ReclamoStatus status; // Estado del reclamo.
        uint256 timestampCreacion; // Timestamp con la fecha de creacion
    }

    /**
     * Avaldao Contract.
     */
    Avaldao public avaldaoContract;

    string public id; // Identificación del aval
    string public infoCid; // IPFS Content ID de las información (JSON) del aval.
    address public avaldao; // Dirección del usuario Avaldao
    address public solicitante; // Dirección del usuario Solicitante
    address public comerciante; // Dirección del usuario Comerciante
    address public avalado; // Dirección del usuario Avalado
    uint256 public montoFiat; // Monto en moneda FIAT requerido para el aval, medido en centavos de USD.
    uint8 public cuotasCantidad; // Cantidad de cuotas del aval.
    Cuota[] public cuotas; // Cuotas del aval.
    Reclamo[] public reclamos; // Reclamos del aval.
    Status public status; // Estado del aval.

    event Received(address, uint256);
    event Signed();
    event CuotaUnlock(uint8 numeroCuota);
    event CuotaReintegrada(uint8 numeroCuota);
    event ReclamoOpen(uint8 numeroReclamo);
    event ReclamoClose(uint8 numeroReclamo);

    uint8 private constant SIGNER_COUNT = 4;
    uint8 private constant SIGN_INDEX_AVALDAO = 0;
    uint8 private constant SIGN_INDEX_SOLICITANTE = 1;
    uint8 private constant SIGN_INDEX_COMERCIANTE = 2;
    uint8 private constant SIGN_INDEX_AVALADO = 3;
    bytes32 constant AVAL_SIGNABLE_TYPEHASH =
        keccak256(
            "AvalSignable(address aval,string infoCid,address avaldao,address solicitante,address comerciante,address avalado)"
        );

    /**
     * @notice solo Avaldao Contract tiene acceso.
     *
     */
    modifier onlyByAvaldaoContract() {
        require(msg.sender == address(avaldaoContract), ERROR_AUTH_FAILED);
        _;
    }

    /**
     * @notice Inicializa un nuevo Contrato de Aval.
     * @param _id identidicador del aval.
     * @param _infoCid Content ID de la información (JSON) del aval. IPFS Cid.
     * @param _users direcciones con los participantes del aval. 0:Avaldao, 1:Solicitante, 2:Comerciante, 3:Avalado.
     * @param _montoFiat monto FIAT del avala medido en centavos de USD.
     */
    constructor(
        string _id,
        string _infoCid,
        address[] _users,
        uint256 _montoFiat
    ) public {
        avaldaoContract = Avaldao(msg.sender); // Avaldao Contract.
        // Aval
        id = _id;
        infoCid = _infoCid;
        avaldao = _users[0];
        solicitante = _users[1];
        comerciante = _users[2];
        avalado = _users[3];
        montoFiat = _montoFiat;
        status = Status.Aceptado;
    }

    /**
     * @notice Inicializa un nuevo Contrato de Aval.
     * @param _montoFiat monto FIAT de la cuota medido en centavos de USD.
     * @param _timestampVencimiento arreglo con las fechas de venicmiento de cada cuota.
     * @param _timestampDesbloqueo arreglo con las fechas de desbloqueo de cada cuota.
     */
    function addCuota(
        uint256 _montoFiat,
        uint32 _timestampVencimiento,
        uint32 _timestampDesbloqueo
    ) public onlyByAvaldaoContract {
        cuotasCantidad = cuotasCantidad + 1;
        Cuota memory cuota;
        cuota.numero = cuotasCantidad;
        cuota.montoFiat = _montoFiat;
        cuota.timestampVencimiento = _timestampVencimiento;
        cuota.timestampDesbloqueo = _timestampDesbloqueo;
        cuota.status = CuotaStatus.Pendiente;
        cuotas.push(cuota);
    }

    /**
     * @notice Firma (múltiple) el aval por todos los participantes: Solicitante, Comerciante, Avalado y Avaldao.
     * @dev Las firmas se reciben en 3 array distintos, donde cada uno contiene las variables V, R y S de las firmas en Ethereum.
     * @dev Los elementos de los array corresponden a los firmantes, 0:Avaldao, 1:Solicitante, 2:Comerciante, 3:Avalado.
     *
     * @param _signV array con las variables V de las firmas de los participantes.
     * @param _signR array con las variables R de las firmas de los participantes.
     * @param _signS array con las variables S de las firmas de los participantes.
     */
    function sign(
        uint8[] _signV,
        bytes32[] _signR,
        bytes32[] _signS
    ) external {
        // El aval solo puede firmarse por Avaldao.
        require(avaldao == msg.sender, ERROR_AUTH_FAILED);

        // El aval solo puede firmarse si está Aceptado.
        require(status == Aval.Status.Aceptado, ERROR_AVAL_INVALID_STATUS);

        // Verifica que estén las firmas de todos lo firmantes.
        require(
            _signV.length == SIGNER_COUNT &&
                _signR.length == SIGNER_COUNT &&
                _signS.length == SIGNER_COUNT,
            ERROR_AVAL_FALTAN_FIRMAS
        );

        // Note: we need to use `encodePacked` here instead of `encode`.
        bytes32 hashSigned = keccak256(
            abi.encodePacked(
                "\x19\x01",
                avaldaoContract.DOMAIN_SEPARATOR(),
                keccak256(
                    abi.encode(
                        AVAL_SIGNABLE_TYPEHASH,
                        address(this),
                        keccak256(bytes(infoCid)),
                        avaldao,
                        solicitante,
                        comerciante,
                        avalado
                    )
                )
            )
        );

        // Verficación de la firma del Avaldao.
        _verifySign(
            hashSigned,
            _signV[SIGN_INDEX_AVALDAO],
            _signR[SIGN_INDEX_AVALDAO],
            _signS[SIGN_INDEX_AVALDAO],
            avaldao
        );

        // Verficación de la firma del Solicitante.
        _verifySign(
            hashSigned,
            _signV[SIGN_INDEX_SOLICITANTE],
            _signR[SIGN_INDEX_SOLICITANTE],
            _signS[SIGN_INDEX_SOLICITANTE],
            solicitante
        );

        // Verficación de la firma del Comerciante.
        _verifySign(
            hashSigned,
            _signV[SIGN_INDEX_COMERCIANTE],
            _signR[SIGN_INDEX_COMERCIANTE],
            _signS[SIGN_INDEX_COMERCIANTE],
            comerciante
        );

        // Verficación de la firma del Avalado.
        _verifySign(
            hashSigned,
            _signV[SIGN_INDEX_AVALADO],
            _signR[SIGN_INDEX_AVALADO],
            _signS[SIGN_INDEX_AVALADO],
            avalado
        );

        // Bloqueo de fondos.
        _lockFund();

        // Se realizó la verificación de todas las firmas y se bloquearon los fondos
        // por lo que el aval pasa a estado Vigente.
        status = Status.Vigente;

        emit Signed();
    }

    /**
     * @notice desbloquea fondos del aval equivalentes a una cuota, preparado para ejecutarse automáticamente cada cierto período.
     * Los fondos son retornados al fondo de garantía general.
     * @dev TODO Esta implementación asume que los token tienen el mismo valor que al momento de bloquearse en el aval.
     */
    function unlockFundAuto() external {
        // El sender debe ser Avaldao.
        require(avaldao == msg.sender, ERROR_AUTH_FAILED);

        _unlockFundCuota(false);

        if (!hasCuotaPendiente()) {
            // El aval ya no tiene cuotas pendientes, por lo que pasa a estado Finalizado.
            status = Status.Finalizado;
        }
    }

    /**
     * @notice desbloquea fondos del aval equivalentes a una cuota, preparado para ejecutarse de manera manual por el solicitante.
     * Los fondos son retornados al fondo de garantía general.
     * @dev TODO Esta implementación asume que los token tienen el mismo valor que al momento de bloquearse en el aval.
     */
    function unlockFundManual() external {
        // El sender debe ser el Solicitante.
        require(solicitante == msg.sender, ERROR_AUTH_FAILED);

        _unlockFundCuota(true);

        if (!hasCuotaPendiente()) {
            // El aval ya no tiene cuotas pendientes, por lo que pasa a estado Finalizado.
            status = Status.Finalizado;
        }

        if (
            status == Status.Finalizado ||
            (hasReclamoVigente() && !hasCuotaEnMora())
        ) {
            // Como el aval está finalizado o
            // Tiene un reclamo sin cuota en mora, se cierra el reclamo actual.
            _closeReclamo();
        }
    }

    /**
     * Abre un nuevo reclamo del aval.
     */
    function openReclamo() external {
        // El sender debe ser el Comerciante.
        require(comerciante == msg.sender, ERROR_AUTH_FAILED);
        // El aval solo puede reclamarse si está vigente.
        require(status == Status.Vigente, ERROR_AVAL_INVALID_STATUS);
        // El aval no debe tener un reclamo vigente para abrir un nuevo reclamo.
        require(hasReclamoVigente() == false, ERROR_AVAL_CON_RECLAMO);
        // La fecha actual debe ser mayor a la fecha de vencimiento de la primera cuota Pendiente.
        bool hasCuotaPendienteVencida = false;
        for (uint8 i = 0; i < cuotasCantidad; i++) {
            Cuota storage cuota = cuotas[i];
            if (
                cuota.status == CuotaStatus.Pendiente &&
                cuota.timestampVencimiento <= block.timestamp
            ) {
                hasCuotaPendienteVencida = true;
                break;
            }
        }
        require(
            hasCuotaPendienteVencida == true,
            ERROR_AVAL_SIN_CUOTA_PENDIENTE_VENCIDA
        );
        // El aval es reclamable, por lo que se crea el reclamo.
        Reclamo memory reclamo;
        reclamo.numero = uint8(reclamos.length + 1);
        reclamo.timestampCreacion = block.timestamp;
        reclamo.status = ReclamoStatus.Vigente;
        reclamos.push(reclamo);
        emit ReclamoOpen(reclamo.numero);
    }

    /**
     * Reintegra los fondos del aval al comerciante.
     */
    function reintegrar() external {
        // El sender debe ser Avaldao.
        require(avaldao == msg.sender, ERROR_AUTH_FAILED);
        // El aval solo puede reintegrarse si está vigente.
        require(status == Status.Vigente, ERROR_AVAL_INVALID_STATUS);
        // El aval debe tener un reclamo vigente para reintegrar los fondos.
        require(hasReclamoVigente() == true, ERROR_AVAL_SIN_RECLAMO);
        // Las cuotas a reintegrar son aquellas en estado pendiente y donde la
        // fecha actual es mayor o igual a su fecha de vencimiento.
        for (uint8 i1 = 0; i1 < cuotasCantidad; i1++) {
            Cuota storage cuota = cuotas[i1];
            if (
                cuota.status == CuotaStatus.Pendiente &&
                cuota.timestampVencimiento <= block.timestamp
            ) {
                // Se transfiere el monto de la cuota al comerciante.
                _transferCuotaMonto(cuota, comerciante);
                // Se actualiza el estado de la cuota a Reintegrada.
                cuota.status = CuotaStatus.Reintegrada;
                emit CuotaReintegrada(cuota.numero);
            }
        }
        // Se cierra el reclamo vigente actual porque se resolvió reintegrando los fondos.
        _closeReclamo();
        if (!hasCuotaPendiente()) {
            // El aval ya no tiene cuotas pendientes, por lo que pasa a estado Finalizado.
            status = Status.Finalizado;
        }
    }

    /**
     * @notice Obtiene la cuota número `_numero` del Aval.
     * @param _numero número de cuota requerida.
     * @return Datos del Aval.
     */
    function getCuotaByNumero(uint8 _numero)
        external
        view
        returns (
            uint8 numero,
            uint256 montoFiat,
            uint32 timestampVencimiento,
            uint32 timestampDesbloqueo,
            CuotaStatus status
        )
    {
        for (uint8 i = 0; i < cuotas.length; i++) {
            if (cuotas[i].numero == _numero) {
                numero = cuotas[i].numero;
                montoFiat = cuotas[i].montoFiat;
                timestampVencimiento = cuotas[i].timestampVencimiento;
                timestampDesbloqueo = cuotas[i].timestampDesbloqueo;
                status = cuotas[i].status;
                break;
            }
        }
    }

    /**
     * @notice Determina si el aval tiene o no una cuota en estado Pendiente.
     * @return <code>true</code> si tiene una cuota en estado Pendiente.
     * <code>false</code> si no tiene una cuota en estado Pendiente.
     */
    function hasCuotaPendiente() public view returns (bool _hasCuotaPendiente) {
        for (uint8 i = 0; i < cuotas.length; i++) {
            if (cuotas[i].status == CuotaStatus.Pendiente) {
                _hasCuotaPendiente = true;
                break;
            }
        }
    }

    /**
     * @notice Determina si el aval tiene o no una cuota en mora.
     * @return <code>true</code> si tiene una cuota en mora.
     * <code>false</code> si no tiene una cuota en mora.
     */
    function hasCuotaEnMora() public view returns (bool _hasCuotaEnMora) {
        for (uint8 i = 0; i < cuotas.length; i++) {
            if (
                cuotas[i].status == CuotaStatus.Pendiente &&
                cuotas[i].timestampVencimiento < block.timestamp
            ) {
                _hasCuotaEnMora = true;
                break;
            }
        }
    }

    /**
     * @notice Determina si el aval tiene o no un reclamo en estado Vigente.
     * @return <code>true</code> si tiene un reclamo en estado Vigente.
     * <code>false</code> si no tiene un reclamo en estado Vigente.
     */
    function hasReclamoVigente() public view returns (bool _hasReclamoVigente) {
        for (uint8 i = 0; i < reclamos.length; i++) {
            if (reclamos[i].status == ReclamoStatus.Vigente) {
                _hasReclamoVigente = true;
                break;
            }
        }
    }

    /**
     * @notice Obtiene la cantidad de reclamos del aval.
     */
    function getReclamosLength() public view returns (uint256 reclamosCount) {
        return reclamos.length;
    }

    /**
     * @dev Fallback Function.
     */
    function() external payable {
        emit Received(msg.sender, msg.value);
    }

    // Internal functions

    /**
     * @notice Cierra el reclamo vigente actual si lo hubiera.
     */
    function _closeReclamo() internal {
        for (uint8 i = 0; i < reclamos.length; i++) {
            if (reclamos[i].status == ReclamoStatus.Vigente) {
                reclamos[i].status = ReclamoStatus.Cerrado;
                emit ReclamoClose(reclamos[i].numero);
                break;
            }
        }
    }

    /**
     * @notice bloquea fondos desde el fondo de garantía en el aval.
     *
     */
    function _lockFund() internal {
        // Debe haber fondos suficientes para garantizar el aval.
        require(
            montoFiat <= avaldaoContract.vault().getTokensBalanceFiat(),
            ERROR_AVAL_FONDOS_INSUFICIENTES
        );

        address[] memory tokens = avaldaoContract.vault().getTokens();
        uint256 montoFiatLock = 0;
        for (uint256 i = 0; i < tokens.length; i++) {
            if (montoFiatLock >= montoFiat) {
                // Se alcanzó el monto bloqueado para el aval.
                break;
            }

            address token = tokens[i];
            uint256 tokenBalance = avaldaoContract.vault().balance(token);
            uint256 tokenRate = avaldaoContract
                .vault()
                .exchangeRateProvider()
                .getExchangeRate(token);
            uint256 tokenBalanceFiat = tokenBalance.div(tokenRate);

            uint256 tokenBalanceToTransfer;
            if (montoFiatLock.add(tokenBalanceFiat) < montoFiat) {
                // Con el balance se garantiza una parte del fondo requerido.
                // Se transfiere todo el balance.
                tokenBalanceToTransfer = tokenBalance;
                montoFiatLock = montoFiatLock.add(tokenBalanceFiat);
            } else {
                // Con el balance del token se garantiza el fondo requerido.
                // Se obtiene la diferencia entre el monto objetivo
                // y el monto bloqueado hasta el momento.
                uint256 montoFiatDiff = montoFiat.sub(montoFiatLock);
                // Se transfiere solo el balance necesario para llegar al objetivo.
                tokenBalanceToTransfer = montoFiatDiff.mul(tokenRate);
                // Se alcanzó el monto objetivo.
                montoFiatLock = montoFiatLock.add(montoFiatDiff);
            }

            if (tokenBalanceToTransfer > 0) {
                // Se transfiere el balance bloqueado desde el Vault hacia el Aval.
                avaldaoContract.transferFund(
                    token,
                    tokenBalanceToTransfer,
                    this
                );
            }
        }
    }

    /**
     * @notice Desbloquea fondos del aval en `_tokens` equivalentes a una cuota y los retorna al Fondo de Garantía general.
     * @dev TODO Esta implementación asume que los token tienen el mismo valor que al momento de bloquearse en el aval.
     * @param _force fuerza el desbloqueo de fondos aunque no se cumpla la fecha de desbloqueo o existan reclamos vigentes.
     */
    function _unlockFundCuota(bool _force) internal {
        // El aval debe estar Vigente.
        require(status == Status.Vigente, ERROR_AVAL_INVALID_STATUS);

        if (!_force) {
            // El aval no debe tener un reclamo vigente para desbloquear los fondos.
            require(hasReclamoVigente() == false, ERROR_AVAL_CON_RECLAMO);
        }

        for (uint8 i1 = 0; i1 < cuotasCantidad; i1++) {
            Cuota storage cuota = cuotas[i1];

            // Una cuota es válida para desbloquear fondos si su estado es Pendiente
            // y la fecha actual es igual o mayor a la fecha de desbloqueo de fondos de la cuota.
            // La condición por la fecha de desbloqueo se desestima si se requiere el desbloqueo de manera forzada.
            if (
                cuota.status == CuotaStatus.Pendiente &&
                (_force || cuota.timestampDesbloqueo <= block.timestamp)
            ) {
                // Se transfiere el monto de la cuota al Fondo de Garantía.
                _transferCuotaMonto(cuota, avaldaoContract.vault());
                // Se actualiza el estado de la cuota a Pagada.
                // Como se desbloquean los fondos, se asume que la cuota ha sido pagada.
                cuota.status = CuotaStatus.Pagada;
                emit CuotaUnlock(cuota.numero);
                break;
            }
        }
    }

    /**
     * @notice Trasfiere el monto de la `_cuota` al destinatario `_to`.
     * @param _cuota cuota sobre la cual se transfiere el equivalente de su monto.
     * @param _to destinatario de la transferencia.
     */
    function _transferCuotaMonto(Cuota _cuota, address _to) internal {
        address[] memory tokens = avaldaoContract.vault().getTokens();
        uint256 montoFiatToTransfer = 0;
        for (uint8 i = 0; i < tokens.length; i++) {
            if (montoFiatToTransfer >= _cuota.montoFiat) {
                // Se alcanzó el monto a reintegar de la cuota.
                break;
            }
            address token = tokens[i];
            uint256 tokenRate = avaldaoContract
                .vault()
                .exchangeRateProvider()
                .getExchangeRate(token);
            uint256 tokenBalance = _getContractFundByToken(
                address(this),
                token
            );
            uint256 tokenBalanceFiat = tokenBalance.div(tokenRate);
            uint256 tokenBalanceToTransfer;

            if (montoFiatToTransfer.add(tokenBalanceFiat) < _cuota.montoFiat) {
                // Con el balance se alcanza una parte del fondo a trasferir.
                // Se transfiere todo el balance.
                tokenBalanceToTransfer = tokenBalance;
                montoFiatToTransfer = montoFiatToTransfer.add(tokenBalanceFiat);
            } else {
                // Con el balance del token se alcanza el fondo a trasferir.
                // Se obtiene la diferencia entre el monto objetivo
                // y el monto a trasnferir hasta el momento.
                uint256 montoFiatDiff = _cuota.montoFiat.sub(
                    montoFiatToTransfer
                );
                // Se transfiere solo el balance necesario para llegar al objetivo.
                tokenBalanceToTransfer = montoFiatDiff.mul(tokenRate);
                // Se alcanzó el monto objetivo.
                montoFiatToTransfer = montoFiatToTransfer.add(montoFiatDiff);
            }

            if (tokenBalanceToTransfer > 0) {
                if (token == ETH) {
                    // Transferencia de ETH
                    _to.transfer(tokenBalanceToTransfer);
                } else {
                    // Transferencia de Token ERC20
                    if (_to == address(avaldaoContract.vault())) {
                        // El destino es el Fondo de Garantía.
                        require(
                            ERC20(token).safeApprove(
                                _to,
                                tokenBalanceToTransfer
                            ),
                            ERROR_TOKEN_APPROVE_FAILED
                        );
                        avaldaoContract.vault().deposit(
                            token,
                            tokenBalanceToTransfer
                        );
                    } else {
                        ERC20(token).transfer(_to, tokenBalanceToTransfer);
                    }
                }
            }
        }
    }

    /**
     * @notice Obtiene el fondo del `_token` perteneciente al `_contractAddress`.
     * @param _contractAddress dirección del contrato al cual pertenecen los fondos.
     * @param _token token de los fondos.
     */
    function _getContractFundByToken(address _contractAddress, address _token)
        internal
        view
        returns (uint256)
    {
        if (_token == ETH) {
            return _contractAddress.balance;
        } else {
            return ERC20(_token).staticBalanceOf(_contractAddress);
        }
    }

    /**
     * Verifica que el signer haya firmado el hash. La firma se especifica por las variables V, R y S.
     *
     * @param _hashSigned hash firmado.
     * @param _signV variable V de las firma del firmante.
     * @param _signR variable R de las firma del firmante.
     * @param _signS variable S de las firma del firmante.
     * @param  _signer firmando a comprobar si realizó la firma.
     */
    function _verifySign(
        bytes32 _hashSigned,
        uint8 _signV,
        bytes32 _signR,
        bytes32 _signS,
        address _signer
    ) internal pure {
        // Obtiene la dirección pública de la cuenta con la cual se realizó la firma.
        address signerRecovered = ecrecover(
            _hashSigned,
            _signV,
            _signR,
            _signS
        );
        // La firma recuperada debe ser igual al firmante especificado.
        require(signerRecovered == _signer, ERROR_AVAL_INVALID_SIGN);
    }
}
