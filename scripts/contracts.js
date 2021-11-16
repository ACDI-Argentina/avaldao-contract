const AvaldaoArtifact = require('../artifacts/Avaldao.json');
const AvalArtifact = require('../artifacts/Aval.json');
const FondoGarantiaVaultArtifact = require('../artifacts/FondoGarantiaVault.json');
const ExchangeRateProviderArtifact = require('../artifacts/ExchangeRateProvider.json');
// https://ethereum.org/en/developers/tutorials/calling-a-smart-contract-from-javascript/
const ERC20Artifact = require('../artifacts/ERC20.json');

module.exports = {
  AvaldaoAbi: AvaldaoArtifact.abi,
  AvalAbi: AvalArtifact.abi,
  FondoGarantiaVaultAbi: FondoGarantiaVaultArtifact.abi,
  ExchangeRateProviderAbi: ExchangeRateProviderArtifact.abi,
  ERC20Abi: ERC20Artifact.abi
};