const OpenAI = require('openai');
const config = require('../config');

const openai = new OpenAI(config.openai);

module.exports = {
    generateResponse: async (prompt) => {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 100,
        });
        return response.choices[0].message.content.trim();
    },
};