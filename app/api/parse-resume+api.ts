import { parseResumeFromText, mapToOnboardingData } from '@/lib/resume-parser';

const ALLOWED_MIME_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = (formData as any).get('file') as File | null;

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileType = file.type || '';
    const fileName = file.name || '';
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(fileType) && !['pdf', 'doc', 'docx'].includes(ext || '')) {
      return Response.json({ error: 'Invalid file type. Only PDF, DOC, and DOCX files are allowed.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return Response.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text from PDF using pdf-parse
    let rawText = '';
    try {
      const pdfParser = new (await import('pdf-parse')).PDFParse({ data: buffer });
      const pdfData = await pdfParser.getText();
      rawText = pdfData.text;
    } catch (pdfError) {
      console.error('PDF parse error:', pdfError);
      return Response.json({ error: 'Could not read PDF file. Please ensure it is a valid PDF.' }, { status: 422 });
    }

    if (!rawText || rawText.trim().length < 20) {
      return Response.json({ error: 'No readable text found in the PDF. It may be a scanned image — please use a text-based PDF.' }, { status: 422 });
    }

    // Parse the extracted text into structured resume data
    const parsed = parseResumeFromText(rawText);
    const mapped = mapToOnboardingData(parsed);

    return Response.json({ success: true, data: mapped });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Parse resume error:', message);
    return Response.json({ error: 'Internal server error processing resume.' }, { status: 500 });
  }
}
