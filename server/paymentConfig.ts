import { storage } from './storage';

// Payment provider initialization data
const DEFAULT_PAYMENT_PROVIDERS = [
  {
    provider: 'stripe',
    displayName: 'Credit/Debit Card',
    isEnabled: false, // Disabled by default - admin must configure
    sortOrder: 1,
    apiSettings: {
      publicKey: '',
      secretKey: '',
      webhookSecret: ''
    },
    uiConfig: {
      icon: 'credit-card',
      color: '#635bff',
      description: 'Pay with credit or debit card'
    }
  },
  {
    provider: 'paypal',
    displayName: 'PayPal',
    isEnabled: false, // Disabled by default - admin must configure
    sortOrder: 2,
    apiSettings: {
      clientId: '',
      clientSecret: '',
      environment: 'sandbox'
    },
    uiConfig: {
      icon: 'paypal',
      color: '#0070ba',
      description: 'Pay with PayPal'
    }
  },
  {
    provider: 'binance_pay',
    displayName: 'Binance Pay',
    isEnabled: false, // Disabled by default - admin must configure
    sortOrder: 3,
    apiSettings: {
      apiKey: '',
      secretKey: '',
      merchantId: ''
    },
    uiConfig: {
      icon: 'binance',
      color: '#f3ba2f',
      description: 'Pay with Binance Pay'
    }
  },
  {
    provider: 'cryptomus',
    displayName: 'Cryptomus',
    isEnabled: false, // Disabled by default - admin must configure
    sortOrder: 4,
    apiSettings: {
      apiKey: '',
      merchantId: '',
      environment: 'sandbox'
    },
    uiConfig: {
      icon: 'crypto',
      color: '#2196f3',
      description: 'Pay with cryptocurrency'
    }
  }
];

class PaymentConfigManager {
  private initialized = false;

  async initializeDefaultProviders() {
    if (this.initialized) return;
    
    try {
      // Check if providers already exist
      const existingProviders = await storage.getAllPaymentProviders();
      
      if (existingProviders.length === 0) {
        console.log('Initializing default payment providers...');
        
        // Initialize default providers in database
        for (const providerData of DEFAULT_PAYMENT_PROVIDERS) {
          await storage.createPaymentProvider(providerData);
        }
        
        console.log('Default payment providers initialized successfully');
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize payment providers:', error);
    }
  }

  async getAllProviders() {
    await this.initializeDefaultProviders();
    return await storage.getAllPaymentProviders();
  }

  async getEnabledProviders() {
    await this.initializeDefaultProviders();
    return await storage.getEnabledPaymentProviders();
  }

  async getProvider(providerName: string) {
    await this.initializeDefaultProviders();
    const providers = await storage.getAllPaymentProviders();
    return providers.find(p => p.provider === providerName);
  }

  async updateProvider(providerName: string, updates: any) {
    return await storage.updatePaymentProvider(providerName, updates);
  }

  async enableProvider(providerName: string) {
    return await storage.setPaymentProviderEnabled(providerName, true);
  }

  async disableProvider(providerName: string) {
    return await storage.setPaymentProviderEnabled(providerName, false);
  }

  async isProviderConfigured(providerName: string): Promise<boolean> {
    const provider = await this.getProvider(providerName);
    if (!provider || !provider.apiSettings) return false;

    const settings = provider.apiSettings as any;

    switch (providerName) {
      case 'stripe':
        return !!(settings.publicKey && settings.secretKey);
      case 'binance_pay':
        return !!(settings.apiKey && settings.secretKey);
      case 'paypal':
        return !!(settings.clientId && settings.clientSecret);
      case 'cryptomus':
        return !!(settings.apiKey && settings.merchantId);
      default:
        return false;
    }
  }
}

export const paymentConfig = new PaymentConfigManager();
