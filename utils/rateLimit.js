const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const rateLimits = {
    lastReset: Date.now(),
    requestsRemaining: 15, // Adjust based on Twitter's rate limits
    resetTime: Date.now() + (15 * 60 * 1000),
};

const handleRateLimit = async (error) => {
    if (error.code === 429) {
        const resetTime = error.rateLimit?.reset * 1000 || (Date.now() + 15 * 60 * 1000);
        const waitTime = resetTime - Date.now() + 1000; // Add 1 second buffer
        console.log(`Rate limited. Waiting ${Math.round(waitTime / 1000)} seconds until ${new Date(resetTime).toISOString()}`);
        await sleep(waitTime);
        return true;
    }
    return false;
};

const makeTwitterRequest = async (requestFn) => {
    try {
        if (rateLimits.requestsRemaining <= 1) {
            const timeUntilReset = rateLimits.resetTime - Date.now();
            if (timeUntilReset > 0) {
                console.log(`Preemptively waiting for rate limit reset: ${Math.round(timeUntilReset / 1000)} seconds`);
                await sleep(timeUntilReset + 1000);
            }
        }

        const result = await requestFn();

        // Update rate limits using response headers
        if (result._headers) {
            const limit = result._headers.get('x-rate-limit-limit');
            const remaining = result._headers.get('x-rate-limit-remaining');
            const reset = result._headers.get('x-rate-limit-reset');

            if (limit && remaining && reset) {
                rateLimits.requestsRemaining = parseInt(remaining, 10);
                rateLimits.resetTime = parseInt(reset, 10) * 1000;
                console.log(`Requests remaining: ${rateLimits.requestsRemaining}, Reset at: ${new Date(rateLimits.resetTime).toISOString()}`);
            }
        }

        return result;
    } catch (error) {
        if (await handleRateLimit(error)) {
            return makeTwitterRequest(requestFn);
        }
        throw error;
    }
};

module.exports = {
    handleRateLimit,
    makeTwitterRequest,
};