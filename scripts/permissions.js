const ANY_ADDRESS = '0xffffffffffffffffffffffffffffffffffffffff'

const setOpenPermission = async (acl, appAddress, role, rootAddress) => {

  // Note: Setting a permission to 0xffffffffffffffffffffffffffffffffffffffff
  // is interpreted by aragonOS as allowing the role for any address.
  await createPermission(acl, ANY_ADDRESS, appAddress, role, rootAddress)
}

const createPermission = async (acl, entity, app, role, manager) => {
  await acl.createPermission(
    entity, // entity (who?) - The entity or address that will have the permission.
    app, // app (where?) - The app that holds the role involved in this permission.
    role, // role (what?) - The particular role that the entity is being assigned to in this permission.
    manager, // manager - Can grant/revoke further permissions for this role.
    { from: manager }
  )
}


const grantPermission = async (acl, entity, app, role, manager) => {
  await acl.grantPermission(
    entity, // entity (who?) - The entity or address that will have the permission.
    app, // app (where?) - The app that holds the role involved in this permission.
    role, // role (what?) - The particular role that the entity is being assigned to in this permission.
    { from: manager }
  )
}

module.exports = {
  setOpenPermission,
  createPermission,
  grantPermission
}
