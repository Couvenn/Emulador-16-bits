const {PORT, APP_NAME, PUBLIC_RUTA} = require('./parametros');
const Assembly = require("./assembly");
const express = require("express");
const morgan = require("morgan");

const app = express();

app.disable("x-powered-by") //Desactiva una el header de express

// middlewares
app.use(morgan("dev"));
app.use(express.json());

app.use(express.static(PUBLIC_RUTA));

// routes
app.post('/assembly', (req,res) => {
  const assembly_inst = new Assembly
  try {
    assembly_inst.cargar_datos_y_direcciones(req.body.codigo)
    assembly_inst.ejecutar()
    res.json(assembly_inst)

  } catch (error) {
    res.json({error: error.message})
  }
});

app.post('/next', (req,res) => {
  const assembly_inst = new Assembly
  try {
    assembly_inst.cargar_datos_y_direcciones(req.body.codigo)
    assembly_inst.ejecutar(req.body.ciclos)
    res.json(assembly_inst)

  } catch (error) {
    res.json({error: error.message})
  };
});

app.post('/prev', (req,res) => {
  const assembly_inst = new Assembly
  try {
    assembly_inst.cargar_datos_y_direcciones(req.body.codigo)
    assembly_inst.ejecutar(req.body.ciclos)
    res.json(assembly_inst)

  } catch (error) {
    res.json({error: error.message})
  };

});

app.use((req, res) => {
  res.redirect("/");
});

app.listen(PORT, () => {
  console.log(`Servidor ${APP_NAME} activo en ${PORT}`);
});

