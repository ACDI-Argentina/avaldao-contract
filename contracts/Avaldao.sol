pragma solidity ^0.4.24;
pragma experimental ABIEncoderV2;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/apps-vault/contracts/Vault.sol";
import "./Constants.sol";
import "./AvalLib.sol";
import "./ExchangeRateProvider.sol";

/**
 * @title Avaldao
 * @author ACDI
 * @notice Contrato de Avaldao.
 */
contract Avaldao is AragonApp, Constants {
    using AvalLib for AvalLib.Data;

    struct EIP712Domain {
        string name;
        string version;
        uint256 chainId;
        address verifyingContract;
    }
    struct AvalSignable {
        string id;
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
            "AvalSignable(string id,string infoCid,address avaldao,address solicitante,address comerciante,address avalado)"
        );

    AvalLib.Data avalData;
    ExchangeRateProvider public exchangeRateProvider;
    Vault public vault;

    /**
     * @notice Inicializa el Avaldao App con el Vault `_vault`.
     * @param _vault Address del vault
     * @param _version versión del smart contract.
     * @param _chainId identificador de la red.
     * @param _contractAddress dirección del smart contract (proxy Aragon).
     */
    function initialize(
        Vault _vault,
        string _version,
        uint256 _chainId,
        address _contractAddress
    ) external onlyInit {
        require(isContract(_vault), ERROR_VAULT_NOT_CONTRACT);
        vault = _vault;

        DOMAIN_SEPARATOR = _hash(
            EIP712Domain({
                name: "Avaldao",
                version: _version,
                chainId: _chainId,
                verifyingContract: _contractAddress
            })
        );

        initialized();
    }

    event SaveAval(string id);
    event SignAval(string id);

    /**
     * @notice Crea o actualiza un aval. Quien envía la transacción es el solicitante del aval.
     * @param _id identificador del aval.
     * @param _infoCid Content ID de las información (JSON) del aval. IPFS Cid.
     * @param _avaldao address de Avaldao
     * @param _comerciante address del Comerciante
     * @param _avalado address del Avalado
     */
    function saveAval(
        string _id,
        string _infoCid,
        address _avaldao,
        address _comerciante,
        address _avalado
    ) external auth(CREATE_AVAL_ROLE) {
        avalData.save(
            _id,
            _infoCid,
            _avaldao,
            msg.sender,
            _comerciante,
            _avalado
        );
        emit SaveAval(_id);
    }

    /**
     * @notice Firma (múltiple) el aval por todos los participantes: Solicitante, Comerciante, Avalado y Avaldao.
     * @dev Las firmas se reciben en 3 array distintos, donde cada uno contiene las variables V, R y S de las firmas en Ethereum.
     * @dev Los elementos de los array corresponden a los firmantes, 0:Solicitante, 1:Comerciante, 2:Avalado y 3:Avaldao.
     * @param _id identificador del aval a firmar.
     * @param _signV array con las variables V de las firmas de los participantes.
     * @param _signR array con las variables R de las firmas de los participantes.
     * @param _signS array con las variables S de las firmas de los participantes.
     */
    function signAval(
        string _id,
        uint8[] _signV,
        bytes32[] _signR,
        bytes32[] _signS
    ) public {
        AvalLib.Aval storage aval = _getAval(_id);

        // El aval solo puede firmarse si está completado.
        require(
            aval.status == AvalLib.Status.Completado,
            ERROR_AVAL_NO_COMPLETADO
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
                _hash(
                    AvalSignable({
                        id: aval.id,
                        infoCid: aval.infoCid,
                        avaldao: aval.avaldao,
                        solicitante: aval.solicitante,
                        comerciante: aval.comerciante,
                        avalado: aval.avalado
                    })
                )
            )
        );

        // Verficación de la firma del Solicitante.
        _verifySign(
            hashSigned,
            _signV[SIGN_INDEX_SOLICITANTE],
            _signR[SIGN_INDEX_SOLICITANTE],
            _signS[SIGN_INDEX_SOLICITANTE],
            aval.solicitante
        );

        // Verficación de la firma del Comerciante.
        _verifySign(
            hashSigned,
            _signV[SIGN_INDEX_COMERCIANTE],
            _signR[SIGN_INDEX_COMERCIANTE],
            _signS[SIGN_INDEX_COMERCIANTE],
            aval.comerciante
        );

        // Verficación de la firma del Avalado.
        _verifySign(
            hashSigned,
            _signV[SIGN_INDEX_AVALADO],
            _signR[SIGN_INDEX_AVALADO],
            _signS[SIGN_INDEX_AVALADO],
            aval.avalado
        );

        // Verficación de la firma del Avaldao.
        _verifySign(
            hashSigned,
            _signV[SIGN_INDEX_AVALDAO],
            _signR[SIGN_INDEX_AVALDAO],
            _signS[SIGN_INDEX_AVALDAO],
            aval.avaldao
        );

        // Se realizó la verificación de todas las firmas, por lo que el aval pasa a estado Vigente.
        aval.status = AvalLib.Status.Vigente;
        emit SignAval(_id);
    }

    function setExchangeRateProvider(ExchangeRateProvider _exchangeRateProvider)
        public
        auth(SET_EXCHANGE_RATE_PROVIDER)
    {
        exchangeRateProvider = _exchangeRateProvider;
    }

    // Getters functions

    /**
     * @notice Obtiene todos los identificadores de Avales.
     * @return Arreglo con todos los identificadores de Avales.
     */
    function getAvalIds() external view returns (string[]) {
        return avalData.ids;
    }

    /**
     * @notice Obtiene el Aval cuyo identificador coincide con `_id`.
     * @return Datos del Aval.
     */
    function getAval(string _id)
        external
        view
        returns (
            string id,
            string infoCid,
            address avaldao,
            address solicitante,
            address comerciante,
            address avalado,
            AvalLib.Status status
        )
    {
        AvalLib.Aval storage aval = _getAval(_id);
        id = aval.id;
        infoCid = aval.infoCid;
        avaldao = aval.avaldao;
        solicitante = aval.solicitante;
        comerciante = aval.comerciante;
        avalado = aval.avalado;
        status = aval.status;
    }

    // Internal functions

    function _getAval(string _id) private returns (AvalLib.Aval storage) {
        return avalData.getAval(_id);
    }

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
        require(signerRecovered == _signer, ERROR_INVALID_SIGN);
    }

    function _hash(EIP712Domain eip712Domain) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    EIP712DOMAIN_TYPEHASH,
                    keccak256(bytes(eip712Domain.name)),
                    keccak256(bytes(eip712Domain.version)),
                    eip712Domain.chainId,
                    eip712Domain.verifyingContract
                )
            );
    }

    function _hash(AvalSignable avalSignable) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    AVAL_SIGNABLE_TYPEHASH,
                    keccak256(bytes(avalSignable.id)),
                    keccak256(bytes(avalSignable.infoCid)),
                    avalSignable.avaldao,
                    avalSignable.solicitante,
                    avalSignable.comerciante,
                    avalSignable.avalado
                )
            );
    }
}