const { keccak256 } = require('web3-utils');

/**
 * Removes prefix from address if exists.
 * @param {string} address
 * @returns {string} address without prefix
 */
function stripHexPrefix(str) {
  return str.slice(0, 2) === '0x' ? str.slice(2) : str
}


async function main() {
  const address = '0x3315f76FB2a5757e4Bf70123200E3Ee57CD7BADf';
  // Ethereum Mainnet: 1
  // Mainnet: 30
  const chainId = 1;
  const strip_address = stripHexPrefix(address).toLowerCase()
  const prefix = chainId != null ? (chainId.toString() + '0x') : ''
  const keccak_hash = keccak256(prefix + strip_address).toString('hex')
  let output = '0x'

  for (let i = 0; i < strip_address.length; i++)
    output += parseInt(keccak_hash[i], 16) >= 8 ?
      strip_address[i].toUpperCase() :
      strip_address[i]

  console.log('Convert result', address, output);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });