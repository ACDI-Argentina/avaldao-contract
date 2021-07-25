pragma solidity ^0.4.24;

import "../interfaces/IRoCState.sol";

contract RoCStateMock is IRoCState {
    uint256 rifPrice;

    constructor(uint256 price) public {
        rifPrice = price;
    }

    function getReserveTokenPrice() external view returns (uint256) {
        return rifPrice;
    }

    function getPriceProvider() external view returns (address) {
        return 0x0;
    }
}