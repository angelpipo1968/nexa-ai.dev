const apiKey = "AIzaSyD04UUlvUYXN25oQKkn1VCZE5fprBOCNaI";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

async function listModels() {
    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log("Status:", response.status);
        if (data.models) {
            console.log("Models:", data.models.map(m => m.name).join(", "));
        } else {
            console.log("Error:", JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

listModels();
