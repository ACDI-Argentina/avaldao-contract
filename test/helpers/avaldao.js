const Avaldao = artifacts.require('Avaldao')

const newAvaldao = async (deployer) => {
  return await Avaldao.new({ from: deployer });
}

module.exports = {
  newAvaldao
}