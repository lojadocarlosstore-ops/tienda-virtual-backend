router.post("/", async (req, res) => {
  try {

    const { productos, total, direccion, fecha, usuario } = req.body;

    const productosFormateados = productos.map(p => ({
      nombre: p.nombre,
      precio: p.precio,
      cantidad: p.cantidad || 1
    }));

    const nuevoPedido = new Pedido({
      productos: productosFormateados,
      total,
      direccion,
      fecha,
      usuario
    });

    await nuevoPedido.save();

    res.json(nuevoPedido);

  } catch (error) {
    res.status(500).json({ error: "Error creando pedido" });
  }
});