import { db } from '@/firebase/admin';
import { getRandomInterviewCover } from '@/lib/utils';
import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

export async function GET() {
    return Response.json({ success: true, data: 'THANK YOU' }, { status: 200 });
}

export async function POST(request: Request) {
    const body = await request.json();

    // Log incoming request for debugging
    console.log('Vapi generate webhook received:', JSON.stringify(body, null, 2));

    const message = body.message;

    // Handle Vapi's webhook format (function-call message type)
    if (message?.type === 'function-call') {
        const { functionCall, call } = message;
        const params = functionCall?.parameters || {};

        // Extract userid from Vapi's variable values (set during vapi.start())
        const userid =
            call?.assistantOverrides?.variableValues?.userid ||
            call?.assistant?.variableValues?.userid ||
            call?.metadata?.userid ||
            '';

        // Map Vapi tool parameter names → what we use internally
        // Vapi sends: role, difficulty, currentRole, numQuestions, interviewType
        // We need:    role, level,      techstack,    amount,       type
        const type = params.interviewType || 'mixed';
        const role = params.role || 'General';
        const level = params.difficulty || 'junior';
        const techstack = params.currentRole || role;
        const amount = params.numQuestions || 5;

        try {
            const { object } = await generateObject({
                model: google('gemini-2.0-flash-001'),
                schema: z.object({
                    questions: z.array(z.string()),
                }),
                prompt: `Prepare questions for a job interview.
            The job role is ${role}.
            The job experience level is ${level}.
            The tech stack used in the job is: ${techstack}.
            The focus between behavioural and technical questions should lean towards: ${type}.
            The amount of questions required is: ${amount}.
            The questions are going to be read by a voice assistant so do not use "/" or "*" or any other special characters which might break the voice assistant.`,
            });

            const interview = {
                role,
                type,
                level,
                techstack: typeof techstack === 'string' ? techstack.split(',').map((s: string) => s.trim()) : [techstack],
                questions: object.questions,
                userId: userid,
                finalized: true,
                coverImage: getRandomInterviewCover(),
                createdAt: new Date().toISOString(),
            };

            await db.collection('interviews').add(interview);

            console.log(`Generated ${object.questions.length} questions for ${role} (${level})`);

            // Return in Vapi's expected format
            return Response.json({
                result: `Successfully generated ${object.questions.length} interview questions for the ${role} position.`,
            }, { status: 200 });

        } catch (error) {
            console.error('Error generating questions:', error);

            // Return 200 with error in result so Vapi assistant can communicate gracefully
            return Response.json({
                result: `Sorry, there was an error generating the interview questions. Please try again later.`,
            }, { status: 200 });
        }
    }

    // Fallback: handle direct API calls (for curl/testing)
    const { type, role, level, techstack, amount, userid } = body;

    try {
        const { object } = await generateObject({
            model: google('gemini-2.0-flash-001'),
            schema: z.object({
                questions: z.array(z.string()),
            }),
            prompt: `Prepare questions for a job interview.
        The job role is ${role}.
        The job experience level is ${level}.
        The tech stack used in the job is: ${techstack}.
        The focus between behavioural and technical questions should lean towards: ${type}.
        The amount of questions required is: ${amount}.
        The questions are going to be read by a voice assistant so do not use "/" or "*" or any other special characters which might break the voice assistant.`,
        });

        const interview = {
            role,
            type,
            level,
            techstack: typeof techstack === 'string' ? techstack.split(',').map((s: string) => s.trim()) : [techstack],
            questions: object.questions,
            userId: userid,
            finalized: true,
            coverImage: getRandomInterviewCover(),
            createdAt: new Date().toISOString(),
        };

        await db.collection('interviews').add(interview);

        return Response.json({ success: true, questions: object.questions }, { status: 200 });

    } catch (error) {
        console.error('Error in direct POST request:', error);

        return Response.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}