// routes/billing.js
// Stripe billing and subscriptions

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { log, error } = require('../utils/logger');
const {
    createCheckoutSession,
    createPortalSession,
    verifyWebhookSignature,
    getSubscription
} = require('../utils/stripe');

/**
 * POST /api/stripe/create-checkout-session (BUG 4)
 * Create Stripe checkout session for all plans
 */
router.post('/create-checkout-session', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { plan } = req.body;

        // BUG 4: Support all plans
        if (!['starter', 'pro', 'enterprise'].includes(plan)) {
            return res.status(400).json({ 
                success: false,
                error: 'Invalid plan selected',
                message: 'Plan must be starter, pro, or enterprise'
            });
        }

        // Get user email
        const userResult = await db.query(
            'SELECT email, full_name FROM public.users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'User not found' 
            });
        }

        const userEmail = userResult.rows[0].email;
        const userName = userResult.rows[0].full_name || 'Customer';

        // Create checkout session
        const session = await createCheckoutSession(userId, userEmail, plan);

        res.json({
            success: true,
            sessionId: session.id,
            url: session.url
        });
    } catch (err) {
        error('Create checkout error:', err);
        res.status(500).json({ 
            success: false,
            error: 'Failed to create checkout session', 
            message: err.message 
        });
    }
});

/**
 * POST /api/billing/create-checkout (legacy endpoint)
 */
router.post('/create-checkout', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { plan } = req.body;

        if (!['starter', 'pro', 'enterprise'].includes(plan)) {
            return res.status(400).json({ error: 'Invalid plan selected' });
        }

        const userResult = await db.query(
            'SELECT email FROM public.users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userEmail = userResult.rows[0].email;
        const session = await createCheckoutSession(userId, userEmail, plan);

        res.json({
            success: true,
            sessionId: session.id,
            url: session.url
        });
    } catch (err) {
        error('Create checkout error:', err);
        res.status(500).json({ error: 'Failed to create checkout session', message: err.message });
    }
});

/**
 * GET /api/billing/payment-history (BUG 4)
 * Get payment history for user
 */
router.get('/payment-history', async (req, res) => {
    try {
        const userId = req.user.userId;

        // Try to get from payment_history table first
        let paymentHistory = [];
        try {
            const historyResult = await db.query(
                `SELECT stripe_invoice_id, amount, currency, plan, status, paid_at
                 FROM public.payment_history
                 WHERE user_id = $1
                 ORDER BY paid_at DESC
                 LIMIT 50`,
                [userId]
            );
            paymentHistory = historyResult.rows.map(row => ({
                invoice_id: row.stripe_invoice_id,
                amount: parseFloat(row.amount),
                currency: row.currency || 'usd',
                plan: row.plan,
                status: row.status,
                date: row.paid_at
            }));
        } catch (err) {
            // If table doesn't exist, try to get from Stripe API
            log('Payment history table not found, fetching from Stripe');
            
            const stripeResult = await db.query(
                'SELECT stripe_customer_id FROM public.stripe_customers WHERE user_id = $1',
                [userId]
            );

            if (stripeResult.rows.length > 0) {
                const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
                const invoices = await stripe.invoices.list({
                    customer: stripeResult.rows[0].stripe_customer_id,
                    limit: 50
                });

                paymentHistory = invoices.data.map(invoice => ({
                    invoice_id: invoice.id,
                    amount: invoice.amount_paid / 100,
                    currency: invoice.currency,
                    plan: invoice.metadata?.plan || 'unknown',
                    status: invoice.status,
                    date: new Date(invoice.created * 1000).toISOString()
                }));
            }
        }

        res.json({
            success: true,
            data: paymentHistory
        });
    } catch (err) {
        error('Get payment history error:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch payment history',
            message: err.message
        });
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
            'SELECT stripe_customer_id FROM public.stripe_customers WHERE user_id = $1',
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
    } catch (err) {
        error('Create portal error:', err);
        res.status(500).json({ error: 'Failed to create portal session' });
    }
});

/**
 * POST /api/stripe/webhook (BUG 4)
 * Stripe webhook handler with signature verification
 * Note: This should be registered WITHOUT auth middleware in server.js
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
        return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    try {
        // Verify webhook signature
        const event = verifyWebhookSignature(req.body, signature);

        log('Stripe webhook event:', event.type);

        // Handle different event types
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                await handleCheckoutComplete(session);
                break;
            }

            case 'payment_intent.succeeded':
            case 'invoice.payment_succeeded': {
                // BUG 4: Handle payment succeeded
                const invoice = event.data.object;
                await handlePaymentSucceeded(invoice);
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

            case 'invoice.payment_failed': {
                const invoice = event.data.object;
                log('Payment failed:', invoice.id);
                // TODO: Send email notification
                break;
            }

            default:
                log(`Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
    } catch (err) {
        error('Webhook error:', err);
        res.status(400).json({ error: 'Webhook error', message: err.message });
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

        log('Checkout completed for user:', userId);

        // Get subscription details
        const subscription = await getSubscription(subscriptionId);

        const plan = determinePlan(subscription);

        // Store in database
        await db.query(
            `INSERT INTO public.stripe_customers (user_id, stripe_customer_id, stripe_subscription_id, subscription_status, current_period_start, current_period_end)
             VALUES ($1, $2, $3, $4, to_timestamp($5), to_timestamp($6))
             ON CONFLICT (user_id) DO UPDATE SET
                stripe_subscription_id = EXCLUDED.stripe_subscription_id,
                subscription_status = EXCLUDED.subscription_status,
                current_period_start = EXCLUDED.current_period_start,
                current_period_end = EXCLUDED.current_period_end,
                updated_at = NOW()`,
            [userId, customerId, subscriptionId, subscription.status, subscription.current_period_start, subscription.current_period_end]
        );

        // BUG 4: Update user subscription plan and expires_at
        await db.query(
            `UPDATE public.users 
             SET subscription_tier = $1,
                 subscription_expires_at = to_timestamp($2),
                 updated_at = NOW()
             WHERE id = $3`,
            [plan, subscription.current_period_end, userId]
        );

        log(`User ${userId} upgraded to ${plan}, expires at: ${new Date(subscription.current_period_end * 1000)}`);
    } catch (err) {
        error('Handle checkout complete error:', err);
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
                'UPDATE public.users SET subscription_tier = $1 WHERE id = $2',
                [plan, userId]
            );

            log(`Subscription updated for user ${userId}: ${plan}`);
        }
    } catch (err) {
        error('Handle subscription update error:', err);
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
                'UPDATE public.users SET subscription_tier = $1 WHERE id = $2',
                ['free', userId]
            );

            log(`Subscription canceled for user ${userId}`);
        }
    } catch (err) {
        error('Handle subscription canceled error:', err);
    }
}

/**
 * Handle payment succeeded (BUG 4)
 */
async function handlePaymentSucceeded(invoice) {
    try {
        const subscriptionId = invoice.subscription;
        if (!subscriptionId) return;

        const subscription = await getSubscription(subscriptionId);
        const customerId = subscription.customer;

        // Find user by Stripe customer ID
        const result = await db.query(
            'SELECT user_id FROM public.stripe_customers WHERE stripe_customer_id = $1',
            [customerId]
        );

        if (result.rows.length === 0) {
            log('No user found for Stripe customer:', customerId);
            return;
        }

        const userId = result.rows[0].user_id;
        const plan = determinePlan(subscription);

        // Update subscription_expires_at
        await db.query(
            `UPDATE public.users 
             SET subscription_tier = $1,
                 subscription_expires_at = to_timestamp($2)
             WHERE id = $3`,
            [plan, subscription.current_period_end, userId]
        );

        // Record payment in history (if table exists)
        try {
            await db.query(
                `INSERT INTO public.payment_history (user_id, stripe_invoice_id, amount, currency, plan, status, paid_at)
                 VALUES ($1, $2, $3, $4, $5, 'succeeded', NOW())
                 ON CONFLICT (stripe_invoice_id) DO NOTHING`,
                [userId, invoice.id, invoice.amount_paid / 100, invoice.currency, plan]
            );
        } catch (err) {
            // Payment history table might not exist, create it
            log('Payment history table might not exist, skipping');
        }

        log(`Payment succeeded for user ${userId}, plan: ${plan}`);
    } catch (err) {
        error('Handle payment succeeded error:', err);
    }
}

/**
 * Determine plan from subscription (BUG 4: Support all plans)
 */
function determinePlan(subscription) {
    // Check price ID to determine plan
    const priceId = subscription.items?.data?.[0]?.price?.id;
    
    if (priceId === process.env.STRIPE_STARTER_PRICE_ID) {
        return 'starter';
    } else if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
        return 'pro';
    } else if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) {
        return 'enterprise';
    }
    
    // Fallback to amount
    const amount = subscription.items?.data?.[0]?.price?.unit_amount;
    if (amount === 2900) return 'starter';  // $29
    if (amount === 9900) return 'pro';      // $99
    if (amount === 29900) return 'enterprise'; // $299
    
    return 'free';
}

module.exports = router;
