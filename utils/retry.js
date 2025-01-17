const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    retryWithBackoff: async (fn, maxRetries = 3) => {
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
    },
};