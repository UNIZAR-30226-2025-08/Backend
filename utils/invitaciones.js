const crypto = require("crypto");

// Genera un código de invitación aleatorio de 6 caracteres
const generarCodigoInvitacion = () => {
  return crypto.randomBytes(3).toString("hex").toUpperCase(); // Genera un código alfanumérico
};

// Valida si el código de invitación proporcionado coincide con el de la sala
const validarCodigoInvitacion = (sala, codigo) => {
  return sala.codigoInvitacion && sala.codigoInvitacion === codigo;
};

module.exports = { generarCodigoInvitacion, validarCodigoInvitacion };
