const express = require("express");
const pool = require("./db");
const logger = require("./middleware");

const app = express();

app.use(express.json());
app.use(logger);

app.get("/", (req, res) => {
  res.send("API Tienda de Joyas funcionando");
});

app.get("/joyas", async (req, res) => {
  try {
    const {
      limits = 3,
      page = 1,
      order_by = "id_ASC"
    } = req.query;

    const [campo, direccion] = order_by.split("_");

    const camposPermitidos = [
      "id",
      "nombre",
      "categoria",
      "metal",
      "precio",
      "stock"
    ];

    const direccionesPermitidas = ["ASC", "DESC"];

    if (
      !camposPermitidos.includes(campo) ||
      !direccionesPermitidas.includes(direccion)
    ) {
      return res.status(400).json({
        error: "Parámetro order_by inválido"
      });
    }

    const limite = Number(limits);
    const pagina = Number(page);

    if (
      !Number.isInteger(limite) ||
      limite <= 0 ||
      !Number.isInteger(pagina) ||
      pagina <= 0
    ) {
      return res.status(400).json({
        error: "limits y page deben ser números enteros mayores que 0"
      });
    }

    const offset = (pagina - 1) * limite;

    const query = `
      SELECT *
      FROM inventario
      ORDER BY ${campo} ${direccion}
      LIMIT $1
      OFFSET $2
    `;

    const result = await pool.query(query, [limite, offset]);

    const stockTotal = result.rows.reduce(
      (total, joya) => total + joya.stock,
      0
    );

    const results = result.rows.map((joya) => ({
      name: joya.nombre,
      href: `/joyas/joya${joya.id}`
    }));

    const totalResult = await pool.query(
      "SELECT COUNT(*) AS total FROM inventario"
    );

    const totalJoyas = Number(totalResult.rows[0].total);

    res.json({
      totalJoyas,
      stockTotal,
      results
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error al obtener las joyas"
    });
  }
});

app.get("/joyas/filtros", async (req, res) => {
  try {
    const {
      precio_min,
      precio_max,
      categoria,
      metal
    } = req.query;

    let query = "SELECT * FROM inventario WHERE 1=1";
    const values = [];

    if (precio_min !== undefined) {
      const precioMin = Number(precio_min);

      if (!Number.isFinite(precioMin)) {
        return res.status(400).json({
          error: "precio_min debe ser un número"
        });
      }

      values.push(precioMin);
      query += ` AND precio >= $${values.length}`;
    }

    if (precio_max !== undefined) {
      const precioMax = Number(precio_max);

      if (!Number.isFinite(precioMax)) {
        return res.status(400).json({
          error: "precio_max debe ser un número"
        });
      }

      values.push(precioMax);
      query += ` AND precio <= $${values.length}`;
    }

    if (categoria) {
      values.push(categoria);
      query += ` AND categoria = $${values.length}`;
    }

    if (metal) {
      values.push(metal);
      query += ` AND metal = $${values.length}`;
    }

    const result = await pool.query(query, values);

    res.json(result.rows);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error al filtrar las joyas"
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});