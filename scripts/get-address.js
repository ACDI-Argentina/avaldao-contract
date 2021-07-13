var bytes_1 = require("@ethersproject/bytes");
var keccak256_1 = require("@ethersproject/keccak256");

async function main() {

  



  const addressOri = '0x42378FeAD5534dbAff26E7fC10d24cB9C6648B1E';
  if (!bytes_1.isHexString(address, 20)) {
    //logger.throwArgumentError("invalid address", "address", address);
    console.error("invalid address", "address", address);
  }
  var address = addressOri.toLowerCase();
  var chars = address.substring(2).split("");
  var expanded = new Uint8Array(40);
  for (var i = 0; i < 40; i++) {
    expanded[i] = chars[i].charCodeAt(0);
  }
  var hashed = bytes_1.arrayify(keccak256_1.keccak256(expanded));
  for (var i = 0; i < 40; i += 2) {
    if ((hashed[i >> 1] >> 4) >= 8) {
      chars[i] = chars[i].toUpperCase();
    }
    if ((hashed[i >> 1] & 0x0f) >= 8) {
      chars[i + 1] = chars[i + 1].toUpperCase();
    }
  }

  console.log('Convert result', addressOri, "0x" + chars.join(""));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });