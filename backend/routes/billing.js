// routes/billing.js
// Stripe billing and subscriptions

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const {
    createCheckoutSession,
    createPortalSession,
    verifyWebhookSignature,
    getSubscription
} = require('../utils/stripe');

/**
 * POST /api/billing/create-checkout
 * Create Stripe checkout session
 */
router.post('/create-checkout', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { plan } = req.body;

        if (!['pro', 'enterprise'].includes(plan)) {
            return res.status(400).json({ error: 'Invalid plan selected' });
        }

        // Get user email
        const userResult = await db.query(
            'SELECT email FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userEmail = userResult.rows[0].email;

        // Create checkout session
        const session = await createCheckoutSession(userId, userEmail, plan);

        res.json({
            success: true,
            sessionId: session.id,
            url: session.url
        });
    } catch (error) {
        console.error('Create checkout error:', error);
        res.status(500).json({ error: 'Failed to create checkout session', message: error.message });
    }
});

/**
 * POST /api/billing/portal
 * Create customer portal session
 */
router.post('/portal', async (req, res) => {
    try {
        const userId = req.user.userId;

        // Get Stripe customer ID
        const result = await db.query(
            'SELECT stripe_customer_id FROM stripe_customers WHERE user_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No active subscription found' });
        }

        const stripeCustomerId = result.rows[0].stripe_customer_id;

        // Create portal session
        const session = await createPortalSession(stripeCustomerId);

        res.json({
            success: true,
            url: session.url
        });
    } catch (error) {
        console.error('Create portal error:', error);
        res.status(500).json({ error: 'Failed to create portal session' });
    }
});

/**
 * POST /api/billing/webhook
 * Stripe webhook handler
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const signature = req.headers['stripe-signature'];

    try {
        // Verify webhook signature
        const event = verifyWebhookSignature(req.body, signature);

        console.log('Stripe webhook event:', event.type);

        // Handle different event types
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                await handleCheckoutComplete(session);
                break;
            }

            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const subscription = event.data.object;
                await handleSubscriptionUpdate(subscription);
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                await handleSubscriptionCanceled(subscription);
                break;
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object;
                console.log('Payment succeeded:', invoice.id);
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object;
                console.log('Payment failed:', invoice.id);
                // TODO: Send email notification
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(400).json({ error: 'Webhook error', message: error.message });
    }
});

/**
 * Handle checkout session completed
 */
async function handleCheckoutComplete(session) {
    try {
        const userId = session.client_reference_id || session.metadata.userId;
        const customerId = session.customer;
        const subscriptionId = session.subscription;

        console.log('Checkout completed for user:', userId);

        // Get subscription details
        const subscription = await getSubscription(subscriptionId);

        const plan = determinePlan(subscription);

        // Store in database
        await db.query(
            `INSERT INTO stripe_customers (user_id, stripe_customer_id, stripe_subscription_id, subscription_status, current_period_start, current_period_end)
             VALUES ($1, $2, $3, $4, to_timestamp($5), to_timestamp($6))
             ON CONFLICT (user_id) DO UPDATE SET
                stripe_subscription_id = EXCLUDED.stripe_subscription_id,
                subscription_status = EXCLUDED.subscription_status,
                current_period_start = EXCLUDED.current_period_start,
                current_period_end = EXCLUDED.current_period_end,
                updated_at = NOW()`,
            [userId, customerId, subscriptionId, subscription.status, subscription.current_period_start, subscription.current_period_end]
        );

        // Update user subscription plan
        await db.query(
            'UPDATE users SET subscription_plan = $1 WHERE id = $2',
            [plan, userId]
        );

        console.log(`User ${userId} upgraded to ${plan}`);
    } catch (error) {
        console.error('Handle checkout complete error:', error);
    }
}

/**
 * Handle subscription update
 */
async function handleSubscriptionUpdate(subscription) {
    try {
        const customerId = subscription.customer;
        const subscriptionId = subscription.id;

        const plan = determinePlan(subscription);

        // Update database
        const result = await db.query(
            `UPDATE stripe_customers 
             SET subscription_status = $1,
                 current_period_start = to_timestamp($2),
                 current_period_end = to_timestamp($3),
                 cancel_at_period_end = $4,
                 updated_at = NOW()
             WHERE stripe_customer_id = $5
             RETURNING user_id`,
            [subscription.status, subscription.current_period_start, subscription.current_period_end, subscription.cancel_at_period_end, customerId]
        );

        if (result.rows.length > 0) {
            const userId = result.rows[0].user_id;
            
            // Update user plan
            await db.query(
                'UPDATE users SET subscription_plan = $1 WHERE id = $2',
                [plan, userId]
            );

            console.log(`Subscription updated for user ${userId}: ${plan}`);
        }
    } catch (error) {
        console.error('Handle subscription update error:', error);
    }
}

/**
 * Handle subscription canceled
 */
async function handleSubscriptionCanceled(subscription) {
    try {
        const customerId = subscription.customer;

        const result = await db.query(
            `UPDATE stripe_customers 
             SET subscription_status = 'canceled',
                 updated_at = NOW()
             WHERE stripe_customer_id = $1
             RETURNING user_id`,
            [customerId]
        );

        if (result.rows.length > 0) {
            const userId = result.rows[0].user_id;
            
            // Downgrade to free
            await db.query(
                'UPDATE users SET subscription_plan = $1 WHERE id = $2',
                ['free', userId]
            );

            console.log(`Subscription canceled for user ${userId}`);
        }
    } catch (error) {
        console.error('Handle subscription canceled error:', error);
    }
}

/**
 * Determine plan from subscription
 */
function determinePlan(subscription) {
    // Check price ID or amount to determine plan
    const priceId = subscription.items.data[0].price.id;
    
    if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
        return 'pro';
    } else if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) {
        return 'enterprise';
    }
    
    // Fallback to amount
    const amount = subscription.items.data[0].price.unit_amount;
    if (amount === 2900) return 'pro';      // $29
    if (amount === 9900) return 'enterprise'; // $99
    
    return 'free';
}

module.exports = router;
