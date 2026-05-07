async function testArchitectMode() {
    console.log("🚀 Testing Nexa Architect Mode for VS Code Dominance...");
    
    const prompt = "Actúa como un Architect de Nexa. Necesito crear un nuevo componente React llamado 'VscodeBridge.tsx' en 'src/components' y su archivo de estilos 'VscodeBridge.css'. Genera ambos archivos usando el formato estructurado: FILE: ruta/archivo.ext seguido de ```codigo```.";

    try {
        const response = await fetch('http://localhost:3001/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: prompt,
                userId: 'vscode-test',
                priority: 'quality',
                context: []
            })
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}`);
        }

        const data = await response.json();
        const text = data.response;
        
        console.log("\n✅ Response from Nexa Architect:");
        console.log("-----------------------------------");
        console.log(text.substring(0, 500) + "...");
        console.log("-----------------------------------");

        // Verify structure for VS Code Dominance
        const fileMatch = /FILE:\s*([^\n\r]+)\r?\n```/.test(text);
        if (fileMatch) {
            console.log("\n✨ SUCCESS: Nexa followed the 'FILE:' format. VS Code can apply these changes automatically!");
        } else {
            console.log("\n⚠️ WARNING: Nexa did not use the structured format. Dominance might be limited.");
        }

    } catch (error: any) {
        console.error("\n❌ TEST FAILED:", error.message);
    }
}

testArchitectMode();
