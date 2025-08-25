// BFF Server Configuration
require('dotenv').config();

module.exports = {
    stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_51RmYiIRhh0YbRyvV9bJG7N3v'
    },
    server: {
        port: process.env.PORT || 8080
    },
    environment: process.env.NODE_ENV || 'development',
    
    // デフォルトのStripe設定
    stripeDefaults: {
        successUrl: 'https://effulgent-marzipan-17f896.netlify.app/success.html',
        cancelUrl: 'https://effulgent-marzipan-17f896.netlify.app/cancel.html',
        defaultPriceId: 'price_1RmYiIRhh0YbRyvV9bJG7N3v'
    }
};
