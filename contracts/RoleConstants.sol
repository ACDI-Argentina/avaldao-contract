pragma solidity ^0.4.24;

/**
 * @title Constantes de Roles.
 * @author ACDI
 */
contract RoleConstants {
    // Grupos

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant AVALDAO_ROLE = keccak256("AVALDAO_ROLE");
    bytes32 public constant SOLICITANTE_ROLE = keccak256("SOLICITANTE_ROLE");
    bytes32 public constant COMERCIANTE_ROLE = keccak256("COMERCIANTE_ROLE");
    bytes32 public constant AVALADO_ROLE = keccak256("AVALADO_ROLE");

    // Permisos

    bytes32 public constant SET_EXCHANGE_RATE_PROVIDER_ROLE =
        keccak256("SET_EXCHANGE_RATE_PROVIDER_ROLE");
    bytes32 public constant ENABLE_TOKEN_ROLE = keccak256("ENABLE_TOKEN_ROLE");
}
