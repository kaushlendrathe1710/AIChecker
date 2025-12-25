import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';
import Stripe from 'stripe';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);
    
    const stripe = await getUncachableStripeClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.log('No STRIPE_WEBHOOK_SECRET set, skipping local processing');
      return;
    }
    
    try {
      const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      await WebhookHandlers.handleEvent(event);
    } catch (err) {
      console.log('Could not verify webhook signature for local processing, using sync only');
    }
  }

  static async handleEvent(event: Stripe.Event): Promise<void> {
    console.log(`Processing Stripe event: ${event.type}`);
    
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await WebhookHandlers.handleCheckoutCompleted(session);
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await WebhookHandlers.handleSubscriptionUpdated(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await WebhookHandlers.handleSubscriptionDeleted(subscription);
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  static async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.metadata?.userId;
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;
    
    if (!userId) {
      console.log('No userId in session metadata, cannot update user');
      return;
    }
    
    const stripe = await getUncachableStripeClient();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0]?.price.id;
    const productId = subscription.items.data[0]?.price.product as string;
    const product = await stripe.products.retrieve(productId);
    
    await storage.updateUserStripeInfo(userId, {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      subscriptionStatus: subscription.status,
      subscriptionPlan: product.name,
    });
    
    console.log(`Updated user ${userId} with subscription ${subscriptionId}`);
  }

  static async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const customerId = subscription.customer as string;
    
    const stripe = await getUncachableStripeClient();
    const productId = subscription.items.data[0]?.price.product as string;
    const product = await stripe.products.retrieve(productId);
    
    const users = await storage.getAllUsers();
    const user = users.find(u => u.stripeCustomerId === customerId);
    
    if (user) {
      await storage.updateUserStripeInfo(user.id, {
        subscriptionStatus: subscription.status,
        subscriptionPlan: product.name,
      });
      console.log(`Updated subscription status for user ${user.id}`);
    }
  }

  static async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const customerId = subscription.customer as string;
    
    const users = await storage.getAllUsers();
    const user = users.find(u => u.stripeCustomerId === customerId);
    
    if (user) {
      await storage.updateUserStripeInfo(user.id, {
        subscriptionStatus: 'canceled',
        subscriptionPlan: null as any,
        stripeSubscriptionId: null as any,
      });
      console.log(`Cleared subscription for user ${user.id}`);
    }
  }
}
