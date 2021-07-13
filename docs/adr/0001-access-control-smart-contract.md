# Control de acceso a Smart Contract

* Estado: Aceptado
* Decisores: Mauricio Coronel
* Fecha: 2020-06-19

## Contexto y problema

Los smarts contracts son accesibles desde cualquier cuenta.
Cómo especificar que una cuenta tiene permisos para usar la funcionalidad de un smart contract?

## Opciones consideradas

* [Aragon ACL](https://hack.aragon.org/docs/acl-intro.html): Aragon Access Control List. 
* [OpenZeppelin Access Control](https://docs.openzeppelin.com/contracts/3.x/access-control): OpenZeppelin Access Control

## Decisión

La opción elegida es [Aragon ACL](https://hack.aragon.org/docs/acl-intro.html) porque tiene integración directa con [Aragon DAO](https://aragon.org/dao).

Cuando se implemente la gobernanza de la organización a través de una DAO, el Smart Contract puede ser utilizado como una app de la DAO.

### Ventajas

* Integración con sistema de administración de permisos mediante una DAO y eventualmente votación sobre otorgamientos.
* El smart contract puede desarrollarse como una app de Aragon, formando parte de las apps de la DAO.

### Desventajas

* Los smarts contracts de [Aragon OS](https://github.com/aragon/aragonOS) están desarrollados con Solidity v0.4.24, lo cual impide desarrollar con versiones más nuevas de Solidity.
* El link de librerías de Solidity deben realizarse a partir del placeholder con el nombre de la misma, en lugar del hash. El hash es incluido en Solidity [v0.5.0](https://github.com/ethereum/solidity/blob/develop/Changelog.md#050-2018-11-13) (*Use hash of library name for link placeholder instead of name itself.*).