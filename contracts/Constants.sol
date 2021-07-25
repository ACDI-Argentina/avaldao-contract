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
    // Errores

    string internal constant ERROR_VAULT_NOT_CONTRACT =
        "AVALDAO_VAULT_NOT_CONTRACT";
}
