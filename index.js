const cron = require('node-cron');
const { postTopGainers } = require('./jobs/topGainers');
const { postMarketTrends } = require('./jobs/marketTrends');
const { postCryptoNews } = require('./jobs/cryptoNews');
const { replyToMentions } = require('./jobs/replyToMentions');

// Cron schedules
cron.schedule('*/30 * * * *', async () => {  // Every 30 minutes
    try {
        console.log("Posting top gainers...");
        await retryWithBackoff(postTopGainers);
    } catch (error) {
        console.error("Error in top gainers cron job:", error);
    }
});

cron.schedule('0 */2 * * *', async () => {  // Every 2 hours
    try {
        console.log("Posting market trends...");
        await retryWithBackoff(postMarketTrends);
    } catch (error) {
        console.error("Error in market trends cron job:", error);
    }
});

cron.schedule('*/30 * * * *', async () => {  // Every 30 minutes
    try {
        console.log("Posting crypto news...");
        await retryWithBackoff(postCryptoNews);
    } catch (error) {
        console.error("Error in crypto news cron job:", error);
    }
});

cron.schedule('*/10 * * * *', async () => {  // Every 10 minutes
    try {
        console.log("Checking mentions...");
        await retryWithBackoff(replyToMentions);
    } catch (error) {
        console.error("Error in mentions cron job:", error);
    }
});

// Start the bot
console.log("XeroBot is running...");