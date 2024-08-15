const express = require('express');
const formData = require('form-data');
const Mailgun = require('mailgun.js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
// Serve the static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve the index.html file on the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});


// Initialize Express app
 

// Initialize Mailgun primary client
const mailgun = new Mailgun(formData);
const mgPrimary = mailgun.client({username: 'api', key: process.env.MAILGUN_API_KEY || 'key-yourkeyhere'});

// Initialize Mailgun backup client (if you have a second API key or domain)
const mgBackup = mailgun.client({username: 'api', key: process.env.MAILGUN_API_KEY || 'key-yourbackupkeyhere'});

// Retry logic
async function sendEmailWithRetry(emailData, retryCount = 3) {
    let attempts = 0;
    let success = false;
    let lastError = null;

    while (attempts < retryCount && !success) {
        attempts++;
        try {
            const response = await mgPrimary.messages.create(emailData.domain, emailData.message);
            console.log(`Email sent successfully on attempt ${attempts}:`, response);
            success = true;
            return response;
        } catch (error) {
            console.error(`Attempt ${attempts} failed:`, error);
            lastError = error;
        }
    }

    // If all attempts fail, switch to the backup service
    if (!success) {
        try {
            const response = await mgBackup.messages.create(emailData.domain, emailData.message);
            console.log('Email sent successfully using the backup service:', response);
            return response;
        } catch (error) {
            console.error('Failed to send email with the backup service:', error);
            throw error; // Re-throw the error if both services fail
        }
    } else {
        throw lastError;
    }
}

// Endpoint to trigger email sending
app.post('/send-email', async (req, res) => {
    const emailData = {
        domain: 'manish1178.work.gd',
        message: {
            from: "Excited User <mailgun@manish1178.work.gd>",
            to: ["takermanish7@gmail.com"], // replace with your target email
            subject: "Hello",
            text: "Testing some Mailgun awesomeness!",
            html: "<h1>Testing some Mailgun awesomeness!</h1>"
        }
    };

    try {
        const response = await sendEmailWithRetry(emailData);
        res.status(200).json({ message: 'Email sent successfully', data: response });
    } catch (error) {
        res.status(500).json({ message: 'Failed to send email', error: error.message });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
