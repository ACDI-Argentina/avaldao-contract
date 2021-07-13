pragma solidity ^0.4.24;

import "@aragon/os/contracts/common/EtherTokenConstant.sol";

/**
 * @title Constantes útiles del contrato Avaldao.
 * @author ACDI
 */
contract Constants is EtherTokenConstant {
    // Grupos
    bytes32 public constant ROLE = keccak256("ROLE");

    // Errores

    string internal constant ERROR_VAULT_NOT_CONTRACT =
        "AVALDAO_VAULT_NOT_CONTRACT";
}
