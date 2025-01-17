const cron = require('node-cron');
const { postTopGainers } = require('./jobs/topGainers');
const { postMarketTrends } = require('./jobs/marketTrends');
const { postCryptoNews } = require('./jobs/cryptoNews');
const { replyToMentions } = require('./jobs/replyToMentions');

// Cron schedules
cron.schedule('*/15 * * * *', async () => {
    try {
        console.log("Posting top gainers...");
        await postTopGainers();
    } catch (error) {
        console.error("Error in top gainers cron job:", error);
    }
});

cron.schedule('0 * * * *', async () => {
    try {
        console.log("Posting market trends...");
        await postMarketTrends();
    } catch (error) {
        console.error("Error in market trends cron job:", error);
    }
});

cron.schedule('*/30 * * * *', async () => {
    try {
        console.log("Posting crypto news...");
        await postCryptoNews();
    } catch (error) {
        console.error("Error in crypto news cron job:", error);
    }
});

cron.schedule('*/2 * * * *', async () => {
    try {
        console.log("Checking mentions...");
        await replyToMentions();
    } catch (error) {
        console.error("Error in mentions cron job:", error);
    }
});

// Start the bot
console.log("XeroBot is running...");