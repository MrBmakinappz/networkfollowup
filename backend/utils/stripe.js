// utils/stripe.js
// Stripe payment utilities

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Create Stripe checkout session
 */
async function createCheckoutSession(userId, userEmail, plan) {
    try {
        const prices = {
            pro: process.env.STRIPE_PRO_PRICE_ID || 'price_pro',
            enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise'
        };

        if (!prices[plan]) {
            throw new Error('Invalid plan selected');
        }

        const session = await stripe.checkout.sessions.create({
            customer_email: userEmail,
            client_reference_id: userId,
            line_items: [
                {
                    price: prices[plan],
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${process.env.FRONTEND_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}&success=true`,
            cancel_url: `${process.env.FRONTEND_URL}/dashboard?canceled=true`,
            metadata: {
                userId: userId,
                plan: plan
            }
        });

        return session;
    } catch (error) {
        console.error('Stripe checkout error:', error);
        throw new Error(`Failed to create checkout session: ${error.message}`);
    }
}

/**
 * Create customer portal session
 */
async function createPortalSession(stripeCustomerId) {
    try {
        const session = await stripe.billingPortal.sessions.create({
            customer: stripeCustomerId,
            return_url: `${process.env.FRONTEND_URL}/dashboard`,
        });

        return session;
    } catch (error) {
        console.error('Stripe portal error:', error);
        throw new Error(`Failed to create portal session: ${error.message}`);
    }
}

/**
 * Verify webhook signature
 */
function verifyWebhookSignature(payload, signature) {
    try {
        const event = stripe.webhooks.constructEvent(
            payload,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );
        return event;
    } catch (error) {
        console.error('Webhook signature verification failed:', error);
        throw new Error('Invalid signature');
    }
}

/**
 * Get subscription details
 */
async function getSubscription(subscriptionId) {
    try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        return subscription;
    } catch (error) {
        console.error('Get subscription error:', error);
        throw new Error('Failed to fetch subscription');
    }
}

/**
 * Cancel subscription
 */
async function cancelSubscription(subscriptionId) {
    try {
        const subscription = await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true
        });
        return subscription;
    } catch (error) {
        console.error('Cancel subscription error:', error);
        throw new Error('Failed to cancel subscription');
    }
}

module.exports = {
    createCheckoutSession,
    createPortalSession,
    verifyWebhookSignature,
    getSubscription,
    cancelSubscription
};
