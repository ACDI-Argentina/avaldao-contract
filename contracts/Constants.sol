pragma solidity ^0.4.24;

import "@aragon/os/contracts/common/EtherTokenConstant.sol";

/**
 * @title Constantes útiles del contrato Avaldao.
 * @author ACDI
 */
contract Constants is EtherTokenConstant {
    // Grupos

    bytes32 public constant AVALDAO_ROLE = keccak256("AVALDAO_ROLE");
    bytes32 public constant SOLICITANTE_ROLE = keccak256("SOLICITANTE_ROLE");
    bytes32 public constant COMERCIANTE_ROLE = keccak256("COMERCIANTE_ROLE");
    bytes32 public constant AVALADO_ROLE = keccak256("AVALADO_ROLE");

    // Permisos

    bytes32 public constant SET_EXCHANGE_RATE_PROVIDER =
        keccak256("SET_EXCHANGE_RATE_PROVIDER");
    bytes32 public constant ENABLE_TOKEN_ROLE = keccak256("ENABLE_TOKEN_ROLE");

    // Errores

    string internal constant ERROR_AUTH_FAILED = "AVALDAO_AUTH_FAILED";
    string internal constant ERROR_TOKEN_APPROVE_FAILED =
        "AVALDAO_TOKEN_APPROVE_FAILED";
    string internal constant ERROR_VAULT_NOT_CONTRACT =
        "AVALDAO_VAULT_NOT_CONTRACT";
    string internal constant ERROR_AVAL_INVALID_SIGN =
        "AVALDAO_AVAL_INVALID_SIGN";
    string internal constant ERROR_AVAL_INVALID_STATUS =
        "AVALDAO_AVAL_INVALID_STATUS";
    string internal constant ERROR_AVAL_FONDOS_INSUFICIENTES =
        "AVALDAO_AVAL_FONDOS_INSUFICIENTES";
    string internal constant ERROR_AVAL_FALTAN_FIRMAS =
        "AVALDAO_AVAL_FALTAN_FIRMAS";
    string internal constant ERROR_AVAL_CUOTAS_INVALIDAS =
        "AVALDAO_AVAL_CUOTAS_INVALIDAS";
    string internal constant ERROR_AVAL_CON_RECLAMO =
        "AVALDAO_AVAL_CON_RECLAMO";
    string internal constant ERROR_AVAL_SIN_RECLAMO =
        "AVALDAO_AVAL_SIN_RECLAMO";
    string internal constant ERROR_AVAL_SIN_CUOTA_PENDIENTE_VENCIDA =
        "AVALDAO_AVAL_SIN_CUOTA_PENDIENTE_VENCIDA";
}
