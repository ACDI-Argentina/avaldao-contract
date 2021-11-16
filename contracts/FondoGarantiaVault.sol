pragma solidity ^0.4.24;
pragma experimental ABIEncoderV2;

import "@aragon/os/contracts/lib/math/SafeMath.sol";
import "@aragon/apps-vault/contracts/Vault.sol";
import "./Constants.sol";
import "./ExchangeRateProvider.sol";

/**
 * @title Vault de Fondo de Garantía.
 * @author ACDI
 * @notice Contrato de Vault de Fondo de Garantía.
 */
contract FondoGarantiaVault is Vault, Constants {
    using SafeMath for uint256;

    /**
     * @dev Almacena los tokens permitidos para reunir fondos de garantía.
     */
    address[] public tokens;

    ExchangeRateProvider public exchangeRateProvider;

    /**
     * @notice Setea el Exchange Rate Provider.
     */
    function setExchangeRateProvider(ExchangeRateProvider _exchangeRateProvider)
        external
        auth(SET_EXCHANGE_RATE_PROVIDER)
    {
        exchangeRateProvider = _exchangeRateProvider;
    }

    /**
     * @notice Habilita el token `_token` como fondo de garantía.
     * @param _token token habilitado como fondo de garantía.
     */
    function enableToken(address _token) external auth(ENABLE_TOKEN_ROLE) {
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == _token) {
                // El token ya está habilitado.
                return;
            }
        }
        tokens.push(_token);
    }

    // Getters functions

    /**
     * @notice Obtiene el monto disponible en moneda FIAT del fondo de garantía.
     */
    function getTokensBalanceFiat() public view returns (uint256) {
        uint256 availableFundFiat = 0;
        for (uint256 i = 0; i < tokens.length; i++) {
            address token = tokens[i];
            uint256 tokenAvailableFund = balance(token);
            uint256 tokenRate = exchangeRateProvider.getExchangeRate(token);
            availableFundFiat = availableFundFiat.add(
                tokenAvailableFund.div(tokenRate)
            );
        }
        return availableFundFiat;
    }

    /**
     * Obtiene todos los tokens permitidos para reunir fondos de garantía.
     */
    function getTokens() public view returns (address[]) {
        return tokens;
    }

    /**
     * @notice Obtiene el balance de un token en el fondo de garantía.
     * @param _token token del cual se requiere el token balance del fondo de garantía.
     */
    function getTokenBalance(address _token)
        external
        view
        returns (
            address token,
            uint256 amount,
            uint256 rate,
            uint256 amountFiat
        )
    {
        token = _token;
        amount = balance(_token);
        rate = exchangeRateProvider.getExchangeRate(_token);
        amountFiat = amount.div(rate);
    }
}
