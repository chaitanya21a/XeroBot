const axios = require('axios');
const config = require('../config');

module.exports = {
    fetchCryptoNews: async () => {
        const response = await axios.get('https://min-api.cryptocompare.com/data/v2/news/', {
            params: {
                lang: 'EN',
                api_key: config.cryptocompare.apiKey,
            },
        });
        return response.data.Data.slice(0, 3).map(article => ({
            title: article.title,
            url: article.url,
        }));
    },
};