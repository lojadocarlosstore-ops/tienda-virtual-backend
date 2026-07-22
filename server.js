console.log("SERVER VERSION NUEVA CON ADMIN LOGIN");
console.log("BACKEND NUEVO CORRIENDO");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const path = require("path");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.log("Falta la variable de entorno JWT_SECRET. El servidor no puede arrancar sin ella.");
  process.exit(1);
}
//  MODELOS
const User = require("./models/User");
const Pedido = mongoose.model("Pedido", require("./models/Pedido").schema, "pedidos");

const app = express();

// =====================
// MODELO PRODUCTO
// =====================
const ProductoSchema = new mongoose.Schema({
  nombre: String,
  precio: Number,
  imagen: String,
  categoria: String
}, { versionKey: false });

const Producto =
  mongoose.models.Producto ||
  mongoose.model("Producto", ProductoSchema, "productos");

// =====================
// MIDDLEWARES
// =====================
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// =====================
// IMAGENES STATIC
// =====================
app.use("/img", express.static(path.join(__dirname, "public", "img")));

/* =====================
   ADMIN
===================== */

const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;

if (!ADMIN_USER || !ADMIN_PASS) {
  console.log("❌ Faltan las variables de entorno ADMIN_USER / ADMIN_PASS. El servidor no puede arrancar sin ellas.");
  process.exit(1);
}

console.log("ADMIN ROUTE CARGADA");

app.post("/admin/login", (req, res) => {

  try {

    const { user, pass } = req.body;

    if (user === ADMIN_USER && pass === ADMIN_PASS) {

      const token = jwt.sign(
        { role: "admin" },
        JWT_SECRET,
        { expiresIn: "1d" }
      );

      return res.json({
        ok: true,
        token
      });
    }

    return res.status(401).json({
      ok: false,
      message: "Credenciales incorrectas"
    });

  } catch (error) {

    console.log("ERROR LOGIN ADMIN:", error);

    return res.status(500).json({
      ok: false,
      message: "Error servidor login"
    });

  }

});

/* =====================
   MONGODB
===================== */

mongoose.connect(process.env.MONGO_URL)
  .then(() => {
    console.log("MongoDB conectado ✔️");
  })
  .catch(err => {
    console.log("ERROR MONGO:", err.message);
  });
/* =====================
   EMAIL
===================== */

const { Resend } = require("resend");

if (!process.env.RESEND_API_KEY) {
  console.log("❌ Falta la variable de entorno RESEND_API_KEY. El servidor no puede arrancar sin ella.");
  process.exit(1);
}

const resend = new Resend(process.env.RESEND_API_KEY);

/* =====================
   LOGIN USER
===================== */

app.post("/login", async (req, res) => {

  console.log("BODY LOGIN:", req.body); // 

  try {

    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Usuario no encontrado" });
    }

    const ok = await bcrypt.compare(password, user.password);

    if (!ok) {
      return res.status(400).json({ message: "Contraseña incorrecta" });
    }

    const token = jwt.sign(
      { id: user._id, nombre: user.nombre },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        nombre: user.nombre,
        email: user.email
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Error en login" });
  }

});

/* =====================
   AUTH MIDDLEWARE
===================== */

function authMiddleware(req, res, next) {

  const header = req.headers.authorization;

  if (!header) return res.status(401).json({ error: "Sin token" });

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido" });
  }
}

/* =====================
   REGISTER
===================== */

app.post("/register", async (req, res) => {

  try {

    const { nombre, email, password } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ message: "Todos los campos son obligatorios" });
    }

    const existe = await User.findOne({ email });

    if (existe) {
      return res.status(400).json({ message: "El usuario ya existe" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const nuevoUser = new User({
      nombre,
      email,
      password: hashedPassword
    });

    await nuevoUser.save();

    res.json({ message: "Usuario registrado correctamente" });

  } catch (error) {
    console.log("❌ ERROR REGISTER COMPLETO:");
    console.log(error);
    console.log(error?.message);
    res.status(500).json({ message: "Error en registro" });
  }

});

/* =====================
   LOGIN USER
===================== */

app.post("/login", async (req, res) => {

  try {

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Todos los campos son obligatorios" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Usuario o contraseña incorrectos" });
    }

    const ok = await bcrypt.compare(password, user.password);

    if (!ok) {
      return res.status(400).json({ message: "Usuario o contraseña incorrectos" });
    }

    const token = jwt.sign(
      { id: user._id, nombre: user.nombre },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        nombre: user.nombre,
        email: user.email
      }
    });

  } catch (error) {
    console.log("❌ ERROR LOGIN:");
    console.log(error);
    res.status(500).json({ message: "Error en login" });
  }

});
/* =====================
   PRODUCTOS
===================== */

app.get("/productos", async (req, res) => {

  console.log("RUTA /productos ACTIVA");

  try {

    const productos = await Producto.find({}).lean();

    console.log("PRODUCTOS OK:", productos);

    res.json(productos);

  } catch (err) {

    console.log("❌ ERROR PRODUCTOS:", err);

    res.status(500).json({ error: err.message });

  }

});

/* =====================
   PEDIDOS (ADMIN)
===================== */

app.get("/admin/pedidos", authMiddleware, async (req, res) => {

  console.log("RUTA /admin/pedidos ACTIVA");

  try {

    const pedidos = await Pedido.find({}).lean();

    console.log("PEDIDOS OK:", pedidos);

    res.json(pedidos);

  } catch (err) {

    console.log("❌ ERROR PEDIDOS:", err);

    res.status(500).json({ error: err.message });

  }

});
app.post("/pedidos", authMiddleware, async (req, res) => {

  try {

    console.log("USER:", req.user);
    console.log(" BODY:", req.body);

    const { productos, total, telefono, usuario } = req.body;

    let direccion = req.body.direccion || "Sin dirección";

    const pedido = new Pedido({
      usuario: req.user?.id || null,
      productos,
      total,
      direccion,
      estado: "pendiente"
    });

    await pedido.save();

    console.log("🔥 PEDIDO GUARDADO EN MONGO:", pedido);

    const fechaLocal = new Date().toLocaleString("es-CO", {
      timeZone: "America/Bogota"
    });

    const productosHTML = (productos || [])
      .map(p => `🛒 ${p.nombre} x${p.cantidad || 1} - $${p.precio * (p.cantidad || 1)}`)
      .join("<br>");

    const html = `
<div style="
  font-family: Arial, sans-serif;
  background: #f3f4f6;
  padding: 30px;
">

  <div style="
    max-width: 500px;
    margin: auto;
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
  ">

    <h2 style="
      text-align: center;
      background: #e11d48;
      color: white;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 20px;
    ">
      🛒 Nuevo Pedido
    </h2>

    <p><b>👤 Nombre:</b> ${usuario?.nombre || "No registrado"}</p>

    <p><b>📞 Teléfono:</b> ${telefono || "No registrado"}</p>

    <hr style="margin: 15px 0;">

    <p><b>Productos:</b></p>

    <div style="margin-left:10px; margin-bottom:10px;">
      ${productosHTML}
    </div>

    <hr style="margin: 15px 0;">

    <p><b>📍 Dirección:</b> ${direccion}</p>
    <p><b>📅 Fecha:</b> ${fechaLocal}</p>

    <h3 style="
      text-align:center;
      color:#16a34a;
      margin-top:20px;
    ">
      💰 TOTAL: $${total}
    </h3>

  </div>
</div>
`;

    try {

      console.log("📧 ENVIANDO EMAIL...");

      const response = await resend.emails.send({
        from: "onboarding@resend.dev",
        to: "lojadocarlos.store@gmail.com",
        subject: "Nuevo pedido Loja do Carlos",
        html: html
      });

      console.log("✅ RESPUESTA RESEND:");
      console.log(response);

    } catch (emailError) {

      console.log("❌ ERROR RESEND:");
      console.log(emailError);

    }

    res.json(pedido);

  } catch (err) {
    console.log("Error pedido:", err.message);
    res.status(500).json({ error: "Error pedido" });
  }
});

console.log("RUTA PUT PEDIDOS CARGADA");

app.put("/admin/pedidos/:id", async (req, res) => {

  try {

    const { estado } = req.body;

    const pedidoActualizado = await Pedido.findByIdAndUpdate(
      req.params.id,
      { estado: estado },
      { new: true }
    );

    if (!pedidoActualizado) {
      return res.status(404).json({
        message: "Pedido no encontrado"
      });
    }

    res.json(pedidoActualizado);

  } catch (err) {

    console.log("❌ ERROR ACTUALIZANDO PEDIDO:", err);

    res.status(500).json({
      error: err.message
    });

  }

});

app.delete("/usuarios/:id", async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json({ message: "Usuario eliminado correctamente" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/productos/:id", async (req, res) => {
  try {
    const producto = await Producto.findByIdAndDelete(req.params.id);

    if (!producto) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    res.json({ message: "Producto eliminado correctamente" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/admin/pedidos/:id", async (req, res) => {
  try {
    const pedido = await Pedido.findByIdAndDelete(req.params.id);

    if (!pedido) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }

    res.json({ message: "Pedido eliminado correctamente" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
/* =====================
   SERVER
===================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Servidor corriendo en puerto", PORT);
});