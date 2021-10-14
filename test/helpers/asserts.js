const assertAval = (aval, avalExpected) => {
  assert.equal(aval.id, avalExpected.id);
  assert.equal(aval.infoCid, avalExpected.infoCid);
  assert.equal(aval.avaldao, avalExpected.avaldao);
  assert.equal(aval.solicitante, avalExpected.solicitante);
  assert.equal(aval.comerciante, avalExpected.comerciante);
  assert.equal(aval.avalado, avalExpected.avalado);
  assert.equal(aval.montoFiat, avalExpected.montoFiat);
  assert.equal(aval.status, avalExpected.status);
  // Comparación de cuotas
  assert.equal(aval.cuotasCantidad, avalExpected.cuotasCantidad);
  assert.equal(aval.cuotas.length, avalExpected.cuotas.length);
  for (let i = 0; i < aval.cuotas.length; i++) {
    const cuota = aval.cuotas[i];
    const cuotaExpected = avalExpected.cuotas[i];
    assert.equal(cuota.numero, cuotaExpected.numero);
    assert.equal(cuota.montoFiat, cuotaExpected.montoFiat);
    assert.equal(cuota.timestampVencimiento, cuotaExpected.timestampVencimiento);
    assert.equal(cuota.timestampDesbloqueo, cuotaExpected.timestampDesbloqueo);
    assert.equal(cuota.status, cuotaExpected.status);
  }
}

module.exports = {
  assertAval
}
