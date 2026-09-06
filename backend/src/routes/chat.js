require('dotenv').config();
// DEBUG: Check if .env loaded
// ============================================================
console.log('🔑 chat.js - GEMINI_API_KEY:', process.env.GEMINI_API_KEY);
console.log('📏 chat.js - Key length:', process.env.GEMINI_API_KEY?.length || 0);

const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const Note = require('../models/Note');
const PYQ = require('../models/PYQ');
const Subject = require('../models/Subject');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: 'gemini-3.5-flash-lite',
 
});

// ============================================================
// HELPER: Get all text from notes and PYQs
// ============================================================
const getSubjectContent = async (subjectId) => {
    try {
        const notes = await Note.find({ subject: subjectId });
        const pyqs = await PYQ.find({ subject: subjectId });

        let allText = '';

        if (notes.length > 0) {
            allText += '\n=== 📄 NOTES ===\n';
            for (const note of notes) {
                allText += `\n[${note.title}]\n`;
                allText += `Module: ${note.module || 'General'}\n`;
                // Use the actual content from the PDF
                if (note.content && note.content.length > 0) {
                    allText += `Content:\n${note.content.substring(0, 3000)}\n`; // Limit to 3000 chars
                } else {
                    allText += `Content: ${note.description || 'No content extracted'}\n`;
                }
            }
        }

        if (pyqs.length > 0) {
            allText += '\n=== 📝 PYQs (Past Year Questions) ===\n';
            for (const pyq of pyqs) {
                allText += `\n[${pyq.title}]\n`;
                allText += `Year: ${pyq.year} | Exam: ${pyq.examType}\n`;
                // Use the actual content from the PDF
                if (pyq.content && pyq.content.length > 0) {
                    allText += `Content:\n${pyq.content.substring(0, 3000)}\n`;
                } else {
                    allText += `Content: ${pyq.description || 'No content extracted'}\n`;
                }
            }
        }

        return allText;
    } catch (error) {
        console.error('Error getting subject content:', error);
        throw error;
    }
};

// ============================================================
// CHAT ROUTE
// ============================================================
router.post('/ask', async (req, res) => {
    try {
        const { subjectId, question } = req.body;

        if (!subjectId || !question) {
            return res.status(400).json({
                error: 'Subject ID and question are required',
            });
        }

        const subject = await Subject.findById(subjectId);
        if (!subject) {
            return res.status(404).json({ error: 'Subject not found' });
        }

        const contentStart = Date.now();

        const content = await getSubjectContent(subjectId);

        console.log(`📚 MongoDB content fetch: ${Date.now() - contentStart} ms`);
        console.log(`📏 Content length: ${content.length} characters`);

        if (!content || content.trim().length === 0) {
            return res.status(400).json({
                error: 'No study materials uploaded for this subject yet.',
            });
        }

       const prompt = `
You are StudyAssist AI, a friendly, encouraging, and expert teaching assistant for the subject "${subject.name}".

You have access to the following study materials:
${content}

Your task: Help the student with their question.

RESPONSE GUIDELINES:
1. Be conversational and encouraging - like a friendly tutor
2. Use clear markdown formatting:
   - Use **bold** for important terms and key concepts
   - Use bullet points (• or -) for lists
   - Use numbered steps (1., 2., 3.) for solutions
   - Use \`code\` for boolean expressions and formulas
   - Use --- for section separators
   - For TABLES, use this exact format:
     | Column 1 | Column 2 | Column 3 |
     |----------|----------|----------|
     | Data 1   | Data 2   | Data 3   |
     (NO extra spaces or special characters inside table cells)
3. Keep paragraphs short and readable
4. If showing a solution, break it down step-by-step with clear explanations
5. Highlight key takeaways and exam tips (use 💡 or 📌 emojis)
6. If the topic isn't in the materials, say so clearly but still help with general knowledge
7. End with a helpful follow-up question

STUDENT QUESTION:
${question}

YOUR RESPONSE:
`;

        const geminiStart = Date.now();

        const result = await model.generateContent(prompt);

        console.log(`🤖 Gemini generation: ${Date.now() - geminiStart} ms`);

        const answer = result.response.text();

        console.log(`📏 Answer length: ${answer.length} characters`);

        res.json({
            answer: answer,
            subject: {
                id: subject._id,
                name: subject.name,
                code: subject.code,
            },
        });

    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({
            error: 'Failed to get answer: ' + error.message,
        });
    }
});

module.exports = router;