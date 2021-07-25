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
        initialized();
    }

    event SaveAval(uint256 id);

    /**
     * @notice Crea o actualiza un aval. Quien envía la transacción es el solicitante del aval.
     * @param _id identificador del aval. 0 si se está creando un aval.
     * @param _infoCid Content ID de las información (JSON) del aval. IPFS Cid.
     * @param _comerciante address del Comerciante
     * @param _avalado address del Avalado
     */
    function saveAval(
        uint256 _id,
        string _infoCid,
        address _comerciante,
        address _avalado
    ) external auth(CREATE_AVAL_ROLE) {
        uint256 id = avalData.save(
            _id,
            _infoCid,
            msg.sender,
            _comerciante,
            _avalado
        );
        emit SaveAval(id);
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
            address solicitante,
            address comerciante,
            address avalado,
            AvalLib.Status status
        )
    {
        AvalLib.Aval storage aval = _getAval(_id);
        id = aval.id;
        infoCid = aval.infoCid;
        solicitante = aval.solicitante;
        comerciante = aval.comerciante;
        avalado = aval.avalado;
        status = aval.status;
    }

    // Internal functions

    function _getAval(uint256 _id) private returns (AvalLib.Aval storage) {
        return avalData.getAval(_id);
    }
}
