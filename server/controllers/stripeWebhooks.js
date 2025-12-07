import { request, response } from 'express';
import stripe from 'stripe';
import Booking from '../models/Booking.js';

export const stripeWebhooks = async(request,response) =>{
    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
    const sig = request.headers['stripe-signature'];
    let event;
    try {
        event = stripeInstance.webhooks.constructEvent(request.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return response.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log('Webhook event received:', event.type);

    if(event.type === 'checkout.session.completed'){
        const session = event.data.object;
        const {bookingId} = session.metadata;
        
        console.log('Processing payment for booking:', bookingId);
        
        await Booking.findByIdAndUpdate(bookingId,{isPaid:true, paymentMethod:"Stripe"});
        console.log('Booking marked as paid:', bookingId);

    }else {
        console.log(`Unhandled event type ${event.type}`);
    }
    response.json({received:true});
}