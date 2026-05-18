const mongoose = require("mongoose");

const PedidoSchema = new mongoose.Schema({
  productos: [
    {
      nombre: String,
      precio: Number
    }
  ],
  total: Number,
  fecha: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Pedido", PedidoSchema);
