const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const router = express.Router();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// ============== Storage (সতর্কতা: এটি সাময়িক, রিফ্রেশ হলে মুছে যাবে) ==============
let currentQuestion = null;

// ============== Endpoints ==============

// ১. চ্যাটবট এন্ডপয়েন্ট
router.post('/physio_chatbot', (req, res) => {
    const { message } = req.body;
    if (currentQuestion && message.toLowerCase().includes('exam')) {
        return res.json({
            message: `Great! Here is your exam on ${currentQuestion.topic}`,
            questionReady: true,
            questionData: currentQuestion.data
        });
    }
    res.json({ message: "Hello! Ask me for an 'exam' to start." });
});

// ২. কোশ্চেন ট্রিগার এন্ডপয়েন্ট (আপনার কাঙ্ক্ষিত CURL এর জন্য)
router.post('/trigger-question', (req, res) => {
    const { topic, passage, question, options, correctAnswer, timeLimit } = req.body;

    currentQuestion = {
        topic: topic || 'General',
        data: { passage, question, options, correctAnswer, timeLimit: timeLimit || 600 }
    };

    res.json({
        success: true,
        message: "Question triggered successfully on Netlify!",
        topic: topic
    });
});

// ৩. এক্সাম সাবমিট এন্ডপয়েন্ট
router.post('/physio_exam', (req, res) => {
    const { isCorrect } = req.body;
    res.json({ success: true, feedback: isCorrect ? "Correct!" : "Wrong!" });
});

// Netlify-এর জন্য পাথ সেটআপ
app.use('/.netlify/functions/api', router);

module.exports.handler = serverless(app);