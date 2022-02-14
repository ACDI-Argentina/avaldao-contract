pragma solidity ^0.4.24;

import "./RoleConstants.sol";
import "@aragon/os/contracts/common/EtherTokenConstant.sol";

/**
 * @title Constantes útiles del contrato Avaldao.
 * @author ACDI
 */
contract Constants is RoleConstants, EtherTokenConstant {
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
    /*string internal constant ERROR_AVAL_CUOTAS_INVALIDAS =
        "AVALDAO_AVAL_CUOTAS_INVALIDAS";*/
    string internal constant ERROR_AVAL_CON_RECLAMO =
        "AVALDAO_AVAL_CON_RECLAMO";
    string internal constant ERROR_AVAL_SIN_RECLAMO =
        "AVALDAO_AVAL_SIN_RECLAMO";
    string internal constant ERROR_AVAL_SIN_CUOTA_PENDIENTE_VENCIDA =
        "AVALDAO_AVAL_SIN_CUOTA_PENDIENTE_VENCIDA";
}
