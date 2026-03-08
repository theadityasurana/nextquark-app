export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as any;
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Read file as base64
    const response = await fetch(file.uri);
    const blob = await response.blob();
    const bytes = await blob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(bytes)));
    
    // Call Gemini API directly
    const apiKey = 'AIzaSyBPoWkh6Y-WHAqXq__TTOlPyk23dMpNsx4';
    
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: 'Extract resume information and return ONLY valid JSON with this exact structure: {"firstName":"","lastName":"","phone":"","location":"","headline":"","linkedInUrl":"","workExperience":[{"id":"1","title":"","company":"","employmentType":"Full-time","location":"","isRemote":false,"startMonth":"","startYear":"","endMonth":"","endYear":"","isCurrent":false,"description":""}],"education":[{"id":"1","institution":"","degree":"","field":"","startYear":"","endYear":""}],"skills":[{"name":"","level":"intermediate","yearsOfExperience":2}]}. Return ONLY JSON, no markdown.' },
              { inline_data: { mime_type: file.type || 'application/pdf', data: base64 } }
            ]
          }]
        })
      }
    );

    const geminiData = await geminiResponse.json();
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    
    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Parse error:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
