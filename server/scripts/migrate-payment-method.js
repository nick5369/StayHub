import prisma from '../configs/db.js';

async function migrate() {
    const updated = await prisma.$executeRaw`UPDATE "Booking" SET "paymentMethod" = 'STRIPE' WHERE "paymentMethod"::text = 'PAY_AT_HOTEL'`;
    console.log('Updated PAY_AT_HOTEL rows to STRIPE:', updated);
    await prisma.$disconnect();
}

migrate().catch(e => { console.error(e); process.exit(1); });
