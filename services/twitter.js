const { TwitterApi } = require('twitter-api-v2');
const config = require('../config');

const twitterClient = new TwitterApi(config.twitter);

module.exports = {
    postTweet: async (message) => {
        const truncatedMessage = message.slice(0, 280);
        const tweet = await twitterClient.v2.tweet(truncatedMessage);
        return tweet;
    },
    getUserId: async () => '1880172400161222657', // Hardcoded Twitter ID
    userMentionTimeline: async (userId, params) => {
        return twitterClient.v2.userMentionTimeline(userId, params);
    },
    replyToTweet: async (replyText, tweetId) => {
        return twitterClient.v2.reply(replyText, tweetId);
    },
};