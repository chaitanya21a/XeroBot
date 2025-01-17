const cryptocompare = require('../services/cryptocompare');
const twitter = require('../services/twitter');
const { retryWithBackoff } = require('../utils/retry');

module.exports = {
    postCryptoNews: async () => {
        try {
            const cryptoNews = await cryptocompare.fetchCryptoNews();
            if (cryptoNews.length === 0) {
                console.log("No crypto news to post.");
                return;
            }

            let tweetText = "📰 Latest Crypto News:\n";
            cryptoNews.forEach((article, index) => {
                tweetText += `${index + 1}. ${article.title}\n${article.url}\n`;
            });

            await retryWithBackoff(async () => twitter.postTweet(tweetText));
        } catch (error) {
            console.error("Error posting crypto news:", error);
        }
    },
};