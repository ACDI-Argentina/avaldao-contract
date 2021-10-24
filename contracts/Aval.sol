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
        Completado,
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
     * @param _users direcciones con los participantes del aval. 0:Solicitante, 1:Comerciante, 2:Avalado y 3:Avaldao.
     * @param _montoFiat monto FIAT del avala medido en centavos de USD.
     */
    constructor(
        string _id,
        string _infoCid,
        address[] _users,
        uint256 _montoFiat
    ) {
        avaldaoContract = Avaldao(msg.sender); // Avaldao Contract.
        // Aval
        id = _id;
        infoCid = _infoCid;
        solicitante = _users[0];
        comerciante = _users[1];
        avalado = _users[2];
        avaldao = _users[3];
        montoFiat = _montoFiat;
        status = Status.Completado;
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
    ) external onlyByAvaldaoContract {
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
     * @notice Actualiza el estado del aval.
     * @param _status nuevo estado del aval.
     */
    function updateStatus(Status _status) public onlyByAvaldaoContract {
        status = _status;
    }

    /**
     * @notice Desbloquea fondos del aval en `_tokens` equivalentes a una cuota y los retorna al Fondo de Garantía general.
     * @dev TODO Esta implementación asume que los token tienen el mismo valor que al momento de bloquearse en el aval.
     * @param _tokens tokens del fondo del aval.
     */
    function unlockFundCuota(address[] _tokens) public onlyByAvaldaoContract {
        // El aval no debe tener un reclamo vigente para desbloquear los fondos.
        require(_hasReclamoVigente() == false, ERROR_AVAL_CON_RECLAMO);

        for (uint8 i1 = 0; i1 < cuotasCantidad; i1++) {
            Cuota storage cuota = cuotas[i1];

            // Una cuota es válida para desbloquear fondos si su estado es Pendiente
            // y la fecha actual es igual o mayor a la fecha de desbloqueo de fondos de la cuota.
            if (
                cuota.status == CuotaStatus.Pendiente &&
                cuota.timestampDesbloqueo <= block.timestamp
            ) {
                uint256 montoFiatUnlock = 0;
                for (uint8 i2 = 0; i2 < _tokens.length; i2++) {
                    if (montoFiatUnlock >= cuota.montoFiat) {
                        // Se alcanzó el monto desbloqueado para la cuota.
                        break;
                    }
                    address token = _tokens[i2];
                    uint256 tokenRate = avaldaoContract
                        .exchangeRateProvider()
                        .getExchangeRate(token);
                    uint256 tokenBalance = _getContractFundByToken(
                        address(this),
                        token
                    );
                    uint256 tokenBalanceFiat = tokenBalance.div(tokenRate);
                    uint256 tokenBalanceToTransfer;

                    if (
                        montoFiatUnlock.add(tokenBalanceFiat) < cuota.montoFiat
                    ) {
                        // Con el balance se alcanza una parte del fondo a desbloquear.
                        // Se transfiere todo el balance.
                        tokenBalanceToTransfer = tokenBalance;
                        montoFiatUnlock = montoFiatUnlock.add(tokenBalanceFiat);
                    } else {
                        // Con el balance del token se alcanza el fondo a desbloquear.
                        // Se obtiene la diferencia entre el monto objetivo
                        // y el monto desbloqueado hasta el momento.
                        uint256 montoFiatDiff = cuota.montoFiat.sub(
                            montoFiatUnlock
                        );
                        // Se transfiere solo el balance necesario para llegar al objetivo.
                        tokenBalanceToTransfer = montoFiatDiff.mul(tokenRate);
                        // Se alcanzó el monto objetivo.
                        montoFiatUnlock = montoFiatUnlock.add(montoFiatDiff);
                    }

                    if (tokenBalanceToTransfer > 0) {
                        // Se transfiere el balance desbloqueado desde el Aval hacia el fondo de garantía general.
                        if (token == ETH) {
                            // https://docs.soliditylang.org/en/v0.8.9/control-structures.html?highlight=value%20function#external-function-calls
                            // avaldaoContract.vault().deposit{value: _monto}(_token, _monto);
                            // Sintaxis no válida. Se sigue utilizando sintaxis deprecada.
                            avaldaoContract.vault().deposit.value(
                                tokenBalanceToTransfer
                            )(token, tokenBalanceToTransfer);
                        } else {
                            // Se aprueba previamente al Vault para que transfiera los tokens del aval.
                            require(
                                ERC20(token).safeApprove(
                                    avaldaoContract.vault(),
                                    tokenBalanceToTransfer
                                ),
                                ERROR_TOKEN_APPROVE_FAILED
                            );
                            avaldaoContract.vault().deposit(
                                token,
                                tokenBalanceToTransfer
                            );
                        }
                    }
                }

                // Se actualiza el estado de la cuota a Pagada.
                // Como se desbloquean los fondos, se asume que la cuota ha sido pagada.
                cuota.status = CuotaStatus.Pagada;

                break;
            }
        }
    }

    /**
     * @dev Fallback Function.
     */
    function() external payable {
        emit Received(msg.sender, msg.value);
    }

    // Internal functions

    /**
     * @notice Determina si el aval tiene o no un reclamo en estado vigente.
     * @return <code>true</code>.
     */
    function _hasReclamoVigente()
        internal
        view
        returns (bool hasReclamoVigente)
    {
        hasReclamoVigente = false;
        for (uint256 i = 0; i < reclamos.length; i++) {
            if (reclamos[i].status == ReclamoStatus.Vigente) {
                hasReclamoVigente = true;
                break;
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
}
