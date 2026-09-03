// controllers/stripeWebhooks.js
//
// Handles Stripe webhook events.
// Booking lookups now use Prisma instead of Mongoose.
//
// NOTE: bookingId in session.metadata is now a UUID string (set in stripePayment).
// Any Stripe sessions created pre-migration (with Mongo ObjectId booking IDs)
// will fail the Prisma findUnique lookup — this is an expected cutover artifact.
//
// Handled events:
//   - checkout.session.completed  → preferred; metadata.bookingId is directly available
//   - payment_intent.succeeded    → fallback; we retrieve the checkout session to get metadata

import stripe from 'stripe';
import prisma from '../configs/db.js';

// ── Shared helper ─────────────────────────────────────────────────────────────
async function confirmBookingPaid(bookingId, paymentIntentId) {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

    if (!booking) {
        console.error(`[stripeWebhooks] Booking ${bookingId} not found — skipping.`);
        return;
    }

    if (booking.isPaid && booking.status === 'confirmed') {
        console.log(`[stripeWebhooks] Duplicate delivery for booking ${bookingId} — already paid & confirmed, skipping update.`);
        return;
    }

    await prisma.booking.update({
        where: { id: bookingId },
        data: {
            isPaid: true,
            paymentMethod: 'STRIPE',
            status: 'confirmed',
            stripePaymentIntent: paymentIntentId,
        },
    });

    console.log(`[stripeWebhooks] Booking ${bookingId} marked as paid and confirmed.`);
}

// ── Webhook handler ───────────────────────────────────────────────────────────
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
        // ── Preferred path: metadata is directly on the session ──────────────
        const session = event.data.object;
        const { bookingId } = session.metadata;
        const paymentIntentId = session.payment_intent;
        console.log('Processing checkout.session.completed for booking:', bookingId);
        await confirmBookingPaid(bookingId, paymentIntentId);

    } else if (event.type === 'payment_intent.succeeded') {
        // ── Fallback path ─────────────────────────────────────────────────────
        // Stripe sends this when the payment_intent inside a checkout session
        // succeeds. The bookingId is NOT on the payment_intent directly — we
        // must retrieve the linked checkout session to access metadata.
        const paymentIntent = event.data.object;

        const sessions = await stripeInstance.checkout.sessions.list({
            payment_intent: paymentIntent.id,
            limit: 1,
        });

        const session = sessions.data[0];

        if (!session) {
            console.error(`[stripeWebhooks] No checkout session found for payment_intent ${paymentIntent.id}`);
            return response.json({ received: true });
        }

        const { bookingId } = session.metadata || {};

        if (!bookingId) {
            console.error(`[stripeWebhooks] No bookingId in session metadata for payment_intent ${paymentIntent.id}`);
            return response.json({ received: true });
        }

        console.log('Processing payment_intent.succeeded for booking:', bookingId);
        await confirmBookingPaid(bookingId, paymentIntent.id);

    } else {
        console.log(`[stripeWebhooks] Unhandled event type: ${event.type}`);
    }

    response.json({ received: true });
};