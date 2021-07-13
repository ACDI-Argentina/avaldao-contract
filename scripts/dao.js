const { hash } = require('eth-ens-namehash')
const { getEventArgument } = require('@aragon/contract-test-helpers/events')
const Kernel = artifacts.require('@aragon/os/build/contracts/kernel/Kernel')
const ACL = artifacts.require('@aragon/os/build/contracts/acl/ACL')
const EVMScriptRegistryFactory = artifacts.require(
  '@aragon/os/build/contracts/factory/EVMScriptRegistryFactory'
)
const DAOFactory = artifacts.require(
  '@aragon/os/build/contracts/factory/DAOFactory'
)

const newDao = async (deployer) => {

  // Deploy a DAOFactory.
  const kernelBase = await Kernel.new(true, { from: deployer })
  const aclBase = await ACL.new({ from: deployer })
  const registryFactory = await EVMScriptRegistryFactory.new({ from: deployer })
  const daoFactory = await DAOFactory.new(
    kernelBase.address,
    aclBase.address,
    registryFactory.address
  )

  // Create a DAO instance.
  const daoReceipt = await daoFactory.newDAO(deployer)
  const dao = await Kernel.at(getEventArgument(daoReceipt, 'DeployDAO', 'dao'))

  // Grant the deployer address permission to install apps in the DAO.
  const acl = await ACL.at(await dao.acl())
  const APP_MANAGER_ROLE = await kernelBase.APP_MANAGER_ROLE()
  await acl.createPermission(
    deployer,
    dao.address,
    APP_MANAGER_ROLE,
    deployer,
    { from: deployer }
  )

  return { kernelBase, aclBase, dao, acl }
}

const newApp = async (dao, appName, baseAppAddress, deployer) => {
  const receipt = await dao.newAppInstance(
    hash(`${appName}`), // appId - Unique identifier for each app installed in the DAO; can be any bytes32 string in the tests.
    baseAppAddress, // appBase - Location of the app's base implementation.
    '0x', // initializePayload - Used to instantiate and initialize the proxy in the same call (if given a non-empty bytes string).
    false, // setDefault - Whether the app proxy is the default proxy.
    { from: deployer }
  )

  // Find the deployed proxy address in the tx logs.
  const logs = receipt.logs
  const log = logs.find((l) => l.event === 'NewAppProxy')
  const proxyAddress = log.args.proxy

  return proxyAddress
}

module.exports = {
  newDao,
  newApp
}
