require('dotenv').config();

module.exports = {
    twitter: {
        appKey: process.env.TWITTER_API_KEY,
        appSecret: process.env.TWITTER_API_SECRET,
        accessToken: process.env.TWITTER_ACCESS_TOKEN,
        accessSecret: process.env.TWITTER_ACCESS_SECRET,
    },
    openai: {
        apiKey: process.env.OPENAI_API_KEY,
    },
    cryptocompare: {
        apiKey: process.env.CRYPTOCOMPARE_API_KEY,
    },
};