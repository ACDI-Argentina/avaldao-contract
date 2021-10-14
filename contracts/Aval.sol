pragma solidity ^0.4.24;

import "./Constants.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";

/**
 * @title Contrato de Aval
 * @author ACDI
 * @notice Contrato de Aval.
 */
contract Aval is Constants {
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

    /// @dev Estructura que define los datos de una Cuota.
    struct Cuota {
        uint256 numero; // Número de cuota.
        uint256 montoFiat; // Monto de la cuota en moneda fiat;
        uint32 timestampVencimiento; // Timestamp con la fecha de vencimiento de la cuota.
        uint32 timestampDesbloqueo; // Timestamp con la fecha de desbloqueo de la cuota.
        CuotaStatus status; // Estado de la cuota.
    }

    /**
     * Dirección de Avaldao Contract.
     */
    address public avaldaoContract;

    string public id; // Identificación del aval
    string public infoCid; // IPFS Content ID de las información (JSON) del aval.
    address public avaldao; // Dirección del usuario Avaldao
    address public solicitante; // Dirección del usuario Solicitante
    address public comerciante; // Dirección del usuario Comerciante
    address public avalado; // Dirección del usuario Avalado
    uint256 public montoFiat; // Monto en moneda FIAT requerido para el aval, medido en centavos de USD.
    uint256 public cuotasCantidad; // Cantidad de cuotas del aval.
    Cuota[] public cuotas; // Cuotas del aval.
    uint256[] public reclamoIds; // Ids de los reclamos relacionados.
    Status public status; // Estado del aval.

    event Received(address, uint256);

    /**
     * @notice solo Avaldao Contract tiene acceso.
     *
     */
    modifier onlyByAvaldaoContract() {
        require(msg.sender == avaldaoContract, ERROR_AUTH_FAILED);
        _;
    }

    /**
     * @notice Inicializa un nuevo Contrato de Aval.
     * @param _id identificador del aval.
     * @param _infoCid Content ID de la información (JSON) del aval. IPFS Cid.
     *
     * @param _montoFiat monto FIAT requerido para el aval, medidio en centavos de USD.
     */
    constructor(
        string _id,
        string _infoCid,
        address[] _users,
        uint256 _montoFiat
    ) {
        avaldaoContract = msg.sender; // Avaldao Contract.
        id = _id;
        infoCid = _infoCid;
        avaldao = _users[0];
        solicitante = _users[1];
        comerciante = _users[2];
        avalado = _users[3];
        montoFiat = _montoFiat;
        status = Status.Completado;
    }

    /**
     * @notice Inicializa un nuevo Contrato de Aval.
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
    function getCuotaByNumero(uint256 _numero)
        external
        view
        returns (
            uint256 numero,
            uint256 montoFiat,
            uint32 timestampVencimiento,
            uint32 timestampDesbloqueo,
            CuotaStatus status
        )
    {
        for (uint256 i = 0; i < cuotas.length; i++) {
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
     * @notice Actualiza el aval. Solo el usuario solicitante puede actualizar el aval.
     * @param _infoCid Content ID de las información (JSON) del aval. IPFS Cid.
     * @param _avaldao address de Avaldao.
     * @param _comerciante address del Comerciante.
     * @param _avalado address del Avalado.
     * @param _montoFiat monto FIAT requerido para el aval, medidio en centavos de USD.
     * @param _cuotasCantidad cantidad de cuotas del aval.
     */
    function update(
        string _infoCid,
        address _avaldao,
        address _comerciante,
        address _avalado,
        uint256 _montoFiat,
        uint256 _cuotasCantidad
    ) external onlyByAvaldaoContract {
        infoCid = _infoCid;
        avaldao = _avaldao;
        comerciante = _comerciante;
        avalado = _avalado;
        montoFiat = _montoFiat;
        cuotasCantidad = _cuotasCantidad;
    }

    /**
     * @notice Actualiza el estado del aval.
     * @param _status nuevo estado del aval.
     */
    function updateStatus(Status _status) external onlyByAvaldaoContract {
        status = _status;
    }

    /**
     * @dev Fallback Function.
     */
    function() external payable {
        emit Received(msg.sender, msg.value);
    }
}
