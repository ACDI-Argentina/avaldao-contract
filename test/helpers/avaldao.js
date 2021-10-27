const Avaldao = artifacts.require('Avaldao')
const Aval = artifacts.require('Aval')

// Ejemplo de IPFS CID con datos JSON
// https://ipfs.io/ipfs/Qmd4PvCKbFbbB8krxajCSeHdLXQamdt7yFxFxzTbedwiYM
const INFO_CID = 'Qmd4PvCKbFbbB8krxajCSeHdLXQamdt7yFxFxzTbedwiYM';

const newAvaldao = async (deployer) => {
  return await Avaldao.new({ from: deployer, gas: 9500000 });
}

const getAvales = async (avaldao) => {
  let ids = await avaldao.getAvalIds();
  let avales = [];
  for (i = 0; i < ids.length; i++) {
    const avalAddress = await avaldao.getAvalAddress(ids[i]);
    const aval = await Aval.at(avalAddress);
    const avalData = {
      id: await aval.id(),
      infoCid: await aval.infoCid(),
      avaldao: await aval.avaldao(),
      solicitante: await aval.solicitante(),
      comerciante: await aval.comerciante(),
      avalado: await aval.avalado(),
      montoFiat: await aval.montoFiat(),
      cuotasCantidad: await aval.cuotasCantidad(),
      cuotas: [],
      status: await aval.status()
    };
    for (let cuotaNumero = 1; cuotaNumero <= avalData.cuotasCantidad; cuotaNumero++) {
      const cuota = await aval.getCuotaByNumero(cuotaNumero);
      avalData.cuotas.push(cuota);
    }
    avales.push(avalData);
  }
  return avales;
}

module.exports = {
  INFO_CID,
  newAvaldao,
  getAvales
}