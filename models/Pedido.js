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
},
  {
    collection: "pedidos" // 🔥 FORZAMOS MISMA COLECCIÓN
  });

module.exports = mongoose.model("Pedido", PedidoSchema);