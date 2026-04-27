
const fetch = require('node-fetch');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { ADMIN_TOKEN, GITHUB_TOKEN, REPO_OWNER, REPO_NAME } = process.env;
    const { issue_number, reason } = req.body;

    if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        // Add comment to issue
        await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issue_number}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `token ${GITHUB_TOKEN}`
            },
            body: JSON.stringify({ body: reason })
        });

        // Close issue
        await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issue_number}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `token ${GITHUB_TOKEN}`
            },
            body: JSON.stringify({ state: 'closed' })
        });

        res.status(200).json({ message: 'Contribution rejected' });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
