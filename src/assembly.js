const {BITS, BITS_MAX, LIMITE_CICLOS, REGEX_DIR_CODIGO, REGEX_NUMEROS, REGEX_DIR_B, REGEX_B, REGEX_DIR, LISTA_SALTOS} = require('./parametros');

class Assembly {
    constructor() {
        this.registros = {
            A: 0,
            B: 0,
            PC: 0,
            SP: BITS_MAX
        }
        this.memoria = {}
        this.direcciones_memoria = {}
        this.direcciones_codigo = {}
        this.instrucciones = []
        this.flags = {
            Z: 0,
            N: 0,
            C: 0
        }
        this.operaciones = {
            MOV: this.mov.bind(this),
            ADD: this.add.bind(this),
            SUB: this.sub.bind(this),
            AND: this.and.bind(this),
            OR: this.or.bind(this),
            XOR: this.xor.bind(this),
            NOT: this.not.bind(this),
            SHL: this.shl.bind(this),
            SHR: this.shr.bind(this),
            INC: this.inc.bind(this),
            DEC: this.dec.bind(this),
            CMP: this.cmp.bind(this),
            JMP: this.jmp.bind(this),
            JEQ: this.jeq.bind(this),
            JNE: this.jne.bind(this),
            JGT: this.jgt.bind(this),
            JGE: this.jge.bind(this),
            JLT: this.jlt.bind(this),
            JLE: this.jle.bind(this),
            JCR: this.jcr.bind(this),
            PUSH: this.push.bind(this),
            POP: this.pop.bind(this),
            CALL: this.call.bind(this),
            RET: this.ret.bind(this),
            NOP: this.nop.bind(this)
        }
    }
    cargar_datos_y_direcciones(codigo) {
        let lista_codigo = codigo
            .split(/\n+/)
            .map(this.quitar_comentario) //Limpia los comentarios
            .filter(linea => linea.trim() !== "") //Si es una linea vacia la elimina
        console.log(lista_codigo)

        let code_check = false
        let data_check = false
        let mp = 0 //Memory Pointer
        let i_code = 0 //Indice de CODE para saltos
        
        for (let i_linea = 0 ; i_linea < lista_codigo.length ; i_linea++) {
            let linea = lista_codigo[i_linea]
            if (linea == "DATA:" ) {
                data_check = true
            } else if (data_check && linea != "CODE:") {
                let indice = 0
                linea = linea.split(/ +/)

                if (linea.length > 2) { //ERROR mas de 2 valores en al declarar una variable
                    throw new Error("DATA: Mas de un valor para una variable")

                } else if (linea.length === 2){  //Caso general
                    let variable = linea[indice]
                    this.direcciones_memoria[variable] = mp
                    indice ++
                }

                //Caso array donde no hay nombre para la variable 
                let valor = this.transformar_a_decimal(linea[indice])
                
                if (isNaN(valor)) { 
                    throw new Error("DATA: Valor de variable invalida")
                }
                
                //Regula el valor a un no negativo y al limitado por los BITS
                valor = this.comprobar_flag_c("NOP", valor)
                this.memoria[mp] = valor
                
                mp++
            
            } else if (linea == "CODE:") {
                code_check = true
                data_check = false
            } else if (code_check){
                linea = lista_codigo[i_linea].match(REGEX_DIR_CODIGO)
                if (linea != null) {
                    this.direcciones_codigo[linea[1]] = i_code
                } else {
                    this.instrucciones.push(lista_codigo[i_linea])
                    i_code++
                }
            }
        }
    }
    ejecutar() {
        let ciclos = 0
        while ((this.registros["PC"] < this.instrucciones.length) & (ciclos < LIMITE_CICLOS)) {
            let text_linea = this.quitar_comentario(this.instrucciones[this.registros["PC"]])
            
            //Separo por palabra el string
            text_linea = text_linea.match(/(\w+|\(\s*\w+\s*\))/g)
            
            let operacion = text_linea[0]
            if (text_linea.length === 3) { 
                let valor_1 = this.traducir_valor(text_linea[1])
                let valor_2 = this.traducir_valor(text_linea[2])
                if (operacion in this.operaciones) {
                    this.operaciones[operacion](valor_1, valor_2)
                } else {
                    throw new Error("Operacion Invalida")
                }
            
            } else if (text_linea.length === 2) {
                let operacion = text_linea[0]
                let valor_1 = 0
                if (!LISTA_SALTOS.includes(operacion)) {
                    valor_1 = this.traducir_valor(text_linea[1])
                } else {
                    valor_1 = this.traducir_direccion(text_linea[1])
                }
                if (operacion in this.operaciones) {
                    this.operaciones[operacion](valor_1)
                } else {
                    throw new Error("CODE: Operacion Invalida en instruccion " + this.registros["PC"])
                }
            } else if (["RET", "NOP"].includes(operacion)) {
                this.operaciones[operacion]()
            } else {
                throw new Error("CODE: Error en instruccion " + this.registros["PC"])
            }
            this.registros["PC"] ++
            ciclos ++
        }
    }

    //Operaciones ------------------------------------------------------
    mov(destino, valor) {
        this.restaurar_flags()
        if (["A", "B"].includes(destino) && ["A", "B"].includes(valor)) { //A, B 
            this.registros[destino] = this.registros[valor]
        } else if (["A", "B", "(B)"].includes(destino) && typeof(valor) === "number") { //A, Lit | (B), Lit
            if (destino == "(B)") {
                this.memoria[this.registros["B"]] = valor
            } else {
                this.registros[destino] = valor 
            }
        } else if (["A", "B"].includes(destino) && REGEX_DIR_B.test(valor)) { //A, (dir) | A, (B)
            let direccion = this.quitar_parentesis(valor)
            
            if (direccion == "B") {
                if (this.registros["B"] in this.memoria) {
                    this.registros[destino] = this.memoria[this.registros["B"]]
                } else {
                    this.registros[destino] = 0
                }
            } else {
                let direccion_decimal = this.transformar_a_decimal(direccion)
                if (direccion in this.memoria) {
                    this.registros[destino] =  this.memoria[direccion_decimal]
                } else {
                    this.registros[destino] =  0
                }
            }
        } else if (REGEX_DIR_B.test(destino) && ["A", "B"].includes(valor)) { //(dir), A | (B), A
            let direccion = this.quitar_parentesis(destino)
            if (direccion == "B" && valor == "A") {
                this.memoria[this.registros["B"]] = this.registros[valor]
            } else {
                let destino_decimal = this.transformar_a_decimal(direccion)
                this.memoria[destino_decimal] = this.registros[valor]
            }
        } else {
            throw new Error("Operacion con argumentos invalidos")
        }
    }
    add(destino, valor = null) {
        this.restaurar_flags()
        if (valor !== null) {
            let valor_literal = this.forzar_literal(valor)
            if (["A", "B"].includes(destino)) { // A, B
                //flags
                let resultado = this.comprobar_flag_c("ADD", this.registros["A"] + valor_literal)
                this.comprobar_flag_z(resultado)
                //asignacion
                this.registros[destino] = resultado
            } else {
                throw new Error("Operacion con argumentos invalidos")
            }
        } else {
            if (REGEX_DIR.test(destino) ) { // (dir)
                let direccion = this.quitar_parentesis(destino)
                let direccion_decimal = this.transformar_a_decimal(direccion)
                //flags
                let resultado = this.comprobar_flag_c("ADD", this.registros["A"] + this.registros["B"])
                this.comprobar_flag_z(resultado)
                //asignacion
                this.memoria[direccion_decimal] = resultado
            } else {
                throw new Error("Operacion con argumentos invalidos")
            }
        }
        
    }
    sub(destino, valor = null) {
        this.restaurar_flags()
        if (valor !== null) {
            let valor_literal = this.forzar_literal(valor)
            if (["A", "B"].includes(destino)) { // A, B
                //flags
                this.comprobar_flag_c("SUB", this.registros["A"], valor_literal)
                let resultado = this.comprobar_flag_n(this.registros["A"] - valor_literal)
                this.comprobar_flag_z(resultado)
                //asignacion
                this.registros[destino] = resultado
            } else {
                throw new Error("Operacion con argumentos invalidos")
            }
        } else {
            if (REGEX_DIR.test(destino)) { // (dir)
                let direccion = this.quitar_parentesis(destino)
                let direccion_decimal = this.transformar_a_decimal(direccion)
                //flags
                this.comprobar_flag_c("SUB", this.registros["A"], this.registros["B"])
                let resultado = this.comprobar_flag_n(this.registros["A"] - this.registros["B"])
                this.comprobar_flag_z(resultado)
                //asignacion
                this.memoria[direccion_decimal] = this.registros["A"] - this.registros["B"]
            } else {
                throw new Error("Operacion con argumentos invalidos")
            }
        }
    }
    and(destino, valor = null) {
        this.restaurar_flags()
        if (valor !== null) {
            let valor_literal = this.forzar_literal(valor)
            if (["A", "B"].includes(destino)) { // A, B
                //flags
                this.comprobar_flag_z(this.registros["A"] & valor_literal)
                //Asignacion
                this.registros[destino] = this.registros["A"] & valor_literal
            } else {
                throw new Error("Operacion con argumentos invalidos")
            }
        } else {
            if (REGEX_DIR.test(destino)) { // (dir)
                let direccion = this.quitar_parentesis(destino)
                let direccion_decimal = this.transformar_a_decimal(direccion)
                //flags
                this.comprobar_flag_z(this.registros["A"] & this.registros["B"])
                //Asignacion
                this.memoria[direccion_decimal] = this.registros["A"] & this.registros["B"]
            } else {
                throw new Error("Operacion con argumentos invalidos")
            }
        }
    }
    or(destino, valor = null) {
        this.restaurar_flags()
        if (valor !== null) {
            let valor_literal = this.forzar_literal(valor)
            if (["A", "B"].includes(destino)) { // A, B
                //flags
                this.comprobar_flag_z(this.registros["A"] | valor_literal)
                //Asignacion
                this.registros[destino] = this.registros["A"] | valor_literal
            } else {
                throw new Error("Operacion con argumentos invalidos")
            }
        } else {
            if (REGEX_DIR.test(destino)) { // (dir)
                let direccion = this.quitar_parentesis(destino)
                let direccion_decimal = this.transformar_a_decimal(direccion)
                //flags
                this.comprobar_flag_z(this.registros["A"] | this.registros["B"])
                //Asignacion
                this.memoria[direccion_decimal] = this.registros["A"] | this.registros["B"]
            } else {
                throw new Error("Operacion con argumentos invalidos")
            }
        }
    }
    xor(destino, valor = null) {
        this.restaurar_flags()
        if (valor !== null) {
            let valor_literal = this.forzar_literal(valor)
            if (["A", "B"].includes(destino)) { // A, B
                //flags
                this.comprobar_flag_z(this.registros["A"] ^ valor_literal)
                //Asignacion
                this.registros[destino] = this.registros["A"] ^ valor_literal
            } else {
                throw new Error("Operacion con argumentos invalidos")
            }
        } else {
            if (REGEX_DIR.test(destino)) { // (dir)
                let direccion = this.quitar_parentesis(destino)
                let direccion_decimal = this.transformar_a_decimal(direccion)
                //flags
                this.comprobar_flag_z(this.registros["A"] ^ this.registros["B"])
                //Asignacion
                this.memoria[direccion_decimal] = this.registros["A"] ^ this.registros["B"]
            } else {
                throw new Error("Operacion con argumentos invalidos")
            }
        }
    }
    not(destino, valor = null) {
        this.restaurar_flags()
        let resultado = ~ this.registros["A"] & BITS_MAX //Limita que sea una representacion en 16
        this.comprobar_flag_z(resultado)
        if (destino == "A" && arguments.length == 1) {
            this.registros["A"] = resultado
        } else if (valor == "A") {
            if (destino == "B") {
                this.registros["B"] = resultado
            } else if (REGEX_DIR_B.test(destino)) {
                let direccion = this.quitar_parentesis(destino)
                if (direccion == "B") {
                    this.memoria[this.registros["B"]] = resultado
                } else {
                    this.memoria[direccion] = resultado
                }
            }
        } else {
            throw new Error("Operacion con argumentos invalidos")
        }
    }
    shr(destino, valor = null) {
        this.restaurar_flags()
        this.comprobar_flag_c("SHR", this.registros["A"])
        let resultado = (this.registros["A"] >>> 1) & BITS_MAX //Limita que sea una representacion en 16
        this.comprobar_flag_z(resultado)
        if (destino == "A" && arguments.length == 1) {
            this.registros["A"] = resultado
        } else if (valor == "A") {
            if (destino == "B") {
                this.registros["B"] = resultado
            } else if (REGEX_DIR_B.test(destino)) {
                let direccion = this.quitar_parentesis(destino)
                if (direccion == "B") {
                    this.memoria[this.registros["B"]] = resultado
                } else {
                    this.memoria[direccion] = resultado
                }
            }
        } else {
            throw new Error("Operacion con argumentos invalidos")
        } 
    }
    shl(destino, valor = null) {
        this.restaurar_flags()
        this.comprobar_flag_c("SHL", this.registros["A"])
        let resultado = (this.registros["A"] << 1) & BITS_MAX //Limita que sea una representacion en 16
        this.comprobar_flag_z(resultado)
        if (destino == "A" && arguments.length == 1) {
            this.registros["A"] = resultado
        } else if (valor == "A") {
            if (destino == "B") {
                this.registros["B"] = resultado
            } else if (REGEX_DIR_B.test(destino)) {
                let direccion = this.quitar_parentesis(destino)
                if (direccion == "B") {
                    this.memoria[this.registros["B"]] = resultado
                } else {
                    this.memoria[direccion] = resultado
                }
            }
        } else {
            throw new Error("Operacion con argumentos invalidos")
        }    
    }
    inc(valor) {
        this.restaurar_flags()
        if (arguments.length > 1) {
            throw new Error("Operacion con argumentos invalidos")
        }
        if (["A", "B"].includes(valor)) { //A | B
            //flag
            let resultado = this.comprobar_flag_c("ADD", this.registros[valor] + 1)
            //asignacion
            this.registros[valor] = resultado
        } else if (REGEX_DIR_B.test(valor)) {  //(dir) | (B)
            let direccion = this.quitar_parentesis(valor)
            if (direccion === "B") {
                if (this.registros["B"] in this.memoria) {
                    //flag
                    let resultado = this.comprobar_flag_c("ADD", this.memoria[this.registros["B"]] + 1)
                    //asignacion
                    this.memoria[this.registros["B"]] = resultado
                } else {
                    this.memoria[this.registros["B"]] = 1
                }  
            } else {
                let direccion_decimal = this.transformar_a_decimal(direccion)
                if (direccion_decimal in this.memoria) {
                    //flag
                    let resultado = this.comprobar_flag_c("ADD", this.memoria[direccion_decimal] + 1)
                    //asignacion
                    this.memoria[direccion_decimal] = resultado
                } else {
                    this.memoria[direccion_decimal] = 1
                }  
            } 
        } else {
            throw new Error("Operacion con argumentos invalidos")
        }
    }
    dec(valor) {
        this.restaurar_flags()
        if (arguments.length > 1) {
            throw new Error("Operacion con argumentos invalidos")
        }
        if ((valor == "A")) {
            //flag
            this.comprobar_flag_c("SUB", this.registros["A"], 1)
            let resultado = this.comprobar_flag_n(this.registros["A"] - 1)
            this.registros["A"] = resultado
        } else {
            throw new Error("Operacion con argumentos invalidos")
        }
    }
    cmp(valor_1, valor_2) {
        this.restaurar_flags()
        if (valor_1 == "A") {
            let literal = this.forzar_literal(valor_2)
            let resultado = this.registros["A"] - literal
            this.comprobar_flag_c("SUB", this.registros["A"], literal)
            this.comprobar_flag_n(resultado)
            this.comprobar_flag_z(resultado)
        } else {
            throw new Error("Operacion con argumentos invalidos")
        }
    }
    jmp(direccion) {
        if (arguments.length != 1) {
            throw new Error("Operacion con argumentos invalidos")
        }
        this.registros["PC"] = direccion
        this.restaurar_flags()
    }
    jeq(direccion) {
        if (arguments.length != 1) {
            throw new Error("Operacion con argumentos invalidos")
        }
        if (this.flags["Z"] == 1) {
            this.registros["PC"] = direccion
        }
        this.restaurar_flags()
    }
    jne(direccion) {
        if (arguments.length != 1) {
            throw new Error("Operacion con argumentos invalidos")
        }
        if (this.flags["Z"] == 0) {
            this.registros["PC"] = direccion
        }
        this.restaurar_flags()
    }
    jgt(direccion) {
        if (arguments.length != 1) {
            throw new Error("Operacion con argumentos invalidos")
        }
        if (this.flags["N"] == 0 && this.flags["Z"] == 0) {
            this.registros["PC"] = direccion
        }
        this.restaurar_flags()
    }
    jge(direccion) {
        if (arguments.length != 1) {
            throw new Error("Operacion con argumentos invalidos")
        }
        if (this.flags["N"] == 0) {
            this.registros["PC"] = direccion
        }
        this.restaurar_flags()
    }
    jlt(direccion) {
        if (arguments.length != 1) {
            throw new Error("Operacion con argumentos invalidos")
        }
        if (this.flags["N"] == 1) {
            this.registros["PC"] = direccion
        }
        this.restaurar_flags()
    }
    jle(direccion) {
        if (arguments.length != 1) {
            throw new Error("Operacion con argumentos invalidos")
        }
        if (this.flags["N"] == 1 || this.flags["Z"] == 1) {
            this.registros["PC"] = direccion
        }
        this.restaurar_flags()
    }
    jcr(direccion) {
        if (arguments.length != 1) {
            throw new Error("Operacion con argumentos invalidos")
        }
        if (this.flags["C"] == 1) {
            this.registros["PC"] = direccion
        }
        this.restaurar_flags()
    }
    push(valor) {
        this.restaurar_flags()
        if (arguments.length != 1 || !(["A", "B"].includes(valor))) {
            throw new Error("Operacion con argumentos invalidos")
        }
        this.memoria[this.registros["SP"]] = this.registros[valor]
        this.registros["SP"] --
    }
    pop(destino) {
        this.restaurar_flags()
        if (arguments.length != 1 || !(["A", "B"].includes(destino))) {
            throw new Error("Operacion con argumentos invalidos")
        }
        this.registros["SP"] = this.comprobar_flag_c("NOP", this.registros["SP"] + 1)
        this.registros[destino] = this.memoria[this.registros["SP"]] 
    }
    call(direccion) {
        this.restaurar_flags()
        if (arguments.length != 1) {
            throw new Error("Operacion con argumentos invalidos")
        }
        this.memoria[this.registros["SP"]] = this.registros["PC"] + 1
        this.registros["PC"] = direccion
        this.registros["SP"] --
    }
    ret() {
        this.restaurar_flags()
        this.registros["SP"] = this.comprobar_flag_c("NOP", this.registros["SP"] + 1)
        this.registros["PC"] = this.memoria[this.registros["SP"]] - 1
    }
    nop() {}

    //Funciones utiles -------------------------------------------
    transformar_a_decimal (numero) {
        /*
        Funcion para transformar un numero de base binaria o hexadecimal a decimal.
        El regex verifica si es un numero valido dentro y el largo del numero
        */
        if (REGEX_NUMEROS.test(numero)){
            let numero_decimal = 0
            if (numero.slice(-1) == "h") {
                numero_decimal = parseInt(numero.slice(0, -1), 16)
            } else if (numero.slice(-1) == "b") {
                numero_decimal = parseInt(numero.slice(0, -1), 2)
            } else {
                if (numero.slice(-1) == "d") {
                    numero = numero.slice(0, -1)
                }
                numero_decimal = parseInt(numero)
            }
            return this.comprobar_flag_c("NOP", numero_decimal)
        }
    }
    traducir_valor(valor) {
        /* Ayuda a traducir los valores de argumentos en casos de:
            -Ser un elemento en DATA
            -Dar un literal o direccion en otra base
        */
        if (["A", "B"].includes(valor) ) { //Casos comunes
            return valor
        } else if (REGEX_B.test(valor)) {
            return "(B)" 
        } else if (REGEX_DIR_B.test(valor)) {
            let direccion = this.quitar_parentesis(valor)
            if (direccion in this.direcciones_memoria) { //Valor de un elemento en DATA
                return `(${this.direcciones_memoria[direccion]})`
            } else { //Ser una direccion literal
                let direccion_decimal = this.transformar_a_decimal(direccion)
                
                //En caso de no retonar NaN arroja un error
                if (isNaN(direccion_decimal)){ 
                    throw new Error("Direccion de memoria invalida")
                
                } else { 
                    return `(${direccion_decimal})`
                }
            }
        //Direccion de un elemento en data
        } else if (valor in this.direcciones_memoria) {
            return this.direcciones_memoria[valor]
        //Direccion de una seccion en codifo
        } else if (valor in this.direcciones_codigo) {
            return this.direcciones_codigo[valor]
        //Un literal
        } else {
            let valor_decimal = this.transformar_a_decimal(valor)
            if (isNaN(valor_decimal)){ 
                throw new Error("Literal invalido, al traducir valor")
            } else { 
                return valor_decimal
            }
        }
    }
    forzar_literal(valor_traducido) {
        /* 
        Si bien recibe valores traducidos el forzar a que sean un literal ayuda
        a reducir los if's en las operaciones
        */
        if (["A", "B"].includes(valor_traducido)) { //Registros
            return this.registros["B"] //Hace sentido ya que siempre se opera con A
        } else if (REGEX_DIR_B.test(valor_traducido)) { //Memoria
            let direccion = this.quitar_parentesis(valor_traducido)
            if (direccion == "B") {
                direccion = this.registros["B"]
            }
            if (direccion in this.memoria) {
                return this.memoria[direccion]
            } else {
                return 0
            }
        } else { //Literales 
            return valor_traducido
        }
    }
    traducir_direccion(direccion) {
        if (direccion in this.direcciones_codigo) {
            return this.direcciones_codigo[direccion] - 1
        } 
        let direccion_decimal = this.transformar_a_decimal(direccion)
        if (isNaN(direccion_decimal)){ 
            throw new Error("Direccion de codigo invalida")
        } else { 
            return direccion_decimal - 1
        }
    }
    comprobar_flag_c(operacion, dato_1, dato_2){
        if (operacion == "NOP") {
            if (dato_1 > BITS_MAX) {
                dato_1 = dato_1 % BITS_MAX - 1
            }
        // Caso | result < a + b
        } else if (operacion == "ADD") {
            if (dato_1 > BITS_MAX) {
                dato_1 = dato_1 % BITS_MAX - 1
                this.flags["C"] = 1
            }else {
                this.flags["C"] = 0
            }
        // Caso | a >= b
        } else if (operacion == "SUB") {
            if (dato_1 >= dato_2) { 
                this.flags["C"] = 1
            }else {
                this.flags["C"] = 0
            }
        // Caso | a(0)
        } else if (operacion == "SHR") {
            let binario = "0".repeat(BITS) + dato_1.toString(2) //Le extiendo bits por si la representacion es menor a 16 bits
            this.flags["C"] = parseInt(binario[binario.length - 1])
        // Caso | a(7)
        } else if (operacion == "SHL") {
            let binario = "0".repeat(BITS) + dato_1.toString(2) //Le extiendo bits por si la representacion es menor a 16 bits
            this.flags["C"] = parseInt(binario[binario.length - BITS])
        }
        return(dato_1)
    }
    comprobar_flag_n(resultado) {
        // Sin soporte de negativos 
        if (resultado < 0) {
            while (resultado < 0) {
              resultado += BITS_MAX;
            }
            resultado += 1
            this.flags['N'] = 1;
          } else {
            this.flags['N'] = 0;
          }
        return resultado
    }
    comprobar_flag_z(resultado) {
        if (resultado == 0) {
            this.flags["Z"] = 1
        } else {
            this.flags["Z"] = 0
        }
    }
    restaurar_flags() {
        this.flags ["Z"] = 0
        this.flags ["N"] = 0
        this.flags ["C"] = 0
    }
    quitar_parentesis(direccion) {
        return direccion.replace("(", "").replace(")", "").trim()
    }
    quitar_comentario(linea_de_codigo) {
        return linea_de_codigo.split("//")[0].trim()
    }

    toJSON() {
        return {
          registros: this.registros,
          memoria: this.memoria,
          flags: this.flags
        }
    }
}

if (require.main === module) {
    if (process.argv.length == 3) {
        const inicio = performance.now()

        const fs = require('fs')
        const path = require("path")
        let dir_archivo = path.join(__dirname, "test_assembly", process.argv[2])
        if (fs.existsSync(dir_archivo)) {
            let a = new Assembly
        
            let archivo = fs.readFileSync(dir_archivo, 'utf8')
            
            try {
                a.cargar_datos_y_direcciones(archivo)
                a.ejecutar()

                //console.log(a)
                console.log("Registros", a.registros)
                console.log("Memoria:", a.memoria)
                console.log("Flags:",  a.flags)
            } catch (error) {
                console.log(error)
            }            
        } else {
            console.log("El nombre del archivo no existe")
        }
        const fin = performance.now()
        console.log(`Tiempo de ejecución: ${((fin - inicio)/1000).toFixed(3)} segundos`)
    } else {
        console.log("Argumento en consola faltante")
    }
}
module.exports = Assembly;