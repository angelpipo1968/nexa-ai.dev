async function testVSCodeBridge() {
    console.log("🚀 Testing Nexa VS Code Bridge (OpenAI Compatible)...");
    
    try {
        const response = await fetch('https://api.nexa-ai.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer nexa-test'
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'user', content: 'Hola Nexa, ¿estás lista para integrarte en VS Code?' }
                ]
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Error ${response.status}: ${err}`);
        }

        const data = await response.json();
        console.log("\n✅ Response from Nexa Bridge:");
        console.log(JSON.stringify(data, null, 2));
        
        if (data.choices?.[0]?.message?.content) {
            console.log("\n✨ SUCCESS: Nexa responded correctly in OpenAI format.");
        } else {
            console.log("\n⚠️ WARNING: Response format seems unusual.");
        }

    } catch (error: any) {
        console.error("\n❌ TEST FAILED:");
        console.error(error.message);
        console.log("\n💡 Make sure the Nexa API server is running on port 3001.");
    }
}

testVSCodeBridge();
