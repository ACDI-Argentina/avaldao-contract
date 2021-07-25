pragma solidity ^0.4.24;

import "./interfaces/IMoCState.sol";
import "./interfaces/IRoCState.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";

/**
 * Responsable de proveer la tasa de cambio de RBTC.
 */
contract ExchangeRateProvider {
    using SafeMath for uint256;
    IMoCState internal moCState;
    IRoCState internal roCState;
    address RBTC;
    address RIF;
    address DOC;
    uint256 DOC_PRICE;

    //array of allowed tokens? //require comprobaria que se encuentre en el listado

    constructor(
        IMoCState _moCStateAddress,
        IRoCState _roCStateAddress,
        address _rifTokenAddress,
        address _docTokenAddress,
        uint256 _docTokenPrice
    ) public {
        // RBTC Token
        moCState = _moCStateAddress;
        RBTC = address(0);
        // RIF Token
        roCState = _roCStateAddress;
        RIF = _rifTokenAddress;
        // DOC Token
        DOC = _docTokenAddress;
        DOC_PRICE = _docTokenPrice;
    }

    /**
     * @param _token Token para el cual se establece el tipo de cambio en USD.
     * @return _rate Equivalencia de 0.01 USD en Token.
     */
    function getExchangeRate(address _token) public view returns (uint256) {
        if (_token == RBTC) {
            // RBTC Token
            uint256 rbtcTokenPrice = moCState.getBitcoinPrice();
            return _asExchangeRate(rbtcTokenPrice);
        } else if (_token == RIF) {
            // RIF Token
            uint256 rifTokenPrice = roCState.getReserveTokenPrice();
            return _asExchangeRate(rifTokenPrice);
        } else if (_token == DOC) {
            // DOC Token
            uint256 docTokenPrice = DOC_PRICE;
            return _asExchangeRate(docTokenPrice);
        } else {
            return 1; //we should revert transaction? https://blog.polymath.network/try-catch-in-solidity-handling-the-revert-exception-f53718f76047
            //Otra alternativa sería retornar una tupla (has,exchangeRate)
        }
    }

    /**
     * Obtiene el precio de RBTC utilizando MOC Oracles.
     */
    function getRbtcPrice() public view returns (uint256) {
        return moCState.getBitcoinPrice();
    }

    /**
     * Convierte un monto medido en dólares a la tasa de cambio de 0.01 USD medida en wei.
     *
     * 1RBTC = 1000000000000000000 wei ==== USD_PRICE USD
     *                           X wei ====      0.01 USD
     *
     * RBTC_RATE = 1000000000000000000 * 0.01 / USD_PRICE;
     * RBTC_RATE = 10000000000000000 / USD_PRICE;
     */
    function _asExchangeRate(uint256 tokenPrice)
        private
        pure
        returns (uint256)
    {
        uint256 weiFactor = 1000000000000000000;
        uint256 numerator = 10000000000000000;
        //return numerator.div(tokenPrice.div(weiFactor));
        return numerator.mul(weiFactor).div(tokenPrice);
    }
}