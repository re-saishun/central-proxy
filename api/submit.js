const https = require('https');

// Helper function to make HTTPS requests with promises
function httpsRequest(options, postData) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    // Handle non-JSON responses gracefully
                    const contentType = res.headers['content-type'] || '';
                    if (contentType.includes('application/json')) {
                        resolve({ statusCode: res.statusCode, headers: res.headers, body: JSON.parse(body) });
                    } else {
                        resolve({ statusCode: res.statusCode, headers: res.headers, body: body });
                    }
                } catch (e) {
                    reject(new Error(`Failed to parse response body: ${body}`));
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        if (postData) {
            req.write(postData);
        }
        req.end();
    });
}

module.exports = async (req, res) => {
    // Allow requests from any origin (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }

    const { credit, itemName, description } = req.body;

    if (!credit || !itemName || !description) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }

    const {
        GITHUB_TOKEN,
        GITHUB_REPO, // Expected format: 'username/reponame'
        GITHUB_BRANCH = 'main' // Default to 'main'
    } = process.env;

    if (!GITHUB_TOKEN || !GITHUB_REPO) {
        console.error('Missing GitHub environment variables.');
        return res.status(500).json({ message: 'Server configuration error.' });
    }

    const filePath = 'database.json';
    const GITHUB_API_URL = `api.github.com`;

    const getFileOptions = {
        hostname: GITHUB_API_URL,
        path: `/repos/${GITHUB_REPO}/contents/${filePath}?ref=${GITHUB_BRANCH}`,
        method: 'GET',
        headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'User-Agent': 'Vercel-Serverless-Function'
        }
    };

    try {
        // 1. Get the current database file from GitHub
        const fileData = await httpsRequest(getFileOptions);

        let currentContent = '[]';
        let fileSha = null;

        if (fileData.statusCode === 200) {
            currentContent = Buffer.from(fileData.body.content, 'base64').toString('utf-8');
            fileSha = fileData.body.sha;
        } else if (fileData.statusCode !== 404) {
            throw new Error(`Failed to fetch file from GitHub. Status: ${fileData.statusCode}, Body: ${JSON.stringify(fileData.body)}`);
        }
        
        const database = JSON.parse(currentContent);

        // 2. Add new data
        database.push({
            id: Date.now(), // Simple unique ID
            credit,
            itemName,
            description,
            approved: false // Contributions start as not approved
        });

        // 3. Prepare the new content to be sent back
        const newContent = Buffer.from(JSON.stringify(database, null, 2)).toString('base64');

        // 4. Create or update the file on GitHub
        const updateFileOptions = {
            hostname: GITHUB_API_URL,
            path: `/repos/${GITHUB_REPO}/contents/${filePath}`,
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'User-Agent': 'Vercel-Serverless-Function',
                'Content-Type': 'application/json'
            }
        };

        const updateBody = {
            message: `New contribution from ${credit}`,
            content: newContent,
            branch: GITHUB_BRANCH
        };

        // SHA is required for updates, but not for creating a new file
        if (fileSha) {
            updateBody.sha = fileSha;
        }

        const updateResult = await httpsRequest(updateFileOptions, JSON.stringify(updateBody));

        if (updateResult.statusCode === 200 || updateResult.statusCode === 201) {
            res.status(200).json({ message: 'Contribution submitted successfully!' });
        } else {
            throw new Error(`Failed to update file on GitHub. Status: ${updateResult.statusCode}, Body: ${JSON.stringify(updateResult.body)}`);
        }

    } catch (error) {
        console.error('Error processing contribution:', error);
        res.status(500).json({ message: 'An internal error occurred.', details: error.message });
    }
};