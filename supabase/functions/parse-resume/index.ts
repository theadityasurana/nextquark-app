import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''
function getGeminiUrl(): string {
  const key = Deno.env.get('GEMINI_API_KEY') ?? GEMINI_API_KEY
  return `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`
}

const GEMINI_PROMPT = `You are an expert resume parser. Extract ALL information from this resume and return ONLY valid JSON.

CRITICAL — Work Experience vs Projects:
- "workExperience" = PAID JOBS or INTERNSHIPS at a COMPANY with a job title
- "projects" = PERSONAL, ACADEMIC, or OPEN-SOURCE PROJECTS the person built
- "Intern" or "Internship" at a company → workExperience
- Under a "PROJECTS" section → project
- Has "Exposure:" line → project
- NEVER mix them up

Return this EXACT JSON structure (this is how data is stored in the database):

{
  "firstName": "",
  "lastName": "",
  "phone": "number with country code e.g. +91 7776004343",
  "location": "city, country e.g. Bangalore, India",
  "email": "",
  "linkedInUrl": "full https:// URL e.g. https://linkedin.com/in/username",
  "githubUrl": "full https:// URL e.g. https://github.com/username — look for github.com links anywhere in the resume header, contact section, or project links",
  "headline": "short headline e.g. 'AI Engineering Intern at S&P Global'",
  "experienceLevel": "one of: internship, entry_level, junior, mid, senior, expert",

  "workExperience": [
    {
      "id": "e1",
      "title": "exact job title e.g. Artificial intelligence engineering intern",
      "company": "company name e.g. S&P Global",
      "employmentType": "one of: Full-time, Part-time, Internship, Contract, Freelance",
      "workMode": "one of: Remote, Onsite, Hybrid",
      "jobLocation": "city e.g. Hyderabad",
      "isCurrent": false,
      "startDate": "Month,Year or Month Year e.g. May,2024 or August 2024",
      "endDate": "Month,Year or null if current e.g. August,2024",
      "description": "ALL bullet points exactly as written, joined with newlines. Keep the bullet character (• or ●). Example:\n• Built X that did Y\n● Achieved Z with 40% improvement",
      "skills": ["Agentic AI", "RAG Pipelines", "LangChain"]
    }
  ],

  "education": [
    {
      "id": "edu1",
      "institution": "full name e.g. IIT BHU Varanasi",
      "degree": "e.g. Btech+ MTech or Bachelor of Technology",
      "field": "e.g. Engineering Physics or Computer Science",
      "startDate": "year e.g. 2020",
      "endDate": "year e.g. 2025",
      "description": "coursework or general notes, or empty string",
      "achievements": "GPA, dean's list, academic honors. e.g. GPA: 8.41/10",
      "extracurriculars": "clubs, societies, activities separated by newlines. e.g. Astronomy club\nFilm and media council\nTechnex"
    }
  ],

  "skills": [
    { "name": "Python", "level": "beginner|intermediate|advanced|expert", "yearsOfExperience": 2 }
  ],

  "projects": [
    {
      "id": "proj1",
      "title": "project name ONLY, no links or dates",
      "organization": "university or company or Personal Project e.g. IIT BHU",
      "date": "date range as written in resume e.g. May'25- Jun'25 or 2024-2025",
      "exposure": ["Agentic AI", "RAG", "LangChain", "Vector Databases", "MERN", "Firebase"],
      "bullets": [
        "First complete sentence describing what was built or achieved",
        "Second sentence with metrics or impact",
        "Each bullet should be a COMPLETE sentence, not broken mid-sentence"
      ],
      "link": "URL if mentioned, otherwise empty string"
    }
  ],

  "certifications": [
    { "id": "cert1", "name": "", "issuingOrganization": "", "credentialUrl": "", "skills": [] }
  ],

  "achievements": [
    { "id": "ach1", "title": "", "issuer": "", "date": "", "description": "" }
  ]
}

CRITICAL RULES:
1. Extract EVERY work experience, education, project, skill, certification, achievement — do NOT merge or skip any
2. MULTIPLE ENTRIES: If the resume has 3 projects, return 3 separate objects in the "projects" array. If it has 2 jobs, return 2 separate objects in "workExperience". NEVER combine multiple items into one entry.
3. For project "bullets": each bullet must be a COMPLETE sentence. If the resume splits a sentence across lines, JOIN them into one bullet. Do NOT break sentences mid-way.
4. For project "exposure": extract ALL technologies from "Exposure:" lines or "Tech Stack:" lines for THAT specific project only
5. For experience "description": preserve the original bullet points with • or ● characters for THAT specific job only
6. For experience "skills": extract technologies mentioned in THAT specific role only
7. For education: put GPA in "achievements", clubs/societies in "extracurriculars"
8. IDs must be unique: use e1,e2,e3 for experience, edu1,edu2 for education, proj1,proj2,proj3 for projects
9. Return ONLY the JSON, no markdown, no code blocks, no explanation
10. For GitHub URL: search the entire resume for github.com links — they may appear in the header, contact info, or next to project titles
11. For LinkedIn URL: search for linkedin.com/in/ links anywhere in the resume
12. SEPARATION: Each project/experience/education entry in the resume is typically separated by a title line, date line, or bold heading. Use these to identify where one entry ends and the next begins.
13. Do NOT put all bullet points from all projects into a single project. Each project's bullets belong ONLY to that project.

Resume text:
`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { base64 } = await req.json()

    if (!base64 || typeof base64 !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing base64 PDF data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    let rawText = ''
    try {
      const pdfParse = (await import('npm:pdf-parse@1.1.1')).default
      const result = await pdfParse(bytes)
      rawText = result.text || ''
    } catch (pdfErr) {
      console.error('[parse-resume] pdf-parse error:', pdfErr)
    }

    if (!rawText || rawText.trim().length < 20) {
      return new Response(
        JSON.stringify({ error: 'No readable text found in PDF', text: '' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[parse-resume] Extracted text length:', rawText.length)

    let parsedData = null
    if (GEMINI_API_KEY) {
      const MAX_ATTEMPTS = 2
      const RETRY_DELAY_MS = 5000

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          console.log(`[parse-resume] Gemini attempt ${attempt}/${MAX_ATTEMPTS}...`)
          const geminiResponse = await fetch(getGeminiUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: GEMINI_PROMPT + rawText }] }],
              generationConfig: { temperature: 0.05, maxOutputTokens: 8192 },
            }),
          })

          if (geminiResponse.ok) {
            const geminiData = await geminiResponse.json()
            const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''
            const jsonStr = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
            const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              parsedData = JSON.parse(jsonMatch[0])
              console.log('[parse-resume] Gemini success on attempt', attempt)
              console.log('[parse-resume] Exp:', parsedData.workExperience?.length,
                'Edu:', parsedData.education?.length,
                'Proj:', parsedData.projects?.length,
                'Skills:', parsedData.skills?.length,
                'Certs:', parsedData.certifications?.length,
                'Ach:', parsedData.achievements?.length)
              break
            }
          } else if ((geminiResponse.status === 429 || geminiResponse.status === 503) && attempt < MAX_ATTEMPTS) {
            console.log(`[parse-resume] Rate limited (${geminiResponse.status}), retrying in ${RETRY_DELAY_MS / 1000}s...`)
            await new Promise(r => setTimeout(r, RETRY_DELAY_MS))
            continue
          } else {
            console.error('[parse-resume] Gemini error:', geminiResponse.status, await geminiResponse.text())
            break
          }
        } catch (geminiErr) {
          console.error('[parse-resume] Gemini attempt', attempt, 'error:', geminiErr)
          if (attempt < MAX_ATTEMPTS) await new Promise(r => setTimeout(r, RETRY_DELAY_MS))
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        text: rawText,
        parsed: parsedData,
        method: parsedData ? 'gemini' : 'text-only',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('[parse-resume] Error:', e)
    return new Response(
      JSON.stringify({ error: 'Failed to parse PDF' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
