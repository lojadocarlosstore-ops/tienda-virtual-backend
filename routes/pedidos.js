const express = require("express");
const router = express.Router();
const Pedido = require("../models/Pedido");

// Crear pedido
router.post("/", async (req, res) => {
  try {
    const nuevoPedido = new Pedido(req.body);
    await nuevoPedido.save();
    res.json(nuevoPedido);
  } catch (error) {
    res.status(500).json({ error: "Error creando pedido" });
  }
});

// Obtener pedidos
router.get("/", async (req, res) => {
  const pedidos = await Pedido.find();
  res.json(pedidos);
});

module.exports = router;