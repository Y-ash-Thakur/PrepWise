export async function POST(request: Request) {
    const body = await request.json();

    // Log for debugging
    console.log('Vapi record_answer webhook received:', JSON.stringify(body, null, 2));

    const message = body.message;

    if (message?.type === 'function-call') {
        const { functionCall } = message;
        const params = functionCall?.parameters || {};
        const { answer, questionIndex } = params;

        console.log(`Answer recorded for question ${questionIndex}: ${answer?.substring(0, 100)}...`);

        // Acknowledge receipt — the full transcript is captured client-side
        // by the Agent component's message handler and can be used for feedback generation
        return Response.json({
            result: 'Answer recorded successfully. Please proceed with the next question.',
        }, { status: 200 });
    }

    return Response.json({
        result: 'Invalid request format.',
    }, { status: 400 });
}
