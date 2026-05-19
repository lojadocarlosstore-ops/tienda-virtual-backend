console.log("🔥 SERVER VERSION NUEVA CON ADMIN LOGIN");

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const path = require("path");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// 👇 MODELOS
const User = require("./models/User");
const Pedido = require("./models/Pedido"); 

const app = express();

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

const ADMIN_USER = "admin";
const ADMIN_PASS = "1234";
const ADMIN_TOKEN = "admin-token";

console.log("ADMIN ROUTE CARGADA");
app.post("/admin/login", (req, res) => {

  const { user, pass } = req.body;

  if (!user || !pass) {
    return res.status(400).json({ ok: false, message: "Faltan datos" });
  }

  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    return res.json({
      ok: true,
      token: ADMIN_TOKEN
    });
  }

  return res.status(401).json({
    ok: false,
    message: "Credenciales incorrectas"
  });
});

/* =====================
   JWT SECRET
===================== */

const JWT_SECRET = "secreto_tienda";

/* =====================
   MONGODB
===================== */

const MONGO_URL = "mongodb+srv://lojadocarlosstore_db_user:Mario123456@cluster0.b1zhpmd.mongodb.net/aplicacion-web?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(MONGO_URL)
  .then(() => console.log("MongoDB conectado ✔️"))
  .catch(err => console.log("Error Mongo:", err.message));
  mongoose.connection.on("connected", () => {
  console.log("🔥 REAL MONGO:", mongoose.connection.host);
});

/* =====================
   EMAIL
===================== */

const { Resend } = require("resend");

const resend = new Resend("re_Qc8VBNSb_NPFvmMVnPrZhzzMsKf48gFHv");

/* =====================
   ADMIN LOGIN
===================== */

app.post("/login", async (req, res) => {

  console.log("BODY LOGIN:", req.body); // 👈 AQUÍ

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

  if (!header) {
    return res.status(401).json({ error: "Sin token" });
  }

  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;

    next();

  } catch (error) {
    return res.status(401).json({ error: "Token inválido" });
  }
}

/* =====================
   REGISTER
===================== */

app.post("/register", async (req, res) => {

  try {

    const { nombre, email, password } = req.body;

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
   PRODUCTOS
===================== */

app.get("/productos", async (req, res) => {

  try {

    const data = await Producto.find();

    console.log("PRODUCTOS:", data.length);

    res.json(data);

  } catch (err) {

    console.log("ERROR PRODUCTOS:", err.message);

    res.status(500).json({ error: "Error productos" });

  }

});

app.post("/productos", async (req, res) => {

  try {

    const nuevo = new Producto(req.body);

    await nuevo.save();

    res.json(nuevo);

  } catch (err) {

    res.status(500).json({ error: "Error creando producto" });

  }

});

app.delete("/productos/:id", async (req, res) => {

  try {

    await Producto.findByIdAndDelete(req.params.id);

    res.json({ ok: true });

  } catch (err) {

    res.status(500).json({ error: "Error eliminando producto" });

  }

});

app.post("/pedidos", authMiddleware, async (req, res) => {

  try {

    const { productos, total, direccion, telefono, usuario } = req.body;

    const pedido = new Pedido({
      usuario: req.user.id,
      productos,
      total,
      direccion,
      estado: "pendiente"
    });

    await pedido.save();

    const fechaLocal = new Date().toLocaleString("es-CO", {
      timeZone: "America/Bogota"
    });

    // 🔥 FORMATEAR PRODUCTOS BONITO
    const productosHTML = productos
      .map(p => `🛒 ${p.nombre} x${p.cantidad || 1} - $${p.precio * (p.cantidad || 1)}`)
      .join("<br>");

    const html = `
      <div style="font-family: Arial;">
        <h2>🛒 Nuevo Pedido</h2>

        <p><b>👤 Nombre:</b> ${usuario?.nombre || "No registrado"}</p>

        <p><b>📞 Teléfono:</b> ${telefono || "No registrado"}</p>

        <hr>

        <p><b>Productos:</b></p>
        <p>${productosHTML}</p>

        <hr>

        <p><b>📍 Dirección:</b> ${direccion}</p>
        <p><b>📅 Fecha:</b> ${fechaLocal}</p>
        <p><b>💰 TOTAL:</b> $${total}</p>
      </div>
    `;

    setImmediate(async () => {
      try {
        await resend.emails.send({
          from: "onboarding@resend.dev",
          to: "lojadocarlos.store@gmail.com",
          subject: "🛒 Nuevo pedido",
          html
        });
      } catch (error) {
        console.log("EMAIL ERROR:", error.message);
      }
    });

    res.json(pedido);

  } catch (err) {
    console.log("Error pedido:", err.message);
    res.status(500).json({ error: "Error pedido" });
  }
});

/* =====================
   ADMIN PEDIDOS
===================== */

app.get("/admin/pedidos", async (req, res) => {

  try {

    const token = req.headers.authorization;

    if (token !== ADMIN_TOKEN) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const pedidos = await Pedido.find().sort({ fecha: -1 });

    res.json(pedidos);

  } catch (err) {

    res.status(500).json({ error: "Error servidor" });

  }

});

app.put("/admin/pedidos/:id/estado", async (req, res) => {

  try {
  
    console.log("BODY:", req.body);
    console.log("ID:", req.params.id);


    const { id } = req.params;
    const { estado } = req.body;

    const pedido = await Pedido.findById(id);

    if (!pedido) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }

    pedido.estado = estado;

    await pedido.save();

    res.json({
      ok: true,
      message: "Estado actualizado",
      pedido
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Error servidor" });
  }
});

/* =====================
   SERVER
===================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Servidor corriendo en puerto", PORT);
});