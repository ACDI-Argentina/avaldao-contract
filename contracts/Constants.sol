pragma solidity ^0.4.24;

import "@aragon/os/contracts/common/EtherTokenConstant.sol";

/**
 * @title Constantes útiles del contrato Avaldao.
 * @author ACDI
 */
contract Constants is EtherTokenConstant {
    // Grupos
    bytes32 public constant ROLE = keccak256("ROLE");

    // Permisos

    bytes32 public constant CREATE_AVAL_ROLE = keccak256("CREATE_AVAL_ROLE");
    bytes32 public constant SET_EXCHANGE_RATE_PROVIDER =
        keccak256("SET_EXCHANGE_RATE_PROVIDER");
    bytes32 public constant ENABLE_TOKEN_ROLE = keccak256("ENABLE_TOKEN_ROLE");

    // Errores

    string internal constant ERROR_AUTH_FAILED = "AVALDAO_AUTH_FAILED";
    string internal constant ERROR_VAULT_NOT_CONTRACT =
        "AVALDAO_VAULT_NOT_CONTRACT";
    string internal constant ERROR_INVALID_SIGN = "AVALDAO_INVALID_SIGN";
    string internal constant ERROR_AVAL_NO_COMPLETADO =
        "AVALDAO_AVAL_NO_COMPLETADO";
    string internal constant ERROR_AVAL_FALTAN_FIRMAS =
        "AVALDAO_AVAL_FALTAN_FIRMAS";
}
