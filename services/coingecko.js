const axios = require('axios');

module.exports = {
    fetchTopGainers: async () => {
        const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
            params: {
                vs_currency: 'usd',
                order: 'price_change_percentage_24h_desc',
                per_page: 3,
                page: 1,
                sparkline: false,
            },
        });
        return response.data.map(coin => ({
            name: coin.name,
            symbol: coin.symbol.toUpperCase(),
            price: coin.current_price,
            change: coin.price_change_percentage_24h,
        }));
    },
    fetchMarketTrends: async () => {
        const response = await axios.get('https://api.coingecko.com/api/v3/global');
        const data = response.data.data;
        return {
            totalMarketCap: data.total_market_cap.usd,
            bitcoinDominance: data.market_cap_percentage.btc,
        };
    },
};