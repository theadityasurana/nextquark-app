const ALLOWED_MIME_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = (formData as any).get('file') as File | null;
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate file type
    const fileType = file.type || '';
    const fileName = file.name || '';
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(fileType) && !['pdf', 'doc', 'docx'].includes(ext || '')) {
      return new Response(JSON.stringify({ error: 'Invalid file type. Only PDF, DOC, and DOCX files are allowed.' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: 'File too large. Maximum size is 10MB.' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Read file as base64
    const bytes = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(bytes)));
    
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || 'AIzaSyBPoWkh6Y-WHAqXq__TTOlPyk23dMpNsx4';
    
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: 'Extract resume information and return ONLY valid JSON with this exact structure: {"firstName":"","lastName":"","phone":"","location":"","headline":"","linkedInUrl":"","workExperience":[{"id":"1","title":"","company":"","employmentType":"Full-time","location":"","isRemote":false,"startMonth":"","startYear":"","endMonth":"","endYear":"","isCurrent":false,"description":""}],"education":[{"id":"1","institution":"","degree":"","field":"","startYear":"","endYear":""}],"skills":[{"name":"","level":"intermediate","yearsOfExperience":2}]}. Return ONLY JSON, no markdown.' },
              { inline_data: { mime_type: fileType || 'application/pdf', data: base64 } }
            ]
          }]
        })
      }
    );

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errText);
      return new Response(JSON.stringify({ error: 'Failed to parse resume. Please try again.' }), { 
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const geminiData = await geminiResponse.json();
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    if (!text) {
      return new Response(JSON.stringify({ error: 'No content extracted from resume.' }), { 
        status: 422,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Safe JSON extraction and parsing
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: 'Could not extract structured data from resume.' }), { 
        status: 422,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('JSON parse error from Gemini response:', parseError);
      return new Response(JSON.stringify({ error: 'Failed to parse extracted resume data. Please try a different file.' }), { 
        status: 422,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Parse resume error:', message);
    return new Response(JSON.stringify({ error: 'Internal server error processing resume.' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
