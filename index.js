const express = require('express');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

// Set up middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve the index.html form
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Deploy handler
app.post('/deploy', (req, res) => {
    const { username, repoUrl } = req.body;

    if (!username || !repoUrl) {
        return res.status(400).json({ message: 'Username and repository URL are required' });
    }

    // Create directory for the username
    const userDir = path.join(__dirname, 'deployments', username);
    if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
    }

    // Clone the repository into the username folder
    exec(`git clone ${repoUrl} ${userDir}`, (err, stdout, stderr) => {
        if (err) {
            return res.status(500).json({ message: `Error cloning repository: ${stderr}` });
        }

        // Install node modules in the cloned folder
        exec(`cd ${userDir} && npm install`, (installErr, installStdout, installStderr) => {
            if (installErr) {
                return res.status(500).json({ message: `Error installing node modules: ${installStderr}` });
            }

            // Run the index.js in the cloned repo
            exec(`cd ${userDir} && node index.js`, (runErr, runStdout, runStderr) => {
                if (runErr) {
                    return res.status(500).json({ message: `Error running index.js: ${runStderr}` });
                }

                // Send the console output of the index.js to the client
                res.json({
                    message: 'Deployment successful!',
                    consoleOutput: runStdout
                });
            });
        });
    });
});

app.listen(port, () => {
    console.log(`App is running at http://localhost:${port}`);
});
