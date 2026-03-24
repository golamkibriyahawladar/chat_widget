# 🎓 Physio Chat & Exam System - Complete Setup Guide

## 📦 Files Included

1. **chat-widget.html** - Chat interface with AI and question notifications
2. **exam.html** - MCQ examination page with timer
3. **webhook-handler.js** - Backend webhook handler (Node.js/Express)
4. **WEBHOOK_DOCUMENTATION.md** - Technical webhook documentation
5. **README.md** - This setup guide

---

## 🚀 Quick Start

### Option 1: Local Testing (Simple)

#### Step 1: Open the Chat Widget
```bash
# Simply open in browser
open chat-widget.html
# or
start chat-widget.html
```

#### Step 2: Open the Exam Page
```bash
# In another tab/window
open exam.html
```

**Note:** Webhooks won't work without a backend server.

---

### Option 2: Full Setup with Backend (Recommended)

#### Prerequisites
- Node.js 14+ installed
- npm or yarn
- Terminal/Command line access

#### Step 1: Install Dependencies
```bash
npm install express cors body-parser
```

#### Step 2: Start the Webhook Server
```bash
node webhook-handler.js
```

You should see:
```
╔════════════════════════════════════════════╗
║   Physio Chat & Exam Webhook Handler      ║
║   Server running on port 3000                  ║
╚════════════════════════════════════════════╝
```

#### Step 3: Update Webhook URLs

Edit both HTML files and update the webhook URLs:

**In chat-widget.html:**
```javascript
const WEBHOOK_URL = 'http://localhost:3000/webhook-test/physio_chatbot';
```

**In exam.html:**
```javascript
const WEBHOOK_URL = 'http://localhost:3000/webhook-test/physio_exam';
```

#### Step 4: Open in Browser
```bash
# Open chat widget
open http://localhost:3000/chat-widget.html

# Open exam page (separate tab)
open http://localhost:3000/exam.html
```

---

## 🌐 N8N Integration Setup

### Step 1: Create Account
1. Go to [n8n.io](https://n8n.io)
2. Sign up for free account
3. Create new workflow

### Step 2: Create Chat Webhook

1. **Add Webhook Trigger Node**
   - Type: "Webhook"
   - Method: POST
   - URL Path: `webhook-test/physio_chatbot`
   - Authentication: None (or add API key)

2. **Add AI Integration Node**
   - Choose: OpenAI, Claude, or other AI service
   - Connect trigger to AI node
   - Map `$json.message` to AI input

3. **Add Response Node**
   - Type: "Respond to Webhook"
   - Response Body:
   ```javascript
   {
     "message": "{{ $json.response }}",
     "questionReady": false
   }
   ```

4. **Save and Deploy**
   - Copy webhook URL from trigger node

### Step 3: Create Exam Webhook

1. **Add Webhook Trigger Node**
   - Type: "Webhook"
   - Method: POST
   - URL Path: `webhook-test/physio_exam`

2. **Add Database Node**
   - Store all exam submissions
   - Fields: passage, question, selectedAnswer, correctAnswer, isCorrect, timeUsed

3. **Add Response Node**
   ```javascript
   {
     "success": true,
     "message": "Exam recorded",
     "feedback": "{{ if $json.isCorrect }} Correct! {{ else }} Incorrect. Correct answer: {{ endif }}"
   }
   ```

### Step 4: Update URLs in HTML

Update the webhook URLs in both HTML files to match your N8N URLs.

---

## 📱 Usage Flow

### For Students

#### 1. Chat Widget Flow
```
1. Open chat-widget.html
2. Type message (e.g., "I want to take the exam")
3. Bot responds
4. If question is ready, modal popup appears
5. Click "Go to Test" button
6. Exam page opens
```

#### 2. Exam Flow
```
1. Exam page opens
2. Read the passage
3. Click "Start Exam" button
4. Timer starts counting down
5. Read the question
6. Select one option (checkbox)
7. Click "Submit Answer" button
8. See if you're correct
9. Time and answer are recorded
```

### For Administrators

#### 1. Monitor Responses
```bash
# Get all exam responses
curl http://localhost:3000/api/exam-responses

# Get exam statistics
curl http://localhost:3000/api/exam-stats

# Get chat history
curl http://localhost:3000/api/chat-history
```

#### 2. Clear Test Data
```bash
curl -X POST http://localhost:3000/api/clear-data
```

#### 3. Send Question to Student
```bash
# Via webhook, send message with questionReady = true
curl -X POST http://localhost:3000/webhook-test/physio_chatbot \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Your question is ready",
    "questionReady": true,
    "showQuestionModal": true,
    "modalMessage": "Assessment ready! Click to start"
  }'
```

---

## 🔧 Configuration

### Update Exam Content

**In exam.html**, modify the `examData` object:

```javascript
let examData = {
    timeLimit: 300,  // 5 minutes in seconds
    passage: 'Your passage text here...',
    question: 'Your question text here?',
    options: [
        'Option A text',
        'Option B text',
        'Option C text',
        'Option D text'
    ],
    correctAnswer: 1  // Index of correct answer (0-3)
};
```

### Customize Timer

```javascript
// 2 minutes
timeLimit: 120

// 1 minute
timeLimit: 60

// 10 minutes
timeLimit: 600
```

### Customize Styling

Edit CSS in HTML files to change:
- Colors (gradients)
- Fonts
- Border radius
- Spacing
- Animations

---

## 📊 Data Structures

### Chat Message Format
```json
{
  "id": 1711270400000,
  "message": "Hello, I want to take the exam",
  "timestamp": "2024-03-24T10:00:00.000Z",
  "role": "user"
}
```

### Exam Response Format
```json
{
  "id": 1711270420000,
  "passage": "The human skeleton...",
  "question": "How many bones?",
  "options": ["150", "206", "300", "100"],
  "selectedAnswer": 1,
  "selectedText": "206",
  "correctAnswer": 1,
  "isCorrect": true,
  "timeUsed": 45,
  "timestamp": "2024-03-24T10:00:45.000Z",
  "recordedAt": "2024-03-24T10:00:46.000Z"
}
```

---

## 🔐 Security Best Practices

### 1. Environment Variables
```bash
# Create .env file
WEBHOOK_PORT=3000
WEBHOOK_SECRET=your_secret_key
DATABASE_URL=your_database_url
API_KEY=your_api_key
```

### 2. Input Validation
```javascript
// Always validate incoming data
if (!req.body.message || typeof req.body.message !== 'string') {
    return res.status(400).json({ error: 'Invalid input' });
}
```

### 3. Rate Limiting
```bash
npm install express-rate-limit

// Use in webhook handlers
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

app.post('/webhook-test/physio_exam', limiter, (req, res) => {
    // ... handler code
});
```

### 4. CORS Configuration
```javascript
app.use(cors({
    origin: ['https://yourdomain.com', 'https://app.yourdomain.com'],
    credentials: true
}));
```

### 5. HTTPS
Always use HTTPS in production:
```javascript
const https = require('https');
const fs = require('fs');

const options = {
    key: fs.readFileSync('path/to/private-key.pem'),
    cert: fs.readFileSync('path/to/certificate.pem')
};

https.createServer(options, app).listen(443);
```

---

## 🐛 Troubleshooting

### Issue: Popup doesn't appear in chat

**Solution:**
- Check browser console for errors (F12)
- Verify webhook is returning `questionReady: true`
- Check popup CSS display property

### Issue: Timer not starting

**Solution:**
- Click "Start Exam" button
- Check browser console
- Verify timeLimit is set in examData

### Issue: Exam data not saving

**Solution:**
- Verify webhook server is running
- Check webhook URL is correct
- Look at server logs
- Verify database connection

### Issue: Chat messages not appearing

**Solution:**
- Verify webhook URL is correct
- Check CORS settings
- Look at browser Network tab
- Verify JSON format is correct

### Issue: CORS errors

**Solution:**
```javascript
// Add to your server
app.use(cors());

// Or be more specific
app.use(cors({
    origin: 'http://localhost:3000'
}));
```

---

## 📈 Monitoring & Analytics

### Track Key Metrics

```javascript
// In webhook-handler.js
const metrics = {
    totalChats: chatHistory.length,
    totalExams: examResponses.length,
    correctAnswers: examResponses.filter(r => r.isCorrect).length,
    averageScore: calculateAverageScore(examResponses),
    averageTime: calculateAverageTime(examResponses)
};
```

### Export Data
```bash
# Export as JSON
node -e "console.log(JSON.stringify(require('./exam-responses.json'), null, 2))"

# Export as CSV
npm install json2csv
```

---

## 🎨 Customization Examples

### Change Theme Colors

**In HTML files, find:**
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

**Change to:**
```css
/* Blue theme */
background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);

/* Green theme */
background: linear-gradient(135deg, #4CAF50 0%, #388E3C 100%);

/* Red theme */
background: linear-gradient(135deg, #F44336 0%, #D32F2F 100%);
```

### Change Font

**Find:**
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

**Change to:**
```css
font-family: 'Georgia', serif;  /* Serif */
font-family: 'Courier New', monospace;  /* Monospace */
font-family: 'Trebuchet MS', sans-serif;  /* Different sans-serif */
```

### Change Timer Color

**Find:**
```css
.timer-display {
    background: rgba(255, 255, 255, 0.2);
}
```

**Change to:**
```css
.timer-display {
    background: rgba(76, 175, 80, 0.2);  /* Green */
    color: #4CAF50;
}
```

---

## 📝 Example Workflows

### Workflow 1: Simple Quiz
1. Student opens chat widget
2. Asks "Can I take a test?"
3. Admin triggers question via webhook
4. Popup appears
5. Student completes exam

### Workflow 2: Multiple Questions
1. Loop: Send question → Student answers → Record response
2. After N questions, show score
3. Option to retake

### Workflow 3: Timed Assessment
1. Admin sets time limit
2. Student starts exam with timer
3. Can answer multiple questions
4. Timer runs for entire duration
5. Auto-submit when time ends

---

## 🚀 Deployment

### Deploy to Heroku
```bash
# Create Procfile
echo "web: node webhook-handler.js" > Procfile

# Deploy
heroku create your-app-name
git push heroku main
```

### Deploy to Vercel (Serverless)
```bash
# Convert to serverless function
# Create api/webhooks.js

# Deploy
vercel
```

### Deploy to AWS
```bash
# Use API Gateway + Lambda
# Or use EC2 instance with Node.js
```

### Deploy to Docker
```dockerfile
FROM node:14-alpine
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 3000
CMD ["node", "webhook-handler.js"]
```

```bash
# Build and run
docker build -t physio-app .
docker run -p 3000:3000 physio-app
```

---

## 📞 Support

### Common Questions

**Q: Can I use this without a backend?**
A: Yes, but webhooks won't work. The frontend will still work locally.

**Q: How do I add more questions?**
A: Update the `examData` object in exam.html or load dynamically from backend.

**Q: Can I track student progress?**
A: Yes, store exam responses in database and query by student ID.

**Q: Can I modify the timer?**
A: Yes, change `timeLimit` value (in seconds) in examData.

**Q: How do I add images to passages?**
A: Add HTML to passage: `<img src="url" alt="description">`

---

## 📚 Resources

- [Express.js Docs](https://expressjs.com)
- [N8N Documentation](https://docs.n8n.io)
- [MDN Web Docs](https://developer.mozilla.org)
- [JavaScript Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)

---

**Version:** 1.0  
**Last Updated:** March 24, 2024  
**Maintained by:** Physio Team

---

## 📋 Checklist for Production

- [ ] Update all webhook URLs
- [ ] Set up database
- [ ] Enable HTTPS
- [ ] Configure CORS properly
- [ ] Set up authentication
- [ ] Add rate limiting
- [ ] Enable logging
- [ ] Test all features
- [ ] Set up monitoring
- [ ] Create backup strategy
- [ ] Document custom changes
- [ ] Train users
- [ ] Set up support system

---

Happy Learning! 🎓
