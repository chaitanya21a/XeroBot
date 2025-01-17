const fs = require('fs');

module.exports = {
    readLastMentionId: () => {
        try {
            if (fs.existsSync('lastMentionId.txt')) {
                const id = fs.readFileSync('lastMentionId.txt', 'utf8').trim();
                if (id && !isNaN(id)) {
                    return id;
                }
            }
        } catch (error) {
            console.error("Error reading last mention ID:", error);
        }
        return null;
    },
    writeLastMentionId: (mentionId) => {
        try {
            if (mentionId && !isNaN(mentionId)) {
                fs.writeFileSync('lastMentionId.txt', mentionId.toString(), 'utf8');
            } else {
                console.warn("Invalid mention ID, not writing to file:", mentionId);
            }
        } catch (error) {
            console.error("Error writing last mention ID:", error);
        }
    },
};