pragma solidity ^0.4.24;
pragma experimental ABIEncoderV2;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";
import "./Constants.sol";
import "./Aval.sol";
import "./FondoGarantiaVault.sol";
import "./ExchangeRateProvider.sol";

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
    struct AvalSignable {
        address aval;
        string infoCid;
        address avaldao;
        address solicitante;
        address comerciante;
        address avalado;
    }

    uint8 private constant SIGNER_COUNT = 4;
    uint8 private constant SIGN_INDEX_SOLICITANTE = 0;
    uint8 private constant SIGN_INDEX_COMERCIANTE = 1;
    uint8 private constant SIGN_INDEX_AVALADO = 2;
    uint8 private constant SIGN_INDEX_AVALDAO = 3;
    bytes32 private DOMAIN_SEPARATOR;
    bytes32 constant EIP712DOMAIN_TYPEHASH =
        keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        );
    bytes32 constant AVAL_SIGNABLE_TYPEHASH =
        keccak256(
            "AvalSignable(address aval,string infoCid,address avaldao,address solicitante,address comerciante,address avalado)"
        );

    /**
     * Avales de Avaldao.
     */
    string[] public avalesIds;
    Aval[] public avales;

    FondoGarantiaVault public vault;

    event SaveAval(string id);
    event SignAval(string id);

    /**
     * @notice solo un Aval registrado tiene acceso.
     *
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
     * @param _contractAddress dirección del smart contract (proxy Aragon).
     */
    function initialize(
        FondoGarantiaVault _vault,
        string _name,
        string _version,
        uint256 _chainId,
        address _contractAddress
    ) external onlyInit {
        require(isContract(_vault), ERROR_VAULT_NOT_CONTRACT);
        vault = _vault;

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                EIP712DOMAIN_TYPEHASH,
                keccak256(bytes(_name)),
                keccak256(bytes(_version)),
                _chainId,
                _contractAddress
            )
        );

        initialized();
    }

    /**
     * @notice Crea un aval. Quien envía la transacción es el solicitante del aval.
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
    ) external auth(CREATE_AVAL_ROLE) {
        // El sender debe ser el solicitante del aval.
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
     * @notice Firma (múltiple) el aval por todos los participantes: Solicitante, Comerciante, Avalado y Avaldao.
     * @dev Las firmas se reciben en 3 array distintos, donde cada uno contiene las variables V, R y S de las firmas en Ethereum.
     * @dev Los elementos de los array corresponden a los firmantes, 0:Solicitante, 1:Comerciante, 2:Avalado y 3:Avaldao.
     *
     * TODO Cambiar la interface, recibiendo el address en lugar del ID del Aval.
     * @param _aval aval a firmar.
     * @param _signV array con las variables V de las firmas de los participantes.
     * @param _signR array con las variables R de las firmas de los participantes.
     * @param _signS array con las variables S de las firmas de los participantes.
     */
    function signAval(
        Aval _aval,
        uint8[] _signV,
        bytes32[] _signR,
        bytes32[] _signS
    ) external {
        // El aval solo puede firmarse por Avaldao.
        require(_aval.avaldao() == msg.sender, ERROR_AUTH_FAILED);

        // El aval solo puede firmarse si está completado.
        require(
            _aval.status() == Aval.Status.Completado,
            ERROR_AVAL_INVALID_STATUS
        );

        // Verifica que estén las firmas de todos lo firmantes.
        require(
            _signV.length == SIGNER_COUNT &&
                _signR.length == SIGNER_COUNT &&
                _signS.length == SIGNER_COUNT,
            ERROR_AVAL_FALTAN_FIRMAS
        );

        // Note: we need to use `encodePacked` here instead of `encode`.
        bytes32 hashSigned = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(
                    abi.encode(
                        AVAL_SIGNABLE_TYPEHASH,
                        address(_aval),
                        keccak256(bytes(_aval.infoCid())),
                        _aval.avaldao(),
                        _aval.solicitante(),
                        _aval.comerciante(),
                        _aval.avalado()
                    )
                )
            )
        );

        // Verficación de la firma del Solicitante.
        _verifySign(
            hashSigned,
            _signV[SIGN_INDEX_SOLICITANTE],
            _signR[SIGN_INDEX_SOLICITANTE],
            _signS[SIGN_INDEX_SOLICITANTE],
            _aval.solicitante()
        );

        // Verficación de la firma del Comerciante.
        _verifySign(
            hashSigned,
            _signV[SIGN_INDEX_COMERCIANTE],
            _signR[SIGN_INDEX_COMERCIANTE],
            _signS[SIGN_INDEX_COMERCIANTE],
            _aval.comerciante()
        );

        // Verficación de la firma del Avalado.
        _verifySign(
            hashSigned,
            _signV[SIGN_INDEX_AVALADO],
            _signR[SIGN_INDEX_AVALADO],
            _signS[SIGN_INDEX_AVALADO],
            _aval.avalado()
        );

        // Verficación de la firma del Avaldao.
        _verifySign(
            hashSigned,
            _signV[SIGN_INDEX_AVALDAO],
            _signR[SIGN_INDEX_AVALDAO],
            _signS[SIGN_INDEX_AVALDAO],
            _aval.avaldao()
        );

        // Bloqueo de fondos.
        _aval.lockFund();

        // Se realizó la verificación de todas las firmas y se bloquearon los fondos
        // por lo que el aval pasa a estado Vigente.
        _aval.updateStatus(Aval.Status.Vigente);

        emit SignAval(_aval.id());
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

    /**
     * Verifica que el signer haya firmado el hash. La firma se especifica por las variables V, R y S.
     *
     * @param _hashSigned hash firmado.
     * @param _signV variable V de las firma del firmante.
     * @param _signR variable R de las firma del firmante.
     * @param _signS variable S de las firma del firmante.
     * @param  _signer firmando a comprobar si realizó la firma.
     */
    function _verifySign(
        bytes32 _hashSigned,
        uint8 _signV,
        bytes32 _signR,
        bytes32 _signS,
        address _signer
    ) internal pure {
        // Obtiene la dirección pública de la cuenta con la cual se realizó la firma.
        address signerRecovered = ecrecover(
            _hashSigned,
            _signV,
            _signR,
            _signS
        );
        // La firma recuperada debe ser igual al firmante especificado.
        require(signerRecovered == _signer, ERROR_AVAL_INVALID_SIGN);
    }
}
