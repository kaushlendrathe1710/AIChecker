import { getUncachableStripeClient } from './stripeClient';

async function seedProducts() {
  console.log('Starting product seeding...');
  
  const stripe = await getUncachableStripeClient();

  const existingProducts = await stripe.products.search({ query: "name:'Pro Plan'" });
  if (existingProducts.data.length > 0) {
    console.log('Products already exist, skipping seed');
    return;
  }

  console.log('Creating Free Plan...');
  const freePlan = await stripe.products.create({
    name: 'Free Plan',
    description: 'Basic plagiarism detection with limited scans',
    metadata: {
      tier: 'free',
      scansPerMonth: '5',
      features: 'Basic AI detection, 5 scans/month',
    },
  });

  await stripe.prices.create({
    product: freePlan.id,
    unit_amount: 0,
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { planName: 'Free' },
  });

  console.log('Creating Pro Plan...');
  const proPlan = await stripe.products.create({
    name: 'Pro Plan',
    description: 'Professional plagiarism detection with unlimited scans',
    metadata: {
      tier: 'pro',
      scansPerMonth: 'unlimited',
      features: 'Unlimited scans, Advanced AI detection, Grammar checking, Priority support',
    },
  });

  await stripe.prices.create({
    product: proPlan.id,
    unit_amount: 1999,
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { planName: 'Pro Monthly' },
  });

  await stripe.prices.create({
    product: proPlan.id,
    unit_amount: 19999,
    currency: 'usd',
    recurring: { interval: 'year' },
    metadata: { planName: 'Pro Yearly' },
  });

  console.log('Creating Enterprise Plan...');
  const enterprisePlan = await stripe.products.create({
    name: 'Enterprise Plan',
    description: 'Enterprise-grade plagiarism detection for organizations',
    metadata: {
      tier: 'enterprise',
      scansPerMonth: 'unlimited',
      features: 'Unlimited scans, API access, Dedicated support, Custom integrations, Team management',
    },
  });

  await stripe.prices.create({
    product: enterprisePlan.id,
    unit_amount: 9999,
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { planName: 'Enterprise Monthly' },
  });

  await stripe.prices.create({
    product: enterprisePlan.id,
    unit_amount: 99999,
    currency: 'usd',
    recurring: { interval: 'year' },
    metadata: { planName: 'Enterprise Yearly' },
  });

  console.log('Products created successfully!');
}

seedProducts()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed to seed products:', err);
    process.exit(1);
  });
