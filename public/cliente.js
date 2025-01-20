const reg_a = document.getElementById("reg_A")
const reg_b = document.getElementById("reg_B")
const pc = document.getElementById("PC")
const sp = document.getElementById("SP")
const memoria = document.getElementById("lista_memoria")

const b_ejecutar = document.getElementById("ejecutar")
const texto_codigo = document.getElementById("codigo")

function actualizar_datos (datos) {
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
        b_ejecutar.disabled = true
    } else {
        alert(datos.error)
        b_ejecutar.disabled = true
    }
}

b_ejecutar.addEventListener("click", () => {
    fetch("http://localhost:3000/assembly", {
        method: "POST",
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({codigo: texto_codigo.value})
    })
    .then(response => response.json())
    .then(data => actualizar_datos(data))
})

texto_codigo.addEventListener('input', () => {
    if (texto_codigo.value.trim() != "" && texto_codigo.value.includes("CODE:")) {
        b_ejecutar.disabled = false
    } else {
        b_ejecutar.disabled = true
    }
})