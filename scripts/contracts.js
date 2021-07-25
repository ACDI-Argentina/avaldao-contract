const AvaldaoArtifact = require('../artifacts/Avaldao.json');
const ExchangeRateProviderArtifact = require('../artifacts/ExchangeRateProvider.json');
// https://ethereum.org/en/developers/tutorials/calling-a-smart-contract-from-javascript/
const ERC20Artifact = require('../artifacts/ERC20.json');

module.exports = {
  AvaldaoAbi: AvaldaoArtifact.abi,
  ExchangeRateProviderAbi: ExchangeRateProviderArtifact.abi,
  ERC20Abi: ERC20Artifact.abi
};