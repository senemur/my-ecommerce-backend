/// <reference types="node" />
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.product.createMany({
    data: [
      { name: "Oversize T-Shirt", description: "Pamuklu", price: "249.90", image: "/tshirt.jpg" }, 
      { name: "Yüksek Bel Jean", description: "Kot pantolon", price: "499.00", image: "/tshirt.jpg" },
      { name: "Sneaker Ayakkabı", description: "Konforlu", price: "799.00", image: "/tshirt.jpg" },
      { name: "Deri Omuz Çantası", description: "Şık çanta", price: "699.00", image: "/tshirt.jpg" },
    ]
  });
  console.log('✅ Seed verileri başarıyla eklendi');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('❌ Seed hatası:', e);
    process.exit(1);
  });
