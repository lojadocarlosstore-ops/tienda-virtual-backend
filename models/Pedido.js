const mongoose = require("mongoose");

const PedidoSchema = new mongoose.Schema({

  usuario: {
    type: String,
    default: null
  },

  productos: [
    {
      nombre: String,
      precio: Number,
      cantidad: Number
    }
  ],

  total: {
    type: Number,
    default: 0
  },

  direccion: {
    type: String,
    default: "Sin dirección"
  },

  estado: {
    type: String,
    default: "pendiente"
  },

  fecha: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model("Pedido", PedidoSchema);