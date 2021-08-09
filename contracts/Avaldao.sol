pragma solidity ^0.4.24;

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
    struct Aval2 {
        uint256 id;
        string infoCid;
        address avaldao;
        address solicitante;
        address comerciante;
        address avalado;
    }
    

    uint8 private constant SIGNER_COUNT = 4;
    uint8 private constant SIGN_INDEX_SOLICITANTE = 0;
    uint8 private constant SIGN_INDEX_COMERCIANTE = 1;
    uint8 private constant SIGN_INDEX_AVALDAO = 2;
    uint8 private constant SIGN_INDEX_AVALADO = 3;
    bytes32 private DOMAIN_SEPARATOR;
    bytes32 constant EIP712DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );
    bytes32 constant AVAL_TYPEHASH = keccak256(
        "Aval2(uint256 id,string infoCid,address avaldao,address solicitante,address comerciante,address avalado)"
    );

    AvalLib.Data avalData;
    ExchangeRateProvider public exchangeRateProvider;
    Vault public vault;

    /**
     * @notice Inicializa el Avaldao App con el Vault `_vault`.
     * @param _vault Address del vault
     */
    function initialize(Vault _vault) external onlyInit {
        require(isContract(_vault), ERROR_VAULT_NOT_CONTRACT);
        vault = _vault;

        DOMAIN_SEPARATOR = hash(EIP712Domain({
            name: "Avaldao",
            version: '1',
            chainId: 33,
            // verifyingContract: this
            verifyingContract: 0x05A55E87d40572ea0F9e9D37079FB9cA11bdCc67
        }));

        initialized();
    }

    event SaveAval(uint256 id);

    /**
     * @notice Crea o actualiza un aval. Quien envía la transacción es el solicitante del aval.
     * @param _id identificador del aval. 0 si se está creando un aval.
     * @param _infoCid Content ID de las información (JSON) del aval. IPFS Cid.
     * @param _avaldao address de Avaldao
     * @param _comerciante address del Comerciante
     * @param _avalado address del Avalado
     */
    function saveAval(
        uint256 _id,
        string _infoCid,
        address _avaldao,
        address _comerciante,
        address _avalado
    ) external auth(CREATE_AVAL_ROLE) {
        uint256 id = avalData.save(
            _id,
            _infoCid,
            _avaldao,
            msg.sender,
            _comerciante,
            _avalado
        );
        emit SaveAval(id);
    }

    // Note that address recovered from signatures must be strictly increasing, in order to prevent duplicates

    /**
     * @notice Firma (múltiple) el aval por todos los participantes: Solicitante, Comerciante, Avalado y Avaldao.
     * @dev Las firmas se reciben en 3 array distintos, donde cada uno contiene las variables V, R y S de las firmas en Ethereum.
     * @dev Los elementos de los array corresponden a los firmantes, 0:Solicitante, 1:Comerciante, 2:Avalado y 4:Avaldao.
     * @param _id identificador del aval a firmar.
     * @param _signV array con las variables V de las firmas de los participantes.
     * @param _signR array con las variables R de las firmas de los participantes.
     * @param _signS array con las variables S de las firmas de los participantes.
     */
    function signAval(
        uint256 _id,
        uint8[] _signV,
        bytes32[] _signR,
        bytes32[] _signS
    ) public {
        AvalLib.Aval storage aval = _getAval(_id);

        // Verifica que estén las firmas de todos lo firmantes.
        require(
            _signV.length == SIGNER_COUNT &&
                _signR.length == SIGNER_COUNT &&
                _signS.length == SIGNER_COUNT
        );

        // TODO Agregar un nonce a la firma.

        // Note: we need to use `encodePacked` here instead of `encode`.
        bytes32 digest = keccak256(abi.encodePacked(
            "\x19\x01",
            DOMAIN_SEPARATOR,
            hash(Aval2({
                id: aval.id,
                infoCid: aval.infoCid,
                avaldao: aval.avaldao,
                solicitante: aval.solicitante,
                comerciante: aval.comerciante,
                avalado: aval.avalado
            }))
        ));

        verifySign(digest,
            _signV[SIGN_INDEX_SOLICITANTE],
            _signR[SIGN_INDEX_SOLICITANTE],
            _signS[SIGN_INDEX_SOLICITANTE],
            aval.solicitante);

        verifySign(digest,
            _signV[SIGN_INDEX_COMERCIANTE],
            _signR[SIGN_INDEX_COMERCIANTE],
            _signS[SIGN_INDEX_COMERCIANTE],
            aval.comerciante);

        verifySign(digest,
            _signV[SIGN_INDEX_AVALDAO],
            _signR[SIGN_INDEX_AVALDAO],
            _signS[SIGN_INDEX_AVALDAO],
            aval.avaldao);

        verifySign(digest,
            _signV[SIGN_INDEX_AVALADO],
            _signR[SIGN_INDEX_AVALADO],
            _signS[SIGN_INDEX_AVALADO],
            aval.avalado);

        // TODO Completar.
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
    function getAvalIds() external view returns (uint256[]) {
        return avalData.ids;
    }

    /**
     * @notice Obtiene el Aval cuyo identificador coincide con `_id`.
     * @return Datos del Aval.
     */
    function getAval(uint256 _id)
        external
        view
        returns (
            uint256 id,
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

    function _getAval(uint256 _id) private returns (AvalLib.Aval storage) {
        return avalData.getAval(_id);
    }

    function hash(EIP712Domain eip712Domain) internal pure returns (bytes32) {
        return keccak256(abi.encode(
            EIP712DOMAIN_TYPEHASH,
            keccak256(bytes(eip712Domain.name)),
            keccak256(bytes(eip712Domain.version)),
            eip712Domain.chainId,
            eip712Domain.verifyingContract
        ));
    }

    function hash(Aval2 aval) internal pure returns (bytes32) {
        return keccak256(abi.encode(
            AVAL_TYPEHASH,
            aval.id,
            keccak256(bytes(aval.infoCid)),
            aval.avaldao,
            aval.solicitante,
            aval.comerciante,
            aval.avalado
        ));
    }

    function verifySign(bytes32 _digest,
        uint8 _signV,
        bytes32 _signR,
        bytes32 _signS,
        address signer) internal pure {
        address signerRecovered = ecrecover(
                _digest,
                _signV,
                _signR,
                _signS
            );
        require(signerRecovered == signer, ERROR_INVALID_SIGN);
    }
}
