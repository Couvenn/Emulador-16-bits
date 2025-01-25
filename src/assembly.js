const {BITS, BITS_MAX, BITS_MAX_DIR, LIMITE_CICLOS, REGEX_DIR_CODIGO, REGEX_NUMEROS, REGEX_DIR_B, REGEX_B, REGEX_DIR, LISTA_SALTOS} = require('./parametros');

class Registro {
    constructor(bits_max, valor_inicial=0) {
        this._valor = valor_inicial
        this._valor_maximo = bits_max
    }
    get valor () {
        return this._valor
    }
    set valor (valor) {
        if (valor > this._valor_maximo) {
            valor = valor % this._valor_maximo - 1
        } else if (valor < 0) {
            while (valor < 0) {
                valor += this._valor_maximo;
            }
            valor ++
        }
        this._valor = valor
    }
    toJSON() {
        return this.valor
    }
}

class Assembly {
    constructor() {
        this.registros = {
            A: new Registro(BITS_MAX),
            B: new Registro(BITS_MAX),
            PC: new Registro(BITS_MAX_DIR),
            SP: new Registro(BITS_MAX_DIR, BITS_MAX_DIR),
            AUX: new Registro(BITS_MAX)
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

                //Recorta el mp a los bits de direccion
                mp &= BITS_MAX_DIR

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
                
                
                //Regula el valor a los bits generales
                this.registros["AUX"].valor = valor
                this.memoria[mp] = this.registros["AUX"].valor
                
                mp++
            
            } else if (linea == "CODE:") {
                code_check = true
                data_check = false
            } else if (code_check){
                linea = lista_codigo[i_linea].match(REGEX_DIR_CODIGO)
                if (linea != null) {
                    i_code &= BITS_MAX_DIR
                    this.direcciones_codigo[linea[1]] = i_code
                } else {
                    this.instrucciones.push(lista_codigo[i_linea])
                    i_code++
                }
            }
        }
    }
    ejecutar(ciclo_exigido) {
        let ciclos = 0

        while ((this.registros["PC"].valor < this.instrucciones.length) && (ciclos < LIMITE_CICLOS) && (ciclos < ciclo_exigido || ciclo_exigido == undefined)) {
            let text_linea = this.instrucciones[this.registros["PC"].valor]
            
            //Separo por palabra dentro de la linea de texto
            text_linea = text_linea.match(/(\w+|\(\s*\w+\s*\))/g)
            
            let operacion = text_linea[0]
            
            console.log(text_linea) 
            if (text_linea.length === 3) { 
                let valor_1 = this.traducir_valor(text_linea[1])
                let valor_2 = this.traducir_valor(text_linea[2])
                if (operacion in this.operaciones) {
                    this.operaciones[operacion](valor_1, valor_2)
                } else {
                    throw new Error("CODE: Operacion Invalida en instruccion " + this.registros["PC"].valor)
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
                    throw new Error("CODE: Operacion Invalida en instruccion " + this.registros["PC"].valor)
                }
            } else if (["RET", "NOP"].includes(operacion)) {
                this.operaciones[operacion]()
            } else {
                throw new Error("CODE: Error en instruccion " + this.registros["PC"].valor)
            }
            //En caso de ser un salto el salto se encarca de aumentar el PC si es qeu salta o no
            if (!LISTA_SALTOS.includes(operacion)) {
                this.registros["PC"].valor ++
            }
            ciclos ++
        }
    }

    //Operaciones ------------------------------------------------------
    mov(destino, dato) {
        this.restaurar_flags()
        if (["A", "B"].includes(destino) && ["A", "B"].includes(dato)) { //A, B 
            this.registros[destino].valor = this.registros[dato].valor
        } else if (["A", "B", "(B)"].includes(destino) && typeof(dato) === "number") { //A, Lit | (B), Lit
            if (destino == "(B)") {
                //Ya que es una direccion nos aseguramos que este en 12 bits
                this.registros["AUX"].valor = this.registros["B"].valor & BITS_MAX_DIR

                this.memoria[this.registros["AUX"].valor] = dato
            } else {
                this.registros[destino].valor = dato 
            }
        } else if (["A", "B"].includes(destino) && REGEX_DIR_B.test(dato)) { //A, (dir) | A, (B)
            let direccion = this.quitar_parentesis(dato)
            
            //Ya que es una direccion nos aseguramos que este en 12 bits
            if (direccion == "B") {
                direccion = this.registros["B"].valor & BITS_MAX_DIR
                this.registros[destino].valor = this.memoria[direccion] ?? 0
            
            } else {
                this.registros["AUX"].valor = this.transformar_a_decimal(direccion)
                direccion = this.registros["AUX"].valor & BITS_MAX_DIR
                this.registros[destino].valor =  this.memoria[direccion] ?? 0
            }
        } else if (REGEX_DIR_B.test(destino) && ["A", "B"].includes(dato)) { //(dir), A | (B), A
            let direccion = this.quitar_parentesis(destino)
            
            if (direccion == "B" && dato == "A") {
                direccion = this.registros["B"].valor & BITS_MAX_DIR
                this.memoria[direccion] = this.registros[dato].valor
            } else {
                this.registros["AUX"].valor = this.transformar_a_decimal(direccion)
                direccion = this.registros["AUX"].valor & BITS_MAX_DIR
                this.memoria[direccion] = this.registros[dato].valor
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
                //Asignar valor
                let resultado = this.registros["A"].valor + valor_literal
                this.registros[destino].valor = resultado

                //flags
                this.comprobar_flag_c("ADD", this.registros[destino].valor, resultado)
                this.comprobar_flag_z(resultado)
            } else {
                throw new Error("Operacion con argumentos invalidos")
            }
        } else {
            if (REGEX_DIR.test(destino) ) { // (dir)
                let direccion = this.quitar_parentesis(destino)

                //Recortamos al ser una direccion
                this.registros["AUX"].valor = this.transformar_a_decimal(direccion)
                let direccion_decimal = this.registros["AUX"].valor & BITS_MAX_DIR

                //Asignar valores
                let resultado = this.registros["A"].valor + this.registros["B"].valor
                this.registros["AUX"].valor = resultado 

                this.memoria[direccion_decimal] = this.registros["AUX"].valor

                //flags
                this.comprobar_flag_c("ADD", this.registros["AUX"].valor, resultado)
                this.comprobar_flag_z(resultado)
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
                
                this.comprobar_flag_c("SUB", this.registros["A"].valor, valor_literal)
                //Asignamos valores
                let resultado = this.registros["A"].valor - valor_literal
                this.registros[destino].valor = resultado

                //flags
                this.comprobar_flag_n(resultado)
                this.comprobar_flag_z(resultado)
            } else {
                throw new Error("Operacion con argumentos invalidos")
            }
        } else {
            if (REGEX_DIR.test(destino)) { // (dir)
                //direccion
                let direccion = this.quitar_parentesis(destino)
                this.registros["AUX"].valor = this.transformar_a_decimal(direccion) 
                let direccion_decimal = this.registros["AUX"].valor & BITS_MAX_DIR

                //Asignar valores
                let resultado = this.registros["A"].valor - this.registros["B"].valor
                this.registros["AUX"].valor = resultado
                this.memoria[direccion_decimal] = this.registros["AUX"].valor

                //flags
                this.comprobar_flag_c("SUB", this.registros["A"].valor, this.registros["B"].valor)
                this.comprobar_flag_n(resultado)
                this.comprobar_flag_z(resultado)
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
                //Asignacion
                this.registros[destino].valor = this.registros["A"].valor & valor_literal
                //flags
                this.comprobar_flag_z(this.registros[destino].valor)
            } else {
                throw new Error("Operacion con argumentos invalidos")
            }
        } else {
            if (REGEX_DIR.test(destino)) { // (dir)
                //direccion
                let direccion = this.quitar_parentesis(destino)
                this.registros["AUX"].valor = this.transformar_a_decimal(direccion) 
                let direccion_decimal = this.registros["AUX"].valor & BITS_MAX_DIR
                //Asignacion
                this.memoria[direccion_decimal] = this.registros["A"].valor & this.registros["B"].valor
                //flags
                this.comprobar_flag_z(this.memoria[direccion_decimal])
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
                //Asignacion
                this.registros[destino].valor = this.registros["A"].valor | valor_literal
                //flags
                this.comprobar_flag_z(this.registros[destino].valor)
            } else {
                throw new Error("Operacion con argumentos invalidos")
            }
        } else {
            if (REGEX_DIR.test(destino)) { // (dir)
                //direccion
                let direccion = this.quitar_parentesis(destino)
                this.registros["AUX"].valor = this.transformar_a_decimal(direccion) 
                let direccion_decimal = this.registros["AUX"].valor & BITS_MAX_DIR
                //Asignacion
                this.memoria[direccion_decimal] = this.registros["A"].valor | this.registros["B"].valor
                //flags
                this.comprobar_flag_z(this.memoria[direccion_decimal])
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
                //Asignacion
                this.registros[destino].valor = this.registros["A"].valor ^ valor_literal
                //flags
                this.comprobar_flag_z(this.registros[destino].valor)

            } else {
                throw new Error("Operacion con argumentos invalidos")
            }
        } else {
            if (REGEX_DIR.test(destino)) { // (dir)
                //direccion
                let direccion = this.quitar_parentesis(destino)
                this.registros["AUX"].valor = this.transformar_a_decimal(direccion) 
                let direccion_decimal = this.registros["AUX"].valor & BITS_MAX_DIR
                //Asignacion
                this.memoria[direccion_decimal] = this.registros["A"].valor ^ this.registros["B"].valor
                //flags
                this.comprobar_flag_z(this.memoria[direccion_decimal])
            } else {
                throw new Error("Operacion con argumentos invalidos")
            }
        }
    }
    not(destino, valor = null) {
        this.restaurar_flags()
        let resultado = (~this.registros["A"].valor) & BITS_MAX //Recorta los bits del resultado a 16

        this.comprobar_flag_z(resultado)
        if (destino == "A" && arguments.length == 1) {
            this.registros["A"].valor = resultado
        } else if (valor == "A") {
            if (destino == "B") {
                this.registros["B"].valor = resultado
            } else if (REGEX_DIR_B.test(destino)) {
                let direccion = this.quitar_parentesis(destino)
                if (direccion == "B") {
                    direccion = this.registros["B"].valor & BITS_MAX_DIR
                } else {
                    this.registros["AUX"].valor = this.transformar_a_decimal(direccion)
                    direccion = this.registros["AUX"].valor & BITS_MAX_DIR 
                }
                this.memoria[direccion] = resultado
            }
        } else {
            throw new Error("Operacion con argumentos invalidos")
        }
    
    }
    shr(destino, valor = null) {
        //flags
        this.restaurar_flags()
        this.comprobar_flag_c("SHR", this.registros["A"].valor)

        let resultado = (this.registros["A"].valor >>> 1) & BITS_MAX //Recorta los bits del resultado a 16

        this.comprobar_flag_z(resultado)
        if (destino == "A" && arguments.length == 1) {
            this.registros["A"].valor = resultado
        } else if (valor == "A") {
            if (destino == "B") {
                this.registros["B"].valor = resultado
            } else if (REGEX_DIR_B.test(destino)) {
                let direccion = this.quitar_parentesis(destino)
                if (direccion == "B") {
                    direccion = this.registros["B"].valor & BITS_MAX_DIR
                } else {
                    this.registros["AUX"].valor = this.transformar_a_decimal(direccion)
                    direccion = this.registros["AUX"].valor & BITS_MAX_DIR 
                }
                this.memoria[direccion] = resultado
            }
        } else {
            throw new Error("Operacion con argumentos invalidos")
        } 
    }
    shl(destino, valor = null) {
        //flags
        this.restaurar_flags()
        this.comprobar_flag_c("SHL", this.registros["A"].valor)

        let resultado = (this.registros["A"].valor << 1) & BITS_MAX //Recorta los bits del resultado a 16

        this.comprobar_flag_z(resultado)
        if (destino == "A" && arguments.length == 1) {
            this.registros["A"].valor = resultado
        } else if (valor == "A") {
            if (destino == "B") {
                this.registros["B"].valor = resultado
            } else if (REGEX_DIR_B.test(destino)) {
                let direccion = this.quitar_parentesis(destino)
                if (direccion == "B") {
                    direccion = this.registros["B"].valor & BITS_MAX_DIR
                } else {
                    this.registros["AUX"].valor = this.transformar_a_decimal(direccion)
                    direccion = this.registros["AUX"].valor & BITS_MAX_DIR 
                }
                this.memoria[direccion] = resultado
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
            //Asignar valores
            let resultado = this.registros[valor].valor + 1
            this.registros[valor].valor ++

            //flags
            this.comprobar_flag_c("ADD", this.registros[valor].valor, resultado)
        } else if (REGEX_DIR_B.test(valor)) {  //(dir) | (B)
            let direccion = this.quitar_parentesis(valor)
            if (direccion === "B") {
                direccion = this.registros["B"].valor & BITS_MAX_DIR

                if (direccion in this.memoria) {
                    //Asiganar valores
                    let resultado = this.memoria[direccion] + 1
                    this.memoria[direccion] = resultado
                
                    //flag
                    this.comprobar_flag_c("ADD", this.memoria[direccion], resultado)
                } else {
                    this.memoria[direccion] = 1
                }  
            } else {
                this.registros["AUX"].valor = this.transformar_a_decimal(direccion)
                direccion = this.registros["AUX"].valor & BITS_MAX_DIR
                if (direccion in this.memoria) {
                    //Asiganar valores
                    let resultado = this.memoria[direccion] + 1
                    this.memoria[direccion] = resultado
                
                    //flag
                    this.comprobar_flag_c("ADD", this.memoria[direccion], resultado)
                } else {
                    this.memoria[direccion] = 1
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
            this.comprobar_flag_c("SUB", this.registros["A"].valor, 1)
            this.comprobar_flag_n(this.registros["A"].valor - 1)

            this.registros["A"].valor = this.registros["A"].valor - 1
        } else {
            throw new Error("Operacion con argumentos invalidos")
        }
    }
    cmp(valor_1, valor_2) {
        this.restaurar_flags()
        if (valor_1 == "A") {
            let literal = this.forzar_literal(valor_2)
            let resultado = this.registros["A"].valor - literal
            this.comprobar_flag_c("SUB", this.registros["A"].valor, literal)
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
        this.registros["PC"].valor = direccion
        this.restaurar_flags()
    }
    jeq(direccion) {
        if (arguments.length != 1) {
            throw new Error("Operacion con argumentos invalidos")
        }
        if (this.flags["Z"] == 1) {
            this.registros["PC"].valor = direccion
        } else {
            this.registros["PC"].valor ++
        }
        this.restaurar_flags()
    }
    jne(direccion) {
        if (arguments.length != 1) {
            throw new Error("Operacion con argumentos invalidos")
        }
        if (this.flags["Z"] == 0) {
            this.registros["PC"].valor = direccion
        } else {
            this.registros["PC"].valor ++
        }
        this.restaurar_flags()
    }
    jgt(direccion) {
        if (arguments.length != 1) {
            throw new Error("Operacion con argumentos invalidos")
        }
        if (this.flags["N"] == 0 && this.flags["Z"] == 0) {
            this.registros["PC"].valor = direccion
        } else {
            this.registros["PC"].valor ++
        }
        this.restaurar_flags()
    }
    jge(direccion) {
        if (arguments.length != 1) {
            throw new Error("Operacion con argumentos invalidos")
        }
        if (this.flags["N"] == 0) {
            this.registros["PC"].valor = direccion
        } else {
            this.registros["PC"].valor ++
        }
        this.restaurar_flags()
    }
    jlt(direccion) {
        if (arguments.length != 1) {
            throw new Error("Operacion con argumentos invalidos")
        }
        if (this.flags["N"] == 1) {
            this.registros["PC"].valor = direccion
        } else {
            this.registros["PC"].valor ++
        }
        this.restaurar_flags()
    }
    jle(direccion) {
        if (arguments.length != 1) {
            throw new Error("Operacion con argumentos invalidos")
        }
        if (this.flags["N"] == 1 || this.flags["Z"] == 1) {
            this.registros["PC"].valor = direccion
        } else {
            this.registros["PC"].valor ++
        }
        this.restaurar_flags()
    }
    jcr(direccion) {
        if (arguments.length != 1) {
            throw new Error("Operacion con argumentos invalidos")
        }
        if (this.flags["C"] == 1) {
            this.registros["PC"].valor = direccion
        } else {
            this.registros["PC"].valor ++
        }
        this.restaurar_flags()
    }
    push(arg) {
        this.restaurar_flags()
        if (arguments.length != 1 || !(["A", "B"].includes(arg))) {
            throw new Error("Operacion con argumentos invalidos")
        }
        this.memoria[this.registros["SP"].valor] = this.registros[arg].valor
        this.registros["SP"].valor --
    }
    pop(destino) {
        this.restaurar_flags()
        if (arguments.length != 1 || !(["A", "B"].includes(destino))) {
            throw new Error("Operacion con argumentos invalidos")
        }
        this.registros["SP"].valor ++
        this.registros[destino].valor = this.memoria[this.registros["SP"].valor] 
    }
    call(direccion) {
        this.restaurar_flags()
        if (arguments.length != 1) {
            throw new Error("Operacion con argumentos invalidos")
        }
        this.memoria[this.registros["SP"].valor] = this.registros["PC"].valor + 1
        this.registros["PC"].valor = direccion
        this.registros["SP"].valor --
    }
    ret() {
        this.restaurar_flags()
        this.registros["SP"].valor ++
        this.registros["PC"].valor = this.memoria[this.registros["SP"].valor]
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
            this.registros["AUX"].valor = numero_decimal
            return this.registros["AUX"].valor
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
            return this.registros["B"].valor //Hace sentido ya que siempre se opera con A
        } else if (REGEX_DIR_B.test(valor_traducido)) { //Memoria
            let direccion = this.quitar_parentesis(valor_traducido)
            
            if (direccion == "B") {
                direccion = this.registros["B"].valor & BITS_MAX_DIR
            } else {
                this.registros["AUX"].valor = this.transformar_a_decimal(direccion)
                direccion = this.registros["AUX"].valor & BITS_MAX_DIR
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
            return this.direcciones_codigo[direccion] & BITS_MAX_DIR
        } 
        this.registros["AUX"].valor = this.transformar_a_decimal(direccion)
        if (isNaN(this.registros["AUX"].valor)){ 
            throw new Error("Direccion de codigo invalida")
        } else { 
            direccion = this.registros["AUX"].valor & BITS_MAX_DIR
            return direccion
        }
    }
    comprobar_flag_c(operacion, dato_1, dato_2){
        if (operacion == "NOP") {
            if (dato_1 > BITS_MAX) {
                dato_1 = dato_1 % BITS_MAX - 1
            }
        // Caso | result < a + b
        } else if (operacion == "ADD") {
            if (dato_1 < dato_2) {
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
    }
    comprobar_flag_n(resultado) {
        if (resultado < 0) {
            this.flags['N'] = 1;
          } else {
            this.flags['N'] = 0;
          }
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
          registros: {A: this.registros["A"], 
            B: this.registros["B"], 
            PC: this.registros["PC"], 
            SP: this.registros["SP"]},
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