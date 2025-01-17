const coingecko = require('../services/coingecko');
const twitter = require('../services/twitter');
const { retryWithBackoff } = require('../utils/retry');

module.exports = {
    postMarketTrends: async () => {
        try {
            const marketTrends = await coingecko.fetchMarketTrends();
            if (!marketTrends) {
                console.log("No market trends to post.");
                return;
            }

            let tweetText = "🌍 Market Trends:\n";
            tweetText += `- Total Market Cap: $${(marketTrends.totalMarketCap / 1e12).toFixed(2)}T\n`;
            tweetText += `- Bitcoin Dominance: ${marketTrends.bitcoinDominance.toFixed(1)}%`;

            await retryWithBackoff(async () => twitter.postTweet(tweetText));
        } catch (error) {
            console.error("Error posting market trends:", error);
        }
    },
};