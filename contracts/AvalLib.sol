pragma solidity ^0.4.24;

/**
 * @title Librería de Avales.
 * @author ACDI
 * @notice Librería encargada del tratamiento de Avales.
 */
library AvalLib {
    enum Status {
        Solicitado,
        Rechazado,
        Aceptado,
        Completado,
        Vigente,
        Finalizado
    }

    /// @dev Estructura que define los datos de un Aval.
    struct Aval {
        string id; // Identificación
        uint256 idIndex; // Índice del Id en avalIds
        string infoCid; // IPFS Content ID de las información (JSON) del Aval.
        address avaldao;
        address solicitante;
        address comerciante;
        address avalado;
        uint256[] cuotaIds; // Ids de las cuotas relacionadas.
        uint256[] reclamoIds; // Ids de los reclamos relacionados.
        Status status;
    }

    struct Data {
        /// @dev Almacena los ids de los avales para poder iterar
        /// en el iterable mapping de Avales
        string[] ids;
        /// @dev Iterable Mapping de Avales
        mapping(string => Aval) avales;
    }

    string internal constant ERROR_AVAL_NOT_EXISTS = "AVALDAO_AVAL_NOT_EXIST";

    function save(
        Data storage self,
        string _id,
        string _infoCid,
        address _avaldao,
        address _solicitante,
        address _comerciante,
        address _avalado
    ) public {
        Aval storage aval = self.avales[_id];
        if (
            keccak256(abi.encodePacked(aval.id)) !=
            keccak256(abi.encodePacked(_id))
        ) {
            // El aval no existe, por lo que es creado.
            uint256 idIndex = self.ids.length;
            self.ids.push(_id);
            Aval memory newAval;
            newAval.id = _id;
            newAval.idIndex = idIndex;
            newAval.infoCid = _infoCid;
            newAval.avaldao = _avaldao;
            newAval.solicitante = _solicitante;
            newAval.comerciante = _comerciante;
            newAval.avalado = _avalado;
            newAval.status = Status.Completado;
            self.avales[_id] = newAval;
        } else {
            // El aval existe, por lo que es actualizado.
            aval.infoCid = _infoCid;
            aval.avaldao = _avaldao;
            aval.solicitante = _solicitante;
            aval.comerciante = _comerciante;
            aval.avalado = _avalado;
        }
    }

    /**
     * @notice Obtiene el Aval a partir de su `_id`
     * @return Aval cuya identificación coincide con la especificada.
     */
    function getAval(Data storage self, string _id)
        public
        view
        returns (Aval storage)
    {
        require(
            keccak256(abi.encodePacked(self.avales[_id].id)) ==
                keccak256(abi.encodePacked(_id)),
            ERROR_AVAL_NOT_EXISTS
        );
        return self.avales[_id];
    }
}
