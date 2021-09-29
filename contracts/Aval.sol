pragma solidity ^0.4.24;

import "./Constants.sol";

/**
 * @title Contrato de Aval
 * @author ACDI
 * @notice Contrato de Aval.
 */
contract Aval is Constants {
    enum Status {
        Solicitado,
        Rechazado,
        Aceptado,
        Completado,
        Vigente,
        Finalizado
    }

    string public id; // Identificación del aval
    string public infoCid; // IPFS Content ID de las información (JSON) del aval.
    address public avaldao; // Dirección del usuario Avaldao
    address public solicitante; // Dirección del usuario Solicitante
    address public comerciante; // Dirección del usuario Comerciante
    address public avalado; // Dirección del usuario Avalado
    uint256 public montoFiat; // Monto en moneda FIAT requerido para el aval, medido en centavos de USD.
    uint256 public cuotasCantidad; // Cantidad de cuotas del aval.
    uint256[] public cuotaIds; // Ids de las cuotas relacionadas.
    uint256[] public reclamoIds; // Ids de los reclamos relacionados.
    Status public status; // Estado del aval.

    /**
     * @notice Crea un nuevo Contrato de Aval.
     * @param _id identificador del aval.
     * @param _infoCid Content ID de la información (JSON) del aval. IPFS Cid.
     * @param _avaldao address de Avaldao.
     * @param _comerciante address del Comerciante.
     * @param _avalado address del Avalado.
     * @param _montoFiat monto FIAT requerido para el aval, medidio en centavos de USD.
     * @param _cuotasCantidad cantidad de cuotas del aval.
     * @param _status estado del aval. 
     */
    constructor(
        string _id,
        string _infoCid,
        address _avaldao,
        address _solicitante,
        address _comerciante,
        address _avalado,
        uint256 _montoFiat,
        uint256 _cuotasCantidad,
        Status _status
    ) {
        id = _id;
        infoCid = _infoCid;
        avaldao = _avaldao;
        solicitante = _solicitante;
        comerciante = _comerciante;
        avalado = _avalado;
        montoFiat = _montoFiat;
        cuotasCantidad = _cuotasCantidad;
        status = _status;
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
    ) external {
        // El aval solo puede modificarse por el solicitante.
        require(solicitante == msg.sender, ERROR_AUTH_FAILED);
        infoCid = _infoCid;
        avaldao = _avaldao;
        comerciante = _comerciante;
        avalado = _avalado;
        montoFiat = _montoFiat;
        cuotasCantidad = _cuotasCantidad;
    }

    /**
     * @notice Actualiza el estado del aval. Solo el usuario Solicitante o Avaldao pueden actualizar el estado del aval.
     * @param _status nuevo estado del aval.
     */
    function updateStatus(Status _status) external {
        // El estado del aval solo puede modificarse por el Solicitante o Avaldao.
        require(
            solicitante == msg.sender || avalado == msg.sender,
            ERROR_AUTH_FAILED
        );
        status = _status;
    }
}