const reg_a = document.getElementById("reg_A")
const reg_b = document.getElementById("reg_B")
const pc = document.getElementById("PC")
const sp = document.getElementById("SP")
const memoria = document.getElementById("lista_memoria")

const b_ejecutar = document.getElementById("ejecutar")
const b_prev = document.getElementById("prev")
const b_next = document.getElementById("next")

const texto_codigo = document.getElementById("codigo")

const URL_API = "https://emulador-16-bits.onrender.com"

let ciclos = 0

function formatear_datos () {
    ciclos = 0
    reg_a.innerText = 0
    reg_b.innerText = 0
    pc.innerText = 0 
    sp.innerText = "0xFFF"
    let datos_antiguos = memoria.querySelectorAll("li")
    datos_antiguos.forEach(dato => dato.remove())
        
}

function actualizar_datos (datos) {
    if (ciclos >= 0) {
        b_next.disabled = false
        b_prev.disabled = true
    }

    if (datos.error === undefined) {
        reg_a.innerText = datos.registros["A"]
        reg_b.innerText = datos.registros["B"]
        pc.innerText = datos.registros["PC"] 
        sp.innerText = "0x" + datos.registros["SP"].toString(16).toUpperCase()
    
        let datos_antiguos = memoria.querySelectorAll("li")
        datos_antiguos.forEach(dato => dato.remove())
        
        for (let direccion in datos.memoria) {
            let dato = document.createElement("li")
            let valor  = datos.memoria[direccion]
            let direccion_decimal = parseInt(direccion)
            let direccion_hex = direccion_decimal.toString(16).toUpperCase()
            dato.innerText = `0x${direccion_hex} : ${valor}`
            memoria.appendChild(dato)
        } 
    } else {
        alert(datos.error)
        b_ejecutar.disabled = true
        b_next.disabled = true
        b_prev.disabled = true
    }
}

b_ejecutar.addEventListener("click", () => {
    fetch(URL_API + "/assembly", {
        method: "POST",
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({codigo: texto_codigo.value})
    })
    .then(response => response.json())
    .then(data => actualizar_datos(data))
    b_ejecutar.disabled = true
    b_prev.disabled = true
    b_next.disabled = true
})

b_prev.addEventListener("click", () => {
    if (ciclos > 0) {
        ciclos --
    }
    fetch(URL_API + "/prev", {
        method: "POST",
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({codigo: texto_codigo.value, ciclos: ciclos})
    })
    .then(response => response.json())
    .then(data => actualizar_datos(data))
})

b_next.addEventListener("click", () => {
    ciclos ++

    fetch(URL_API + "/next", {
        method: "POST",
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({codigo: texto_codigo.value, ciclos: ciclos})
    })
    .then(response => response.json())
    .then(data => actualizar_datos(data))
    if (ciclos != 0) {
        b_prev.disabled = false
    }
})

texto_codigo.addEventListener('input', () => {
    formatear_datos()
    if (texto_codigo.value.trim() != "" && texto_codigo.value.includes("CODE:")) {
        b_ejecutar.disabled = false
        b_next.disabled = false
    } else {
        b_ejecutar.disabled = true
        b_prev.disabled = true
        b_next.disabled = true
    }
})