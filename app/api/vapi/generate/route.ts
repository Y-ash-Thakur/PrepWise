import { db } from '@/firebase/admin';
import { getRandomInterviewCover } from '@/lib/utils';
import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

export async function GET() {
    return Response.json({ success: true, data: 'THANK YOU' }, { status: 200 });
}

export async function POST(request: Request) {
    const { type, role, level, techstack, amount, userid } = await request.json();

    try {
        const { object } = await generateObject({
            model: google('gemini-1.5-flash'),
            schema: z.object({
                questions: z.array(z.string())
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
            role, type, level,
            techstack: techstack.split(','),
            questions: object.questions,
            userId: userid,
            finalized: true,
            coverImage: getRandomInterviewCover(),
            createdAt: new Date().toISOString(),
        }

        await db.collection('interviews').add(interview);

        return Response.json({ success: true, questions: object.questions }, { status: 200 });

    } catch (error) {
        console.error('Error in POST request:', error);

        return Response.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}