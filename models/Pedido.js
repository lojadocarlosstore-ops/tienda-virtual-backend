const mongoose = require("mongoose");

const PedidoSchema = new mongoose.Schema({
  usuario: String,
  productos: Array,
  total: Number,
  direccion: String,
  estado: { type: String, default: "pendiente" },
  fecha: { type: Date, default: Date.now }
}, { collection: "pedidos" });

module.exports = mongoose.model("Pedido", PedidoSchema);