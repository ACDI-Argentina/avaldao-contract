pragma solidity ^0.4.24;

import "@aragon/apps-vault/contracts/Vault.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";
import "./Constants.sol";

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
        require(msg.sender == avaldaoContract, ERROR_AUTH_FAILED);
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
        avaldaoContract = msg.sender; // Avaldao Contract.
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
     * @notice desbloquea fondos del aval, devolviendo `_monto` `_token` al `_vault`.
     * @param _vault Address del vault donde devolver los fondos.
     * @param _token token devuelto al fondo de garantía.
     * @param _monto monto devuelto al fondo de garantía.
     */
    function unlockFund(
        Vault _vault,
        address _token,
        uint256 _monto
    ) external onlyByAvaldaoContract {
        _vault.deposit(_token, _monto);
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
     * @notice Actualiza el estado del aval.
     * @param _status nuevo estado del aval.
     */
    function updateStatus(Status _status) external onlyByAvaldaoContract {
        status = _status;
    }

    /**
     * @notice Actualiza el estado de la cuota número `_numero` del aval con `_cuotaStatus`.
     * @param _numero número de la cuota a actualizar el estado.
     * @param _cuotaStatus nuevo estado de la cuota del aval.
     */
    function updateCuotaStatusByNumero(uint8 _numero, CuotaStatus _cuotaStatus)
        external
        onlyByAvaldaoContract
    {
        for (uint256 i = 0; i < cuotas.length; i++) {
            if (cuotas[i].numero == _numero) {
                cuotas[i].status = _cuotaStatus;
                break;
            }
        }
    }

    /**
     * @notice Determina si el aval tiene o no un reclamo en estado vigente.
     * @return <code>true</code>.
     */
    function hasReclamoVigente()
        external
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
     * @dev Fallback Function.
     */
    function() external payable {
        emit Received(msg.sender, msg.value);
    }
}
