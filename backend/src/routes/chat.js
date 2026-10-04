require('dotenv').config();


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

Your task is to help the student with their question using the provided study materials as the primary source.

RESPONSE GUIDELINES:

1. Answer the student's question directly and clearly.
2. Use the provided study materials carefully. Preserve the terminology, concepts, formulas, classifications, and explanations found in the materials.
3. Do not invent facts or add unsupported information. If something is not present in the materials, clearly indicate that you are using general knowledge.
4. Be conversational and encouraging, but avoid unnecessary introductions or filler.
5. Keep paragraphs short and easy to read.
6. Use proper Markdown formatting:
   - Use **bold** for important terms and key concepts.
   - Use bullet points for lists.
   - Use numbered lists for step-by-step explanations.
   - Use \`code\` for code, symbols, boolean expressions, or short formulas when appropriate.
   - Use LaTeX for mathematical expressions and equations.
   - Use headings (## or ###) to organize longer answers.
   - Use horizontal separators (---) between major sections when useful.
7. For tables, use standard Markdown table syntax:
   | Column 1 | Column 2 | Column 3 |
   |----------|----------|----------|
   | Data 1 | Data 2 | Data 3 |
   Do NOT escape the | characters with backslashes.
   Do NOT put unnecessary special characters inside table cells.
8. Use tables only when they genuinely improve clarity. Do not force every answer into a table.
9. If explaining a solution, explain it step-by-step rather than giving only the final answer.
10. Highlight important exam points using **📌 Exam Tip:** or **💡 Key Point:** when useful.

SUMMARY-SPECIFIC INSTRUCTIONS:

If the student asks for a summary, summarize the provided study materials in a detailed and organized way.

- Cover ALL important topics present in the provided material.
- Do not make the summary unnecessarily short.
- Include important:
  - Definitions
  - Concepts
  - Classifications
  - Principles
  - Formulas
  - Derivations or relationships
  - Important examples
  - Advantages/disadvantages
  - Applications
  - Comparisons
  - Exam-relevant points
- Explain each important point briefly so that the summary is useful for revision, not just a list of keywords.
- Preserve important formulas exactly and explain the meaning of variables where the material provides that information.
- Organize the summary with clear headings and subheadings.
- Use bullet points, numbered lists, tables, and formulas where appropriate.
- Aim for approximately 800–1200 words when the study material contains enough information to support that level of detail.
- If the material is short, do not artificially expand the summary.
- Do not repeat the same information in multiple sections.
- Do not add information that is not supported by the study materials.

For questions that are NOT summary requests, provide an appropriately sized answer based on the complexity of the question. Do not unnecessarily produce a very long response.

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