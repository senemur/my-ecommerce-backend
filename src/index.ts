import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import prisma from "./prismaClient";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());

// --- PRODUCTS ---
app.get("/api/products", async (_req, res) => {
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
app.get("/api/cart", async (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: "userId required" });

  const items = await prisma.cartItem.findMany({
    where: { userId },
    include: { product: true },
  });
  res.json(items);
});

app.post("/api/cart", async (req, res) => {
  try {
    const { userId, productId, quantity } = req.body as {
      userId: string;
      productId: number;
      quantity?: number;
    };

    if (!userId || !productId) {
      return res.status(400).json({ error: "userId & productId required" });
    }

    // Kullanıcıyı bul/oluştur: UID yoksa Prisma FK hatası verir
    await prisma.user.upsert({
      where: { id: userId },
      update: {}, // varsa dokunma
      create: {
        id: userId,
        email: `${userId}@placeholder.com`, // email unique olduğu için basit bir placeholder
      },
    });

    // Sepette aynı ürün varsa miktarı arttır
    const existing = await prisma.cartItem.findFirst({
      where: { userId, productId },
    });

    if (existing) {
      const updated = await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + (quantity || 1) },
        include: { product: true },
      });
      return res.json(updated);
    }

    // Yeni cart item oluştur
    const created = await prisma.cartItem.create({
      data: { userId, productId, quantity: quantity || 1 },
      include: { product: true },
    });

    res.json(created);
  } catch (err) {
    console.error("POST /api/cart error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Tek bir cartItem'ı sil
app.delete("/api/cart/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ error: "Geçersiz id" });
  }

  try {
    const deleted = await prisma.cartItem.delete({
      where: { id },
    });
    return res.json(deleted);
  } catch (err) {
    console.error("DELETE /api/cart/:id error:", err);
    return res.status(500).json({ error: "Silme işlemi sırasında hata oluştu" });
  }
});

// Sepetteki ürün miktarını azalt veya artır
app.patch("/api/cart/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { delta } = req.body as { delta: number }; // örn: -1 veya +1
  if (!id || Number.isNaN(id) || !delta) {
    return res.status(400).json({ error: "Geçersiz istek" });
  }

  try {
    const item = await prisma.cartItem.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: "Bulunamadı" });

    // Yeni miktar
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      // miktar 0 veya altına düşerse tamamen sil
      await prisma.cartItem.delete({ where: { id } });
      return res.json({ ok: true, deleted: true });
    }

    const updated = await prisma.cartItem.update({
      where: { id },
      data: { quantity: newQty },
      include: { product: true },
    });
    return res.json(updated);
  } catch (err) {
    console.error("PATCH /api/cart/:id error:", err);
    return res.status(500).json({ error: "Sunucu hatası" });
  }
});



// --- FAVORITES ---
app.get("/api/favorites", async (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: "userId required" });
  const favs = await prisma.favorite.findMany({
    where: { userId },
    include: { product: true },
  });
  res.json(favs);
});

app.post("/api/favorites", async (req, res) => {
  const { userId, productId } = req.body as { userId: string; productId: number };
  if (!userId || !productId) return res.status(400).json({ error: "userId & productId required" });

  const exists = await prisma.favorite.findFirst({ where: { userId, productId } });
  if (exists) return res.json(exists);

  const created = await prisma.favorite.create({ data: { userId, productId },
   include: { product: true },  });
  res.json(created);
});

// --- ORDERS ---
app.get("/api/orders", async (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: "userId required" });
  const orders = await prisma.order.findMany({
    where: { userId },
    include: { items: { include: { product: true } } },
  });
  res.json(orders);
});

app.post("/api/orders", async (req, res) => {
  const { userId, items } = req.body as {
    userId: string;
    items: { productId: number; quantity: number; price: number }[];
  };
  if (!userId || !items || !Array.isArray(items)) {
    return res.status(400).json({ error: "userId & items required" });
  }

  const total = items.reduce((s, it) => s + Number(it.price) * Number(it.quantity), 0);

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
