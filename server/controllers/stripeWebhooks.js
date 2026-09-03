// controllers/stripeWebhooks.js
//
// Handles Stripe webhook events.
// Booking lookups now use Prisma instead of Mongoose.
//
// NOTE: bookingId in session.metadata is now a UUID string (set in stripePayment).
// Any Stripe sessions created pre-migration (with Mongo ObjectId booking IDs)
// will fail the Prisma findUnique lookup — this is an expected cutover artifact.

import stripe from 'stripe';
import prisma from '../configs/db.js';

export const stripeWebhooks = async (request, response) => {
    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
    const sig = request.headers['stripe-signature'];
    let event;

    try {
        event = stripeInstance.webhooks.constructEvent(
            request.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return response.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log('Webhook event received:', event.type);

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const { bookingId } = session.metadata;

        console.log('Processing payment for booking:', bookingId);

        // ── Idempotency check ────────────────────────────────────────────────
        // Stripe can redeliver the same event. If the booking is already marked
        // paid and confirmed, skip the update to avoid re-triggering any side
        // effects (e.g. confirmation emails added in the future).
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
        });

        if (!booking) {
            console.error(`[stripeWebhooks] Booking ${bookingId} not found — skipping.`);
            return response.json({ received: true });
        }

        if (booking.isPaid && booking.status === 'confirmed') {
            console.log(`[stripeWebhooks] Duplicate delivery for booking ${bookingId} — already paid & confirmed, skipping update.`);
            return response.json({ received: true });
        }

        // ── Apply payment + confirmation ─────────────────────────────────────
        await prisma.booking.update({
            where: { id: bookingId },
            data: {
                isPaid: true,
                paymentMethod: 'Stripe',
                status: 'confirmed',   // set alongside isPaid so state is consistent
            },
        });

        console.log('Booking marked as paid and confirmed:', bookingId);

    } else {
        console.log(`Unhandled event type ${event.type}`);
    }

    response.json({ received: true });
};