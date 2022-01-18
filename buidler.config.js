const { usePlugin } = require('@nomiclabs/buidler/config')
const hooks = require('./scripts/buidler-hooks')

usePlugin('@aragon/buidler-aragon')
usePlugin('buidler-deploy');

module.exports = {
  // Default Buidler configurations. Read more about it at https://buidler.dev/config/
  defaultNetwork: 'localhost',
  networks: {
    localhost: {
      url: 'http://localhost:8545',
      timeout: 60000
    },
    buidlerevm: {
      allowUnlimitedContractSize: false
    },
    rskRegtest: {
      url: 'http://localhost:4444',
      chainId: 33,
      accounts: 'remote',
      gas: 6800000,
      timeout: 60000
    },
    rskTestnet: {
      url: 'https://public-node.testnet.rsk.co',
      chainId: 31,
      from: '0x41ba2e6eF76ABFd57fC0DD03e696c711EC4002Ca',
      // a list of local accounts (by setting it to an array of hex-encoded private keys)
      // Public Key: 0x41ba2e6eF76ABFd57fC0DD03e696c711EC4002Ca
      // Private Key: da87821735850d8165de05b6c20d8c71d33b700d8fa8c3480b3d8b7318f1bb89
      accounts: ['0xda87821735850d8165de05b6c20d8c71d33b700d8fa8c3480b3d8b7318f1bb89'],
      gas: 6800000,
      timeout: 600000
      // Explorer: https://explorer.testnet.rsk.co
      // Faucet: https://faucet.rsk.co
    },
    rskMainnet: {
      url: 'https://public-node.rsk.co',
      chainId: 30,
      from: '0x60fcf72766f805c04b272796ef1b0b7c4d051c46',
      // a list of local accounts (by setting it to an array of hex-encoded private keys)
      // IMPORTANTE: no subir la repositorio los valores de este array
      accounts: [''],
      gas: 6800000,
      timeout: 3600000
      // Explorer: https://explorer.rsk.co
    }
  },
  solc: {
    version: '0.4.24',
    optimizer: {
      enabled: true,
      runs: 1
    },
  },
  // Etherscan plugin configuration. Learn more at https://github.com/nomiclabs/buidler/tree/master/packages/buidler-etherscan
  etherscan: {
    apiKey: '', // API Key for smart contract verification. Get yours at https://etherscan.io/apis
  },
  // Aragon plugin configuration
  aragon: {
    appServePort: 8001,
    clientServePort: 3000,
    appSrcPath: 'app/',
    appBuildOutputPath: 'dist/',
    appName: 'first-dao',
    hooks, // Path to script hooks
    nodes: {
      defaultEth: 'ws://localhost:8545/websocket'
    }
    /*deployedAddresses: {
      ens: '0x9a16bCfC7c2D996694C9854B8C23b3A0C477b1c8',
      apm: '0xF73c04c9eAAc370845ce26da230B7769546ed45d',
      daoFactory: '0xEB71c55A85016d201718b7B08701b495548fe6aD'
    } */
  },
  // Deploy plugin configuration
  // Network Ids
  // https://chainid.network/
  // 30: RSK Mainnet
  // 31: RSK Testnet
  // 33: RSK Regtest (según configuración)
  namedAccounts: {
    deployer: {
      default: 0, // here this will by default take the first account as deployer
      30: '0x60fcf72766f805c04b272796ef1b0b7c4d051c46',
      31: '0x41ba2e6eF76ABFd57fC0DD03e696c711EC4002Ca'
    },
    account1: {
      default: 1,
      30: '0x42378fEad5534DbAFf26E7Fc10d24Cb9C6648b1e',
      31: '0x9deC90af27E95299D56Cef85eE1aD7E77353dDBB',
      33: '0xee4b388fb98420811C9e04AE8378330C05A2735a'
    },
    account2: {
      default: 2,
      30: '0x9048F048d6b9Bb99Df1ad1121400e05802F9Ce9d',
      31: '0xdEC19efEEf1962D82FfAA3FC8C9A8064BF5Bbe3c',
      33: '0x0bfA3B6b0E799F2eD34444582187B2cDf2fB11a7'      
    },
    account3: {
      default: 3,
      30: '0x81519F8C093959db4A79D8364addad12dD9E853A',
      31: '0x8B5Ea78bfa461b81DFFd032D1e5Ed38b9b62651b',
      33: '0x36d1d3c43422EF3B1d7d23F20a25977c29BC3f0e'
    },
    account4: {
      default: 4,
      30: '0xD8C94aDaa7FC0cF79D0C86f2b4102Ce48A68B130',
      31: '0xd97f0f2b7a96099dB0863B8313D83086d1E01292',
      33: '0x9063541acBD959baeB6Bf64158944b7e5844534a'
    },
    account5: {
      default: 5,
      30: '0x921b37BA0E0e23db6521c90f481aA38Fe6b7B4b1',
      31: '0x768C06E270491c03D86f5fC2B9E1ba9E837067eB',
      33: '0xd703eE823B2A2466F22147bfE74a0F605EbB20a4'
    }
  },
  paths: {
    deploy: 'deploy',
    deployments: 'deployments'
  }
}