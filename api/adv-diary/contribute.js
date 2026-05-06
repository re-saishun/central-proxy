const fetch = require('node-fetch');

module.exports = async (req, res) => {
    // Set CORS headers to allow requests from your GitHub Pages site
    res.setHeader('Access-Control-Allow-Origin', 'https://re-saishun.github.io');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle pre-flight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { title, body } = req.body;
    const { GITHUB_TOKEN, REPO_OWNER, REPO_NAME } = process.env;

    try {
        const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `token ${GITHUB_TOKEN}`
            },
            body: JSON.stringify({
                title,
                body,
                labels: ['contribution']
            })
        });

        const data = await response.json();
        // Forward the status from the GitHub API response
        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
