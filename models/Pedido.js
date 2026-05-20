const mongoose = require("mongoose");

const PedidoSchema = new mongoose.Schema({
  usuario: String,

  productos: [
    {
      nombre: String,
      precio: Number,
      cantidad: Number
    }
  ],

  total: Number,

  direccion: String,

  estado: {
    type: String,
    default: "pendiente"
  },

  fecha: {
    type: Date,
    default: Date.now
  }
}, { versionKey: false });

module.exports = mongoose.model("Pedido", PedidoSchema);