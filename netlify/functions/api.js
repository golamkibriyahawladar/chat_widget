const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');

const app = express();
const router = express.Router();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let currentQuestion = null;
let examResponses = [];

// 1) Trigger question
router.post('/webhook/trigger-question', (req, res) => {
    try {
        const { topic, passage, question, options, correctAnswer, timeLimit } = req.body;

        if (!question || !options || !Array.isArray(options) || options.length !== 4) {
            return res.status(400).json({
                success: false,
                error: "Invalid payload. 'question' and exactly 4 'options' are required."
            });
        }

        currentQuestion = {
            id: Date.now(),
            topic: topic || 'General Topic',
            data: {
                passage: passage || '',
                question: question,
                options: options,
                correctAnswer: Number(correctAnswer) || 0,
                timeLimit: Number(timeLimit) || 600
            }
        };

        console.log('New question triggered:', currentQuestion);

        return res.json({
            success: true,
            message: 'Question triggered successfully!',
            questionId: currentQuestion.id,
            data: currentQuestion
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 2) Check trigger for popup
router.get('/webhook/check-trigger', (req, res) => {
    try {
        if (currentQuestion) {
            return res.json({
                hasNew: true,
                id: currentQuestion.id,
                topic: currentQuestion.topic,
                data: currentQuestion.data
            });
        }

        return res.json({ hasNew: false });
    } catch (error) {
        return res.status(500).json({
            hasNew: false,
            error: error.message
        });
    }
});

// 3) Optional local chatbot route
router.post('/webhook/physio_chatbot', (req, res) => {
    const { message } = req.body;

    let botResponse = "I'm your Physio Assistant. Ask me for an exam to start!";
    let isQuestionReady = false;

    if (message && (message.toLowerCase().includes('exam') || message.toLowerCase().includes('test'))) {
        if (currentQuestion) {
            botResponse = `A fresh exam on ${currentQuestion.topic} is waiting for you!`;
            isQuestionReady = true;
        } else {
            botResponse = "I don't have any exams ready right now.";
        }
    }

    return res.json({
        message: botResponse,
        questionReady: isQuestionReady,
        questionData: isQuestionReady
            ? {
                topic: currentQuestion.topic,
                ...currentQuestion.data
            }
            : null
    });
});

// 4) Exam submission
router.post('/webhook/physio_exam', (req, res) => {
    try {
        const result = req.body;

        examResponses.push({
            ...result,
            submittedAt: new Date().toISOString()
        });

        console.log('Exam submitted:', result);

        return res.json({
            success: true,
            feedback: result.isCorrect
                ? 'Brilliant! Correct answer.'
                : "Oops! That's not right.",
            scoreUpdate: 'Result recorded successfully.'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.use('/.netlify/functions/api', router);
app.use('/api', router);

module.exports.handler = serverless(app);