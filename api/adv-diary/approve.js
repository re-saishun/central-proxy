
const fetch = require('node-fetch');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { ADMIN_TOKEN, GITHUB_TOKEN, REPO_OWNER, REPO_NAME } = process.env;
    const { issue_number, data_path, data_content } = req.body;

    if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        // Get current file content
        const getFileResponse = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${data_path}`, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`
            }
        });
        const fileData = await getFileResponse.json();
        const sha = fileData.sha;

        // Update file
        await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${data_path}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `token ${GITHUB_TOKEN}`
            },
            body: JSON.stringify({
                message: `Approved contribution for issue #${issue_number}`,
                content: Buffer.from(data_content).toString('base64'),
                sha
            })
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

        res.status(200).json({ message: 'Contribution approved and merged' });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
