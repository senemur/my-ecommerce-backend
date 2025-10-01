/// <reference types="node" />
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const products = [
    { name: "Oversize T-Shirt", description: "Pamuklu", price: "249.90", image: "/tshirt.jpg" },
    { name: "Yüksek Bel Jean", description: "Kot pantolon", price: "499.00", image: "/jean.jpg" },
    { name: "Sneaker Ayakkabı", description: "Konforlu", price: "799.00", image: "/sneaker.jpg" },
    { name: "Deri Omuz Çantası", description: "Şık çanta", price: "699.00", image: "/deriomuzcantasi.jpg" },
    { name: "Mini Etek", description: "Şık etek", price: "359.00", image: "/minietek.jpg" },
    { name: "Topuklu Ayakkabı", description: "Şık ayakkabı", price: "675.00", image: "/topukluayakkabi.jpg" },
    { name: "Sırt Çantası", description: "Rahat", price: "899.00", image: "/sirtcantasi.jpg" },
    { name: "Çiçekli Elbise", description: "Şık elbise", price: "500.00", image: "/ciceklielbise.jpg" },
    { name: "Elbise", description: "elbise", price: "400.00", image: "/ciceklielbise.jpg" },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { name: p.name },        // name alanı UNIQUE olmalı
      update: {
        description: p.description,
        price: p.price,
        image: p.image,
      },
      create: p,
    });
  }

  console.log("✅ Ürünler upsert ile güncellendi/eklendi");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error("❌ Seed hatası:", e);
    process.exit(1);
  });
