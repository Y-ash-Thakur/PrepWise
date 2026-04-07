import { db } from '@/firebase/admin';
import { getRandomInterviewCover } from '@/lib/utils';
import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

export async function GET() {
    return Response.json({ success: true, data: 'Vapi webhook is live' }, { status: 200 });
}

export async function POST(request: Request) {
    const body = await request.json();

    // Log the full payload for debugging
    console.log('Vapi webhook received:', JSON.stringify(body, null, 2));

    const message = body.message;

    // Only handle function-call messages
    if (message?.type === 'function-call') {
        const functionName = message.functionCall?.name;
        const params = message.functionCall?.parameters || {};
        const call = message.call;

        console.log(`Function call: ${functionName}`, params);

        // Extract userid from variable values (passed during vapi.start())
        const userid =
            call?.assistantOverrides?.variableValues?.userid ||
            call?.assistant?.variableValues?.userid ||
            call?.metadata?.userid ||
            '';

        // ─── generate_questions ───
        if (functionName === 'generate_questions') {
            // Map Vapi param names → internal names
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

                return Response.json({
                    result: `Successfully generated ${object.questions.length} interview questions for the ${role} position.`,
                }, { status: 200 });

            } catch (error) {
                console.error('Error generating questions:', error);
                return Response.json({
                    result: 'Sorry, there was an error generating the interview questions. Please try again later.',
                }, { status: 200 });
            }
        }

        // ─── record_answer ───
        if (functionName === 'record_answer') {
            const { answer, questionIndex } = params;
            console.log(`Answer recorded for question ${questionIndex}: ${answer?.substring(0, 100)}...`);

            return Response.json({
                result: 'Answer recorded successfully. Please proceed with the next question.',
            }, { status: 200 });
        }

        // ─── Unknown function ───
        console.warn(`Unknown function call: ${functionName}`);
        return Response.json({
            result: `Unknown function: ${functionName}`,
        }, { status: 200 });
    }

    // Handle other Vapi webhook event types (status-update, end-of-call-report, etc.)
    console.log('Non-function-call webhook event:', message?.type || 'unknown');

    return Response.json({ success: true }, { status: 200 });
}
