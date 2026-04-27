
const fetch = require('node-fetch');

module.exports = async (req, res) => {
    const { ADMIN_TOKEN, GITHUB_TOKEN, REPO_OWNER, REPO_NAME } = process.env;

    if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues?labels=contribution&state=open`, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`
            }
        });

        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
