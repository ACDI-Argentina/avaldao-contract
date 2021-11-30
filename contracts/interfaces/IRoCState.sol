pragma solidity ^0.4.24;

/**
 * Interface obtenida desde MOC Oracles.
 * Ver: https://api.moneyonchain.com/docs/oracles
 */
interface IRoCState {
  function getReserveTokenPrice() external view returns(uint256);
  function getPriceProvider() external view returns(address);
}