const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const rateLimits = {
    lastReset: Date.now(),
    requestsRemaining: 50,
    resetTime: Date.now() + (15 * 60 * 1000),
};

module.exports = {
    handleRateLimit: async (error) => {
        if (error.code === 429) {
            const resetTime = error.rateLimit?.reset * 1000 || (Date.now() + 15 * 60 * 1000);
            const waitTime = resetTime - Date.now() + 1000;
            console.log(`Rate limited. Waiting ${Math.round(waitTime / 1000)} seconds until ${new Date(resetTime).toISOString()}`);
            await sleep(waitTime);
            return true;
        }
        return false;
    },
    makeTwitterRequest: async (requestFn) => {
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
    },
};