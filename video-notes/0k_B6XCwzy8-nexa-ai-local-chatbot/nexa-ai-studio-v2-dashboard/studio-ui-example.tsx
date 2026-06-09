"use client";

import { useState } from "react";

export default function Studio() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<any>(null);

  async function generate() {
    const res = await fetch("http://localhost:5006/studio/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        image: true,
        video: true,
        voice: false,
        style: "cinematic",
        duration: 4,
      }),
    });

    const data = await res.json();
    setResult(data);
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>NEXA AI STUDIO</h1>

      <textarea
        placeholder="Describe lo que quieres crear..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        style={{ width: "100%", height: 120 }}
      />

      <button onClick={generate}>GENERATE</button>

      {result && (
        <pre style={{ marginTop: 20 }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}

