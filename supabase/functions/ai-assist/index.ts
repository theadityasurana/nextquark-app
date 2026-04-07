import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function getGeminiUrl(): string {
  const key = Deno.env.get('GEMINI_API_KEY') ?? ''
  return `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`
}

async function callGemini(prompt: string): Promise<string | null> {
  const url = getGeminiUrl()
  const MAX_ATTEMPTS = 2
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      console.log(`[ai-assist] Gemini attempt ${attempt}/${MAX_ATTEMPTS}`)
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || null
        console.log('[ai-assist] Gemini response length:', text?.length || 0)
        return text
      }
      if ((res.status === 429 || res.status === 503) && attempt < MAX_ATTEMPTS) {
        console.log(`[ai-assist] Rate limited (${res.status}), retrying in 5s...`)
        await new Promise(r => setTimeout(r, 5000))
        continue
      }
      const errText = await res.text()
      console.error('[ai-assist] Gemini error:', res.status, errText)
      return null
    } catch (e) {
      console.error('[ai-assist] Gemini exception on attempt', attempt, ':', e)
      if (attempt < MAX_ATTEMPTS) await new Promise(r => setTimeout(r, 5000))
    }
  }
  return null
}

async function generateCoverLetter(profile: any, job: any): Promise<string> {
  const hasJob = job.companyName && job.companyName.trim().length > 0
  const greeting = hasJob ? `Dear ${job.companyName} Hiring Team,` : 'Dear Hiring Manager,'

  const prompt = `Write a professional, compelling cover letter.
Keep it 250-350 words, professional but warm.
Do NOT include placeholder brackets like [Company Address].
Do NOT include a date or physical addresses.
Start with "${greeting}".

APPLICANT:
Name: ${profile.name || 'Applicant'}
Headline: ${profile.headline || ''}
Location: ${profile.location || ''}
Skills: ${(profile.skills || []).slice(0, 20).join(', ')}
Experience: ${(profile.experience || []).map((e: any) => `${e.title || ''} at ${e.company || ''} — ${(e.description || '').slice(0, 200)}`).join('\n')}
Education: ${(profile.education || []).map((e: any) => `${e.degree || ''} ${e.field ? 'in ' + e.field : ''} at ${e.institution || ''}`).join(', ')}
Projects: ${(profile.projects || []).map((p: any) => p.title || '').join(', ')}

${hasJob ? `JOB:
Title: ${job.jobTitle || ''}
Company: ${job.companyName || ''}
Location: ${job.location || ''}
Type: ${job.employmentType || ''}
Description: ${(job.description || '').slice(0, 1000)}
Requirements: ${(job.requirements || []).join(', ')}
Skills needed: ${(job.skills || []).join(', ')}` : 'Write a general-purpose cover letter that highlights the applicant\'s strongest qualifications.'}

Write ONLY the cover letter text.`

  const result = await callGemini(prompt)
  return result || ''
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { action, profile, job } = body

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      console.error('[ai-assist] GEMINI_API_KEY not set')
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[ai-assist] Action:', action)

    switch (action) {
      case 'cover-letter': {
        if (!profile) {
          return new Response(
            JSON.stringify({ error: 'Missing profile data' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        const letter = await generateCoverLetter(profile, job || {})
        if (!letter) {
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to generate cover letter' }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        return new Response(
          JSON.stringify({ success: true, coverLetter: letter }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (e) {
    console.error('[ai-assist] Error:', e)
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
