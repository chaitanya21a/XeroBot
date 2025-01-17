const coingecko = require('../services/coingecko');
const twitter = require('../services/twitter');
const { retryWithBackoff } = require('../utils/retry');

module.exports = {
    postTopGainers: async () => {
        try {
            const topGainers = await coingecko.fetchTopGainers();
            if (topGainers.length === 0) {
                console.log("No top gainers to post.");
                return;
            }

            let tweetText = "🚀 Top Crypto Gainers (24h):\n";
            topGainers.slice(0, 3).forEach((coin, index) => {
                tweetText += `${index + 1}. ${coin.symbol}: ${coin.change.toFixed(2)}%\n`;
            });

            await retryWithBackoff(async () => twitter.postTweet(tweetText));
        } catch (error) {
            console.error("Error posting top gainers:", error);
        }
    },
};