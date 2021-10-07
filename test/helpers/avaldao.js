const Avaldao = artifacts.require('Avaldao')

// Ejemplo de IPFS CID con datos JSON
// https://ipfs.io/ipfs/Qmd4PvCKbFbbB8krxajCSeHdLXQamdt7yFxFxzTbedwiYM
const INFO_CID = 'Qmd4PvCKbFbbB8krxajCSeHdLXQamdt7yFxFxzTbedwiYM';

const newAvaldao = async (deployer) => {
  return await Avaldao.new({ from: deployer });
}

const getAvales = async (avaldao) => {
  let ids = await avaldao.getAvalIds();
  console.log(ids);
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