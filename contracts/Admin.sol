pragma solidity ^0.4.24;
pragma experimental ABIEncoderV2;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/acl/ACL.sol";
import "./RoleConstants.sol";

/**
 * @title Administración de Usuarios
 * @author ACDI
 * @notice Contrato de Administración de Usuarios.
 */
contract Admin is AragonApp, RoleConstants {
    address private proxy;
    address private adminUser;

    /**
     * @notice Inicializa el Users App.
     * @param _proxyAddress dirección del smart contract (proxy Aragon).
     * @param _adminUserAddress dirección del usuario Admin principal.
     */
    function initialize(address _proxyAddress, address _adminUserAddress)
        external
        onlyInit
    {
        proxy = _proxyAddress;
        adminUser = _adminUserAddress;

        ACL acl = ACL(kernel().acl());
        if (acl.getPermissionManager(proxy, ADMIN_ROLE) != proxy) {
            // El role no ha sido creado por el Permission Manager.
            // Se crea el permiso y se configura el Permission Manager.
            acl.createPermission(adminUser, proxy, ADMIN_ROLE, proxy);
        }

        initialized();
    }

    /**
     * @notice establece los roles de un usuario.
     * @dev https://hack.aragon.org/docs/acl_ACL
     * @param _address dirección del usuario al cual se establecen los roles.
     * @param _rolesToAdd roles a agregar.
     * @param _rolesToAddApp aplicaciones sobre las cual se establecen los roles.
     * @param _rolesToRemove roles a quitar.
     * @param _rolesToAddApp aplicaciones sobre las cual se quitan los roles.
     */
    function setUserRoles(
        address _address,
        bytes32[] _rolesToAdd,
        address[] _rolesToAddApp,
        bytes32[] _rolesToRemove,
        address[] _rolesToRemoveApp
    ) external auth(ADMIN_ROLE) {
        // Se obtiene el Access Control List de la app
        ACL acl = ACL(kernel().acl());
        // Permisos a agregar
        for (uint8 i1 = 0; i1 < _rolesToAdd.length; i1++) {
            // Permission Manager: Proxy
            if (
                acl.getPermissionManager(_rolesToAddApp[i1], _rolesToAdd[i1]) !=
                proxy
            ) {
                // El role no ha sido creado por el Permission Manager.
                // Se crea el permiso y se configura el Permission Manager.
                acl.createPermission(
                    _address,
                    _rolesToAddApp[i1],
                    _rolesToAdd[i1],
                    proxy
                );
            } else {
                // El role ya ha sido creado y es manejado por el Permission Manager.
                // Solo se otorga el permiso.
                acl.grantPermission(
                    _address,
                    _rolesToAddApp[i1],
                    _rolesToAdd[i1]
                );
            }
        }
        // Permisos a quitar
        for (uint8 i2 = 0; i2 < _rolesToRemove.length; i2++) {
            if (_address == adminUser && _rolesToRemove[i2] == ADMIN_ROLE) {
                // No se permite rovocar el permiso de Admin al Admin general.
                continue;
            }
            acl.revokePermission(
                _address,
                _rolesToRemoveApp[i2],
                _rolesToRemove[i2]
            );
        }
    }

    /**
     * @notice determina si el usuario tiene o no el rol especificado en la aplicación.
     * @dev https://hack.aragon.org/docs/acl_ACL
     * @param _address dirección del usuario a chequear el rol.
     * @param _app aplicación sobre la que se chequea el rol.
     * @param _role rol a chequear si el usuario lo posee.
     */
    function hasUserRole(
        address _address,
        address _app,
        bytes32 _role
    ) external view returns (bool) {
        // Se obtiene el Access Control List de la app
        ACL acl = ACL(kernel().acl());
        return acl.hasPermission(_address, _app, _role);
    }
}
