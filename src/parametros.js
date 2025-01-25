const path = require("path")
/*CONSTANTES ASSEMBLY*/
const BITS = 16
const BITS_MAX = 2**(BITS) - 1 //Representacion maxima 
const BITS_DIR = 12
const BITS_MAX_DIR = 2**(BITS_DIR) - 1
const LIMITE_CICLOS = 1000
const REGEX_DIR_CODIGO = /^(\w+)\s*:$/
const REGEX_NUMEROS = /^([01]{1,16}b|[0-9A-F]{1,4}h|\d{1,5}d?)$/
const REGEX_DIR_B = /^\(\s*(\w+)\s*\)$/ //Valida cualquier palabra o numero entre parentesis
const REGEX_B = /^\(\s*(B)\s*\)$/ //Valida (B)
const REGEX_DIR = /^\(\s*(\d+)\s*\)$/ // Valida solo direcciones numericas lo cual es ideal usar despues de traducir el valor
const LISTA_SALTOS = ["JMP", "JEQ", "JNE", "JGT", "JGE", "JLT", "JLE", "JCR", "CALL", "RET"] 


/*CONSTANTES SERVIDOR*/
const PORT = process.env.port ?? 3000
const APP_NAME = "Assembly 16-bits"
const PUBLIC_RUTA = path.join(__dirname, "..", "public")

module.exports = {
    BITS,
    BITS_MAX,
    BITS_DIR,
    BITS_MAX_DIR,
    LIMITE_CICLOS,
    REGEX_DIR_CODIGO,
    REGEX_NUMEROS,
    REGEX_DIR_B,
    REGEX_B,
    REGEX_DIR,
    LISTA_SALTOS,
    PORT,
    APP_NAME,
    PUBLIC_RUTA,
    URL_API
  };
