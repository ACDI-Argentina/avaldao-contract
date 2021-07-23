const Avaldao = artifacts.require('Avaldao')
const AvalLib = artifacts.require('AvalLib')

// Ejemplo de IPFS CID con datos JSON
// https://ipfs.io/ipfs/Qmd4PvCKbFbbB8krxajCSeHdLXQamdt7yFxFxzTbedwiYM
const INFO_CID = 'Qmd4PvCKbFbbB8krxajCSeHdLXQamdt7yFxFxzTbedwiYM';

// Por versión de Solidity (0.4.24), el placeholder de la libraría aún se arma
// con el nombre y no el hash.
// En la versión 0.5.0 este mecanismo se reemplaza por el hash del nombre de la librería.
// https://github.com/ethereum/solidity/blob/develop/Changelog.md#050-2018-11-13
// Commandline interface: Use hash of library name for link placeholder instead of name itself.
const AVAL_LIB_PLACEHOLDER = '__contracts/AvalLib.sol:AvalLib_________';

const linkLib = async (lib, destination, libPlaceholder) => {
  let libAddr = lib.address.replace('0x', '').toLowerCase()
  destination.bytecode = destination.bytecode.replace(new RegExp(libPlaceholder, 'g'), libAddr)
}

const newAvaldao = async (deployer) => {
  // Link Avalado > AvalLib
  const avalLib = await AvalLib.new({ from: deployer });
  await linkLib(avalLib, Avaldao, AVAL_LIB_PLACEHOLDER);
  return await Avaldao.new({ from: deployer });
}

const getAvales = async (avaldao) => {
  let ids = await avaldao.getAvalIds();
  let avales = [];
  for (i = 0; i < ids.length; i++) {
    avales.push(await avaldao.getAval(ids[i]));
  }
  return avales;
}

module.exports = {
  INFO_CID,
  newAvaldao,
  getAvales  
}