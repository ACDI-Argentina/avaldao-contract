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
        uint256 id; // Identificación
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
        /// @dev Almacena los ids de los avalaes para poder iterar
        /// en el iterable mapping de Avales
        uint256[] ids;
        /// @dev Iterable Mapping de Avales
        mapping(uint256 => Aval) avales;
    }

    string internal constant ERROR_AVAL_NOT_EXISTS = "AVALDAO_AVAL_NOT_EXIST";

    /**
     * @notice Inserta un nuevo Aval.
     */
    function insert(
        Data storage self,
        string _infoCid,
        address _avaldao,
        address _solicitante,
        address _comerciante,
        address _avalado
    ) public returns (uint256) {
        uint256 idIndex = self.ids.length;
        uint256 id = idIndex + 1; // Generación del Id
        self.ids.push(id);
        Aval memory aval;
        aval.id = id;
        aval.idIndex = idIndex;
        aval.infoCid = _infoCid;
        aval.avaldao = _avaldao;
        aval.solicitante = _solicitante;
        aval.comerciante = _comerciante;
        aval.avalado = _avalado;
        aval.status = Status.Completado;
        self.avales[id] = aval;
        return id;
    }

    /**
     * @notice actualiza una Aval.
     */
    function update(
        Data storage self,
        uint256 _id,
        string _infoCid,
        address _avaldao,
        address _solicitante,
        address _comerciante,
        address _avalado
    ) public returns (uint256) {
        Aval storage aval = getAval(self, _id);
        aval.infoCid = _infoCid;
        aval.avaldao = _avaldao;
        aval.solicitante = _solicitante;
        aval.comerciante = _comerciante;
        aval.avalado = _avalado;
        return _id;
    }

    function save(
        Data storage self,
        uint256 _id,
        string _infoCid,
        address _avaldao,
        address _solicitante,
        address _comerciante,
        address _avalado
    ) public returns (uint256) {
        if (_id == 0) {
            return
                insert(
                    self,
                    _infoCid,
                    _avaldao,
                    _solicitante,
                    _comerciante,
                    _avalado
                );
        } else {
            return
                update(
                    self,
                    _id,
                    _infoCid,
                    _avaldao,
                    _solicitante,
                    _comerciante,
                    _avalado
                );
        }
    }

    /**
     * @notice Obtiene el Aval a partir de su `_id`
     * @return Aval cuya identificación coincide con la especificada.
     */
    function getAval(Data storage self, uint256 _id)
        public
        view
        returns (Aval storage)
    {
        require(self.avales[_id].id != 0, ERROR_AVAL_NOT_EXISTS);
        return self.avales[_id];
    }
}
