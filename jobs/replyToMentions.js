const twitter = require('../services/twitter');
const openai = require('../services/openai');
const { retryWithBackoff } = require('../utils/retry');
const { readLastMentionId, writeLastMentionId } = require('../utils/fileUtils');
const { handleRateLimit, makeTwitterRequest } = require('../utils/rateLimit');

module.exports = {
    replyToMentions: async () => {
        try {
            const userId = await twitter.getUserId();
            if (!userId) {
                console.error("Unable to fetch User ID. Skipping mention replies.");
                return;
            }

            let lastProcessedId = readLastMentionId();
            console.log("Last processed mention ID:", lastProcessedId);

            const params = {
                max_results: 3, // Fetch fewer mentions per request
                "tweet.fields": ["author_id", "conversation_id"],
                expansions: ["author_id"],
            };
            if (lastProcessedId) {
                params.since_id = lastProcessedId;
            }

            const mentions = await makeTwitterRequest(async () =>
                twitter.userMentionTimeline(userId, params)
            );

            console.log("Fetched mentions:", JSON.stringify(mentions, null, 2));

            // Ensure mentions.data exists and is an array
            if (!mentions || !mentions.data || !Array.isArray(mentions.data)) {
                console.error("Invalid mentions data structure:", mentions);
                return;
            }

            if (mentions.data.length === 0) {
                console.log("No new mentions to process");
                return;
            }

            for (const mention of mentions.data) {
                try {
                    if (mention.id === lastProcessedId) continue;

                    const prompt = `Please provide a brief, friendly response to this tweet: ${mention.text}`;
                    const replyText = await openai.generateResponse(prompt);

                    if (!mention.id) {
                        console.warn("Invalid mention ID, skipping...");
                        continue;
                    }

                    await retryWithBackoff(async () =>
                        makeTwitterRequest(async () =>
                            twitter.replyToTweet(replyText, mention.id)
                        )
                    );

                    console.log(`Replied to mention ${mention.id}`);
                    lastProcessedId = mention.id;
                    writeLastMentionId(lastProcessedId);

                    await sleep(60000); // 60 seconds between replies
                } catch (error) {
                    console.error(`Error processing mention ${mention.id}:`, error);
                    if (await handleRateLimit(error)) continue;
                }
            }
        } catch (error) {
            console.error("Error in replyToMentions:", error);
        }
    },
};