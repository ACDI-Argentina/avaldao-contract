pragma solidity ^0.4.24;
pragma experimental ABIEncoderV2;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/acl/ACL.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";
import "./Constants.sol";
import "./Aval.sol";
import "./FondoGarantiaVault.sol";

/**
 * @title Avaldao
 * @author ACDI
 * @notice Contrato de Avaldao.
 */
contract Avaldao is AragonApp, Constants {
    using SafeMath for uint256;

    struct EIP712Domain {
        string name;
        string version;
        uint256 chainId;
        address verifyingContract;
    }

    string[] private avalesIds;
    Aval[] private avales;
    address private proxy;
    FondoGarantiaVault public vault;
    bytes32 public DOMAIN_SEPARATOR;

    event SaveAval(string id);

    /**
     * @notice solo un Aval registrado tiene acceso.
     */
    modifier onlyByAval() {
        bool isAval = false;
        for (uint256 i = 0; i < avales.length; i++) {
            if (msg.sender == address(avales[i])) {
                isAval = true;
                break;
            }
        }
        require(isAval, ERROR_AUTH_FAILED);
        _;
    }

    /**
     * @notice Inicializa el Avaldao App con el Vault `_vault`.
     * @param _vault Address del Vault con los fondos de garantía general.
     * @param _version versión del smart contract.
     * @param _chainId identificador de la red.
     * @param _proxyAddress dirección del smart contract (proxy Aragon).
     * @param _avaldaoUseraddress dirección del usuario Avaldao principal.
     */
    function initialize(
        FondoGarantiaVault _vault,
        string _name,
        string _version,
        uint256 _chainId,
        address _proxyAddress,
        address _avaldaoUseraddress
    ) external onlyInit {
        require(isContract(_vault), ERROR_VAULT_NOT_CONTRACT);
        vault = _vault;
        proxy = _proxyAddress;
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256(bytes(_name)),
                keccak256(bytes(_version)),
                _chainId,
                proxy
            )
        );

        // Configuración del usuario Avaldao.
        // De esta manera el usuario Avaldao puede asignar roles
        // e incluso asignar el role AVLADAO_ROLE a otros usuarios.
        ACL acl = ACL(kernel().acl());
        if (acl.getPermissionManager(proxy, AVALDAO_ROLE) != proxy) {
            // El role no ha sido creado por el Permission Manager.
            // Se crea el permiso y se configura el Permission Manager.
            acl.createPermission(
                _avaldaoUseraddress,
                proxy,
                AVALDAO_ROLE,
                proxy
            );
        }

        initialized();
    }

    /**
     * @notice Crea un aval. Quien envía la transacción es Avaldao.
     * @param _id identidicador del aval.
     * @param _infoCid Content ID de la información (JSON) del aval. IPFS Cid.
     * @param _users direcciones con los participantes del aval. 0:Solicitante, 1:Comerciante, 2:Avalado y 3:Avaldao.
     * @param _montoFiat monto FIAT del aval medido en centavos de USD.
     * @param _timestampCuotas timestamps con las fechas de las cuotas medidas en segundos. El número requiere 4 bytes.
     */
    function saveAval(
        string _id,
        string _infoCid,
        address[] _users,
        uint256 _montoFiat,
        bytes4[] _timestampCuotas
    ) external auth(AVALDAO_ROLE) {
        // El sender debe ser Avaldao del aval.
        require(_users[0] == msg.sender, ERROR_AUTH_FAILED);

        // Cada cuota se compone por un par de fecha de vencimiento y desbloqueo.
        uint8 cuotasCantidad = uint8(_timestampCuotas.length.div(2));

        // El monto debe ser múltiplo de la cantidad de cuotas.
        require(
            _montoFiat.mod(cuotasCantidad) == 0,
            ERROR_AVAL_CUOTAS_INVALIDAS
        );

        // Si no se realiza este copiado, el smart contract no compila con el siguiente error:
        // UnimplementedFeatureError: Only byte arrays can be encoded from calldata currently.
        // Error BDLR600: Compilation failed
        address[] memory users = _users;

        Aval aval = new Aval(_id, _infoCid, users, _montoFiat);

        // Establecimiento de cuotas.
        uint256 montoFiatCuota = _montoFiat.div(cuotasCantidad);
        for (uint8 i = 0; i < cuotasCantidad; i++) {
            aval.addCuota(
                montoFiatCuota,
                uint32(_timestampCuotas[i * 2]), // Timestamp con la fecha de vencimiento.
                uint32(_timestampCuotas[i * 2 + 1]) // Timestamp con la fecha de desbloqueo.
            );
        }

        avalesIds.push(_id);
        avales.push(aval);
        emit SaveAval(_id);
    }

    /**
     * @notice transfiere `_amount` `_token` al `_aval` desde el fondo de garantía.
     * @param _token token a transferir.
     * @param _amount cantidad del token a transferir.
     * @param _aval aval al cual se transfiere el token.
     */
    function transferFund(
        address _token,
        uint256 _amount,
        Aval _aval
    ) public onlyByAval {
        vault.transfer(_token, address(_aval), _amount);
    }

    /**
     * @notice establece los permisos sobre el contrato de Avaldao.
     * @dev https://hack.aragon.org/docs/acl_ACL
     * @param _address dirección del usuario al cual se establecen los permisos.
     * @param _rolesToAdd roles a agregar a Avaldao.
     * @param _rolesToRemove roles a quitar de Avaldao.
     */
    function setUserRoles(
        address _address,
        bytes32[] _rolesToAdd,
        bytes32[] _rolesToRemove
    ) external auth(AVALDAO_ROLE) {
        // Se obtiene el Access Control List de la app
        ACL acl = ACL(kernel().acl());
        // Permisos a agregar
        for (uint8 i1 = 0; i1 < _rolesToAdd.length; i1++) {
            bytes32 role = _rolesToAdd[i1];
            // Permission Manager: Proxy
            if (acl.getPermissionManager(proxy, role) != proxy) {
                // El role no ha sido creado por el Permission Manager.
                // Se crea el permiso y se configura el Permission Manager.
                acl.createPermission(_address, proxy, role, proxy);
            } else {
                // El role ya ha sido creado y es manejado por el Permission Manager.
                // Solo se otorga el permiso.
                acl.grantPermission(_address, proxy, role);
            }
        }
        // Permisos a quitar
        for (uint8 i2 = 0; i2 < _rolesToRemove.length; i2++) {
            acl.revokePermission(_address, proxy, _rolesToRemove[i2]);
        }
    }

    // Getters functions

    /**
     * @notice Obtiene todos los identificadores de Avales.
     * @return Arreglo con todos los identificadores de Avales.
     */
    function getAvalIds() external view returns (string[]) {
        return avalesIds;
    }

    /**
     * @notice Obtiene el address del Aval cuyo identificador coincide con `_id`.
     * @return Address del Aval.
     */
    function getAvalAddress(string _id)
        external
        view
        returns (address avalAddress)
    {
        for (uint256 i = 0; i < avales.length; i++) {
            if (
                keccak256(abi.encodePacked(avales[i].id())) ==
                keccak256(abi.encodePacked(_id))
            ) {
                avalAddress = address(avales[i]);
                break;
            }
        }
    }

    // Internal functions
}
