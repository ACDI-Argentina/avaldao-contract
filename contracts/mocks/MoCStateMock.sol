pragma solidity ^0.4.24;

import "../interfaces/IMoCState.sol";

contract MoCStateMock is IMoCState {
    uint256 rbtcPrice;

    constructor(uint256 price) public {
        rbtcPrice = price;
    }

    function getBitcoinPrice() external view returns (uint256) {
        return rbtcPrice;
    }

    function getBtcPriceProvider() external view returns (address) {
        return 0x0;
    }
}
