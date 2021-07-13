const { toChecksumAddress } = require('web3-utils');

async function main() {
  const address = '0x921B37ba0E0E23DB6521C90f481Aa38fe6B7B4b1'.toLowerCase();
  console.log(toChecksumAddress(address));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });