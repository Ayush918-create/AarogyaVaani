import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Deliberately returns only configuration presence, never secret values.
export async function GET(){
  const ocrConfigured=Boolean(process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT && process.env.AZURE_DOCUMENT_INTELLIGENCE_API_KEY);
  const aiConfigured=Boolean(process.env.GEMINI_API_KEY);
  const storageConfigured=Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  return NextResponse.json({ocrConfigured,aiConfigured,storageConfigured,model:process.env.GEMINI_MODEL||'gemini-2.5-flash'});
}
