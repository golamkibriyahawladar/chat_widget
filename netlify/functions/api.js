const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const router = express.Router();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ============== Storage (Netlify তে এটি সাময়িক, টেস্ট করার জন্য পারফেক্ট) ==============
let currentQuestion = null;
let examResponses = [];

// ============== API Routes ==============

/**
 * ১. Question Trigger (CURL দিয়ে এখানে হিট করবেন)
 * এটি নতুন ডাটা রিসিভ করে এবং একটি ইউনিক ID জেনারেট করে
 */
router.post('/webhook/trigger-question', (req, res) => {
    try {
        const { topic, passage, question, options, correctAnswer, timeLimit } = req.body;

        // ভ্যালিডেশন: ডাটা ঠিকমতো আসছে কি না চেক করা
        if (!question || !options || !Array.isArray(options) || options.length !== 4) {
            return res.status(400).json({
                success: false,
                error: "Invalid payload. 'question' and exactly 4 'options' are required."
            });
        }

        // নতুন ডাটা সেভ করা (ID হিসেবে টাইমস্ট্যাম্প ব্যবহার করা হয়েছে যাতে পোলিং বুঝতে পারে এটি নতুন)
        currentQuestion = {
            id: Date.now(),
            topic: topic || 'General Topic',
            data: {
                passage: passage || '',
                question: question,
                options: options,
                correctAnswer: parseInt(correctAnswer) || 0,
                timeLimit: parseInt(timeLimit) || 600
            }
        };

        console.log("New question triggered:", currentQuestion.topic);

        res.json({
            success: true,
            message: "Question triggered successfully!",
            questionId: currentQuestion.id
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * ২. Check Trigger (চ্যাট উইজেট এই এন্ডপয়েন্টটি পোল করবে)
 */
router.get('/webhook/check-trigger', (req, res) => {
    if (currentQuestion) {
        res.json({ hasNew: true, ...currentQuestion });
    } else {
        res.json({ hasNew: false });
    }
});

/**
 * ৩. চ্যাটবট রেসপন্স (Webhook Response)
 */
router.post('/webhook/physio_chatbot', (req, res) => {
    const { message } = req.body;

    let botResponse = "I'm your Physio Assistant. Ask me for an 'exam' to start!";
    let isQuestionReady = false;

    if (message && (message.toLowerCase().includes('exam') || message.toLowerCase().includes('test'))) {
        if (currentQuestion) {
            botResponse = `A fresh exam on ${currentQuestion.topic} is waiting for you!`;
            isQuestionReady = true;
        } else {
            botResponse = "I don't have any exams ready right now. Please trigger one via the dashboard/CURL.";
        }
    }

    res.json({
        message: botResponse,
        questionReady: isQuestionReady,
        questionData: isQuestionReady ? currentQuestion.data : null
    });
});

/**
 * ৪. এক্সাম সাবমিশন (পরীক্ষা শেষ হলে রেজাল্ট এখানে আসবে)
 */
router.post('/webhook/physio_exam', (req, res) => {
    const result = req.body;
    examResponses.push({ ...result, submittedAt: new Date() });

    res.json({
        success: true,
        feedback: result.isCorrect ? "Brilliant! Correct answer." : "Oops! That's not right.",
        scoreUpdate: "Result recorded successfully."
    });
});

// Netlify এর জন্য পাথ কনফিগারেশন
app.use(['/.netlify/functions/api', '/api'], router);

module.exports.handler = serverless(app);