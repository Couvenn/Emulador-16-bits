# Emulador de assembly 
Un emulador basado en la etapa 2 del proyecto del curso, muchas formas en las que se trabajan instrucciones o direcciones serian como funcionan en vivado, y también teniendo las limitaciones que tenia el computador básico que trabajamos, por ejemplo: no poder realizar la instrucción MOV (dir), lit pues ambos se resguardaban en el mux del registro B. ( Y también la razón por la que el código de la instrucción MOV es el mas largo. ) 

Este proyecto lo subí a un host gratis para hacerlo mas facil de probar y notar como funcionaria ocultando el backend, puede que demore un poco en iniciar pero por si le sirve:
https://emulador-16-bits.onrender.com

## Puntos a notar
Nunca he trabajado con un servidor y no se que tanto se le puede exigir por lo que estas son medidas que coloque para que no explote o algo parecido.
* Para evitar bucles infinitos, se trabajan con una cantidad fija de ciclos.
* Para evitar el calculo de números muy grandes o hasta fuera del sentido de trabajar con 16 bits, los números que se pueden colocar como literal o dirección están limitado por un Rango dependiendo de su representación ya sean (decimal, binaria, hexadecimal).
Todos estos ajuste se pueden cambiar en el archivos de parámetros en src.
* Dentro de la pagina solo se exige el CODE: para poder ejecutar un código y deja DATA: como opcional y al realizar algún cambio siempre se reiniciaran los valores visibles de los registros y memoria.


## Sobre lo que falta
* Un html y css mas completo
* Realizar una cache al servidor (note que el boton next se puede sobre-explotar)
* Trabajar mas la configuración del servidor y el cliente:
Es la primera vez que trabajo con node y seguramente le falten muchas cosas como en la parte del cliente detectar en que url esta para realizar las peticiones.
* Refactorizar el código de Assembly:
Siento que aun se repite mucho código y por ello 800 líneas. Ya he refactorizado el código una vez, mas se que aun puede mejorar.

Pido perdón de antemano si hay partes del código que no se entienden y no están comentadas correctamente, aun es algo que siento que debo mejorar si es que realizo trabajos colaborativos.