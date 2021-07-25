pragma solidity ^0.4.24;

/**
 * Interface obtenida desde MOC Oracles.
 * Ver: https://api.moneyonchain.com/docs/oracles
 */
interface IMoCState {
  function getBitcoinPrice() external view returns(uint256);
  function getBtcPriceProvider() external view returns(address);
}