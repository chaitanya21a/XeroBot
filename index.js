require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');
const OpenAI = require('openai');
const cron = require('node-cron');
const axios = require('axios');
const fs = require('fs');

// Initialize Twitter client
const twitterClient = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Rate limiting state
const rateLimits = {
    lastReset: Date.now(),
    requestsRemaining: 50,
    resetTime: Date.now() + (15 * 60 * 1000)
};

// Utility functions
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Rate limit handler
async function handleRateLimit(error) {
    if (error.code === 429) {
        const resetTime = error.rateLimit?.reset * 1000 || (Date.now() + 15 * 60 * 1000);
        const waitTime = resetTime - Date.now() + 1000;
        console.log(`Rate limited. Waiting ${Math.round(waitTime / 1000)} seconds until ${new Date(resetTime).toISOString()}`);
        await sleep(waitTime);
        return true;
    }
    return false;
}

// Improved API request wrapper with rate limiting
async function makeTwitterRequest(requestFn) {
    try {
        if (rateLimits.requestsRemaining <= 1) {
            const timeUntilReset = rateLimits.resetTime - Date.now();
            if (timeUntilReset > 0) {
                console.log(`Preemptively waiting for rate limit reset: ${Math.round(timeUntilReset / 1000)} seconds`);
                await sleep(timeUntilReset + 1000);
            }
        }

        const result = await requestFn();

        if (result.rateLimit) {
            rateLimits.requestsRemaining = result.rateLimit.remaining;
            rateLimits.resetTime = result.rateLimit.reset * 1000;
        }

        return result;
    } catch (error) {
        if (await handleRateLimit(error)) {
            return makeTwitterRequest(requestFn);
        }
        throw error;
    }
}

// Retry mechanism with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            const waitTime = Math.min(1000 * Math.pow(2, i), 15000);
            console.log(`Retry ${i + 1}/${maxRetries} after ${waitTime}ms`);
            await sleep(waitTime);
        }
    }
}

// Function to fetch top crypto gainers
async function fetchTopGainers() {
    try {
        const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
            params: {
                vs_currency: 'usd',
                order: 'price_change_percentage_24h_desc',
                per_page: 3,
                page: 1,
                sparkline: false
            }
        });
        return response.data.map(coin => ({
            name: coin.name,
            symbol: coin.symbol.toUpperCase(),
            price: coin.current_price,
            change: coin.price_change_percentage_24h
        }));
    } catch (error) {
        console.error("Error fetching top gainers:", error);
        return [];
    }
}

// Function to fetch market trends
async function fetchMarketTrends() {
    try {
        const response = await axios.get('https://api.coingecko.com/api/v3/global');
        const data = response.data.data;
        return {
            totalMarketCap: data.total_market_cap.usd,
            bitcoinDominance: data.market_cap_percentage.btc
        };
    } catch (error) {
        console.error("Error fetching market trends:", error);
        return null;
    }
}

// Function to fetch crypto news
async function fetchCryptoNews() {
    try {
        const response = await axios.get('https://min-api.cryptocompare.com/data/v2/news/', {
            params: {
                lang: 'EN',
                api_key: process.env.CRYPTOCOMPARE_API_KEY // Optional: Add your API key if you have one
            }
        });
        return response.data.Data.slice(0, 3).map(article => ({
            title: article.title,
            url: article.url
        }));
    } catch (error) {
        console.error("Error fetching crypto news:", error);
        return [];
    }
}

// Function to post a tweet
async function postTweet(message) {
    try {
        const truncatedMessage = message.slice(0, 280);
        const tweet = await makeTwitterRequest(async () =>
            twitterClient.v2.tweet(truncatedMessage)
        );
        console.log("Tweet posted:", tweet.data.text);
        return tweet;
    } catch (error) {
        console.error("Error posting tweet:", error);
        throw error;
    }
}

// Function to fetch Twitter User ID
async function getUserId() {
    return '1880172400161222657'; // Hardcoded Twitter ID
}

// Function to read the last processed mention ID
function readLastMentionId() {
    try {
        if (fs.existsSync('lastMentionId.txt')) {
            return fs.readFileSync('lastMentionId.txt', 'utf8').trim();
        }
    } catch (error) {
        console.error("Error reading last mention ID:", error);
    }
    return null;
}

// Function to write the last processed mention ID
function writeLastMentionId(mentionId) {
    try {
        fs.writeFileSync('lastMentionId.txt', mentionId.toString(), 'utf8');
    } catch (error) {
        console.error("Error writing last mention ID:", error);
    }
}

// Function to generate a response using OpenAI
async function generateResponse(prompt) {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 100,
        });
        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error("Error generating response:", error);
        return "Sorry, I couldn't generate a response. Please try again later!";
    }
}

// Function to reply to mentions
async function replyToMentions() {
    try {
        const userId = await getUserId(); // Fetch User ID
        if (!userId) {
            console.error("Unable to fetch User ID. Skipping mention replies.");
            return;
        }

        let lastProcessedId = readLastMentionId();

        const mentions = await makeTwitterRequest(async () =>
            twitterClient.v2.userMentionTimeline(userId, {
                since_id: lastProcessedId,
                max_results: 5,
                "tweet.fields": ["author_id", "conversation_id"],
                expansions: ["author_id"]
            })
        );

        if (!mentions.data || mentions.data.length === 0) {
            console.log("No new mentions to process");
            return;
        }

        for (const mention of mentions.data) {
            try {
                if (mention.id === lastProcessedId) continue;

                const prompt = `Please provide a brief, friendly response to this tweet: ${mention.text}`;
                const replyText = await generateResponse(prompt);

                if (!mention.id) {
                    console.warn("Invalid mention ID, skipping...");
                    continue;
                }

                await retryWithBackoff(async () =>
                    makeTwitterRequest(async () =>
                        twitterClient.v2.reply(replyText, mention.id)
                    )
                );

                console.log(`Replied to mention ${mention.id}`);
                lastProcessedId = mention.id;
                writeLastMentionId(lastProcessedId); // Update last processed mention ID

                await sleep(5000); // 5 seconds between replies

            } catch (error) {
                console.error(`Error processing mention ${mention.id}:`, error);
                if (await handleRateLimit(error)) continue;
            }
        }

    } catch (error) {
        console.error("Error in replyToMentions:", error);
    }
}

// Function to post top gainers
async function postTopGainers() {
    try {
        const topGainers = await fetchTopGainers();
        if (topGainers.length === 0) {
            console.log("No top gainers to post.");
            return;
        }

        let tweetText = "🚀 Top Crypto Gainers (24h):\n";
        topGainers.slice(0, 3).forEach((coin, index) => {
            tweetText += `${index + 1}. ${coin.symbol}: ${coin.change.toFixed(2)}%\n`;
        });

        await retryWithBackoff(async () => postTweet(tweetText));

    } catch (error) {
        console.error("Error posting top gainers:", error);
    }
}

// Function to post market trends
async function postMarketTrends() {
    try {
        const marketTrends = await fetchMarketTrends();
        if (!marketTrends) {
            console.log("No market trends to post.");
            return;
        }

        let tweetText = "🌍 Market Trends:\n";
        tweetText += `- Total Market Cap: $${(marketTrends.totalMarketCap / 1e12).toFixed(2)}T\n`;
        tweetText += `- Bitcoin Dominance: ${marketTrends.bitcoinDominance.toFixed(1)}%`;

        await retryWithBackoff(async () => postTweet(tweetText));

    } catch (error) {
        console.error("Error posting market trends:", error);
    }
}

// Function to post crypto news
async function postCryptoNews() {
    try {
        const cryptoNews = await fetchCryptoNews();
        if (cryptoNews.length === 0) {
            console.log("No crypto news to post.");
            return;
        }

        let tweetText = "📰 Latest Crypto News:\n";
        cryptoNews.forEach((article, index) => {
            tweetText += `${index + 1}. ${article.title}\n${article.url}\n`;
        });

        await retryWithBackoff(async () => postTweet(tweetText));

    } catch (error) {
        console.error("Error posting crypto news:", error);
    }
}

// Cron schedules
cron.schedule('*/15 * * * *', async () => {  // Every 15 minutes
    try {
        console.log("Posting top gainers...");
        await retryWithBackoff(postTopGainers);
    } catch (error) {
        console.error("Error in top gainers cron job:", error);
    }
});

cron.schedule('0 * * * *', async () => {  // Every hour
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