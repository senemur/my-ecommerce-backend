import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import prisma from "./prismaClient";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: "http://localhost:3000", // Next.js frontend adresi
  credentials: true,
}));
app.use(express.json());

// --- PRODUCTS ---
app.get("/api/products", async (req, res) => {
  const products = await prisma.product.findMany({ orderBy: { createdAt: "desc" } });
  res.json(products);
});

app.get("/api/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return res.status(404).json({ error: "Not found" });
  res.json(product);
});

// --- CART ---
// get cart by userId (simple demo)
app.get("/api/cart", async (req, res) => {
  const userId = Number(req.query.userId);
  if (!userId) return res.status(400).json({ error: "userId required" });
  const items = await prisma.cartItem.findMany({
    where: { userId },
    include: { product: true },
  });
  res.json(items);
});

// add/update cart item
app.post("/api/cart", async (req, res) => {
  const { userId, productId, quantity } = req.body;
  if (!userId || !productId) return res.status(400).json({ error: "userId & productId required" });

  const existing = await prisma.cartItem.findFirst({ where: { userId, productId } });
  if (existing) {
    const updated = await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: (existing.quantity || 0) + (quantity || 1) },
    });
    return res.json(updated);
  }

  const created = await prisma.cartItem.create({
    data: { userId, productId, quantity: quantity || 1 },
  });
  res.json(created);
});

app.delete("/api/cart/:id", async (req, res) => {
  const id = Number(req.params.id);
  await prisma.cartItem.delete({ where: { id } });
  res.json({ ok: true });
});

// --- FAVORITES ---
app.get("/api/favorites", async (req, res) => {
  const userId = Number(req.query.userId);
  if (!userId) return res.status(400).json({ error: "userId required" });
  const favs = await prisma.favorite.findMany({ where: { userId }, include: { product: true }});
  res.json(favs);
});

app.post("/api/favorites", async (req, res) => {
  const { userId, productId } = req.body;
  if (!userId || !productId) return res.status(400).json({ error: "userId & productId required" });

  const exists = await prisma.favorite.findFirst({ where: { userId, productId }});
  if (exists) return res.json(exists);

  const created = await prisma.favorite.create({ data: { userId, productId }});
  res.json(created);
});

// --- ORDERS ---
app.get("/api/orders", async (req, res) => {
  const userId = Number(req.query.userId);
  if (!userId) return res.status(400).json({ error: "userId required" });
  const orders = await prisma.order.findMany({ where: { userId }, include: { items: { include: { product: true } } }});
  res.json(orders);
});

app.post("/api/orders", async (req, res) => {
  const { userId, items } = req.body; // items: [{ productId, quantity, price }]
  if (!userId || !items || !Array.isArray(items)) return res.status(400).json({ error: "userId & items required" });

  const total = items.reduce((s: number, it: any) => s + Number(it.price) * Number(it.quantity), 0);

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({ data: { userId, total } });
    for (const it of items) {
      await tx.orderItem.create({
        data: {
          orderId: order.id,
          productId: it.productId,
          quantity: it.quantity,
          price: it.price,
        },
      });
    }
    // optionally clear cart for user
    await tx.cartItem.deleteMany({ where: { userId } });
    return order;
  });

  res.json(result);
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
app.get("/", (_req, res) => {
  res.send("Backend API çalışıyor 🚀");
});