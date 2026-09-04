import cron from 'node-cron';
import prisma from '../configs/db.js';

export const startInventoryCron = () => {
    // Run every day at midnight
    cron.schedule('0 0 * * *', async () => {
        console.log('[Cron] Running daily inventory generation...');
        try {
            const today = new Date();
            today.setUTCHours(0, 0, 0, 0);
            
            // The date exactly 365 days in the future
            const targetDate = new Date(today);
            targetDate.setUTCDate(today.getUTCDate() + 365);

            // Find all room types
            const roomTypes = await prisma.roomType.findMany({
                include: {
                    // Get the most recent inventory to know the totalRooms
                    inventory: {
                        orderBy: { date: 'desc' },
                        take: 1
                    }
                }
            });

            const newInventoryData = [];

            for (const rt of roomTypes) {
                if (rt.inventory && rt.inventory.length > 0) {
                    const latestInventory = rt.inventory[0];
                    
                    newInventoryData.push({
                        roomTypeId: rt.id,
                        date: targetDate,
                        totalRooms: latestInventory.totalRooms,
                        bookedRooms: 0
                    });
                }
            }

            if (newInventoryData.length > 0) {
                // Using skipDuplicates ensures if the job runs multiple times or manual 
                // records exist, it won't crash the server.
                const result = await prisma.roomTypeInventory.createMany({
                    data: newInventoryData,
                    skipDuplicates: true
                });
                console.log(`[Cron] Successfully created ${result.count} inventory records for ${targetDate.toISOString()}`);
            } else {
                console.log('[Cron] No inventory records to create.');
            }

        } catch (error) {
            console.error('[Cron] Error generating daily inventory:', error);
        }
    });
    
    console.log('Rolling inventory cron job initialized.');
};
