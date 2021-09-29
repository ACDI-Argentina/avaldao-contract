const assertAval = (aval, avalExpected) => {
  assert.equal(aval.id, avalExpected.id);
  assert.equal(aval.infoCid, avalExpected.infoCid);
  assert.equal(aval.avaldao, avalExpected.avaldao);
  assert.equal(aval.solicitante, avalExpected.solicitante);
  assert.equal(aval.comerciante, avalExpected.comerciante);
  assert.equal(aval.avalado, avalExpected.avalado);
  assert.equal(aval.montoFiat, avalExpected.montoFiat);
  assert.equal(aval.cuotasCantidad, avalExpected.cuotasCantidad);
  assert.equal(aval.status, avalExpected.status);
}

module.exports = {
  assertAval
}
