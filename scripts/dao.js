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
  return receipt.logs.find((l) => l.event === 'NewAppProxy').args.proxy
}

const setApp = async (dao, appName, baseAppAddress, deployer) => {

  const namespace = await dao.APP_BASES_NAMESPACE();
  const appId = hash(`${appName}`);

  await dao.setApp(
    namespace,
    appId,
    baseAppAddress,
    { from: deployer }
  )
}

/**
 * Crea una nueva app en la DAO si aún no existe o cambia la implementación actual.
 * 
 * https://hack.aragon.org/docs/kernel_Kernel
 */
const newOrSetApp = async (dao, appName, baseAppAddress, deployer) => {

  const namespace = await dao.APP_BASES_NAMESPACE();
  const appId = hash(`${appName}`);

  let appAddress = await dao.getApp(
    namespace,
    appId,
    { from: deployer }
  );

  console.log(`newOrSetApp ${appName}: ${appAddress}`);

  let appIsNew = false;
  if (appAddress === '0x0000000000000000000000000000000000000000') {
    // La App no existe, por lo que es creada.
    appIsNew = true;
    appAddress = await newApp(dao, appName, baseAppAddress, deployer);
  } else {
    // La App ya existe, por lo que es actualizada.
    await setApp(dao, appName, baseAppAddress, deployer);
  }

  return {
    isNew: appIsNew,
    address: appAddress
  }
}

module.exports = {
  newDao,
  newApp,
  newOrSetApp
}
