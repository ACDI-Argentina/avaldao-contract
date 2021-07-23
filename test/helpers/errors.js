const { makeErrorMappingProxy } = require('@aragon/test-helpers/utils')

const errors = makeErrorMappingProxy({
  // aragonOS errors
  APP_AUTH_FAILED: 'APP_AUTH_FAILED',
  INIT_ALREADY_INITIALIZED: 'INIT_ALREADY_INITIALIZED',

  // Avaldo errors
  AVALDAO_AVAL_NOT_EXIST: 'AVALDAO_AVAL_NOT_EXIST'
})

module.exports = {
  errors
}
