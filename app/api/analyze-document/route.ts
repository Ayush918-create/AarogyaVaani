import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 120;

type SourceType = 'medical_document' | 'report';
type Extraction = { summary:string; patient_name:string|null; doctor_name:string|null; document_date:string|null; document_type:'prescription'|'lab_report'|'medical_report'|'discharge_summary'|'other'; medicines:Array<{name:string;dosage:string|null;frequency:string|null;duration:string|null;instructions:string|null}>; diagnoses_mentioned:string[]; tests_or_results:string[]; warnings_or_followups:string[]; confidence_note:string };
const fail = (message:string,status=400) => NextResponse.json({error:message},{status});
const asString = (value:unknown) => typeof value === 'string' ? value.trim() : '';

function normalizeExtraction(value:unknown):Extraction {
  const raw = value && typeof value === 'object' ? value as Record<string,unknown> : {};
  const list = (input:unknown) => Array.isArray(input) ? input.map(asString).filter(Boolean) : [];
  const nullable = (input:unknown) => asString(input) || null;
  const documentType = asString(raw.document_type);
  const validType = ['prescription','lab_report','medical_report','discharge_summary','other'].includes(documentType) ? documentType as Extraction['document_type'] : 'other';
  const medicines = Array.isArray(raw.medicines) ? raw.medicines.map(item=>{
    const medicine = item && typeof item === 'object' ? item as Record<string,unknown> : {};
    return {name:asString(medicine.name),dosage:nullable(medicine.dosage),frequency:nullable(medicine.frequency),duration:nullable(medicine.duration),instructions:nullable(medicine.instructions)};
  }).filter(item=>item.name) : [];
  return {summary:asString(raw.summary) || 'No concise summary could be extracted from this document.',patient_name:nullable(raw.patient_name),doctor_name:nullable(raw.doctor_name),document_date:nullable(raw.document_date),document_type:validType,medicines,diagnoses_mentioned:list(raw.diagnoses_mentioned),tests_or_results:list(raw.tests_or_results),warnings_or_followups:list(raw.warnings_or_followups),confidence_note:asString(raw.confidence_note) || 'Verify extracted information against the original document.'};
}

function parseGeminiJson(text:string){
  const candidate = text.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
  return normalizeExtraction(JSON.parse(candidate));
}

async function readWithAzure(bytes:Buffer){
  const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT?.replace(/\/$/,'');
  const key = process.env.AZURE_DOCUMENT_INTELLIGENCE_API_KEY;
  if(!endpoint || !key) throw new Error('OCR is not configured.');
  const start = await fetch(`${endpoint}/documentintelligence/documentModels/prebuilt-read:analyze?api-version=2024-11-30`,{method:'POST',headers:{'Ocp-Apim-Subscription-Key':key,'Content-Type':'application/json'},body:JSON.stringify({base64Source:bytes.toString('base64')})});
  if(!start.ok) throw new Error('OCR request could not be started.');
  const operation = start.headers.get('operation-location');
  if(!operation) throw new Error('OCR service did not return a status location.');
  for(let attempt=0;attempt<45;attempt++){
    await new Promise(resolve=>setTimeout(resolve,2000));
    const status = await fetch(operation,{headers:{'Ocp-Apim-Subscription-Key':key}});
    if(!status.ok) throw new Error('OCR status could not be read.');
    const body = await status.json() as {status?:string;analyzeResult?:{content?:string}};
    if(body.status === 'succeeded') return body.analyzeResult?.content?.trim() || '';
    if(body.status === 'failed') throw new Error('OCR could not read this document.');
  }
  throw new Error('OCR timed out. Please try again.');
}

async function analyzeWithGemini(ocrText:string){
  const key = process.env.GEMINI_API_KEY;
  if(!key) return fallbackExtraction(ocrText, 'AI analysis is not configured.');
  const instruction = `You are a medical document information extraction assistant. Analyze ONLY the information explicitly present in the OCR text. Do not diagnose the patient. Do not invent or infer medical conditions. Do not prescribe medicines. Do not change dosage, frequency, duration, or instructions. If information is missing, return null or an empty array. Preserve medicine names and dosage information exactly as written where possible. This is information extraction, not medical advice. Return JSON only matching this schema: {"summary":"string","patient_name":"string or null","doctor_name":"string or null","document_date":"string or null","document_type":"prescription | lab_report | medical_report | discharge_summary | other","medicines":[{"name":"string","dosage":"string or null","frequency":"string or null","duration":"string or null","instructions":"string or null"}],"diagnoses_mentioned":[],"tests_or_results":[],"warnings_or_followups":[],"confidence_note":"string"}. OCR text follows:\n\n${ocrText.slice(0,50000)}`;
  const models = Array.from(new Set([process.env.GEMINI_MODEL, 'gemini-2.5-flash', 'gemini-2.0-flash'].filter(Boolean))) as string[];
  for (const model of models) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{role:'user',parts:[{text:instruction}]}],generationConfig:{responseMimeType:'application/json',temperature:0}})});
      if(!response.ok) continue;
      const body = await response.json() as {candidates?:Array<{content?:{parts?:Array<{text?:string}>}}>};
      const text = body.candidates?.[0]?.content?.parts?.map(part=>part.text||'').join('') || '';
      if(text) return parseGeminiJson(text);
    } catch { /* try the next supported model */ }
  }
  return fallbackExtraction(ocrText, 'AI formatting was unavailable, so this is an OCR-only extraction.');
}

function fallbackExtraction(ocrText:string, confidenceNote:string):Extraction {
  const excerpt = ocrText.replace(/\s+/g,' ').trim().slice(0,1400);
  return {
    summary: excerpt ? `OCR extracted the following document text for clinician review: ${excerpt}` : 'No readable text was extracted.',
    patient_name:null, doctor_name:null, document_date:null, document_type:'other', medicines:[], diagnoses_mentioned:[], tests_or_results:[], warnings_or_followups:[], confidence_note: `${confidenceNote} Verify every item against the original document.`,
  };
}

export async function POST(request:NextRequest){
  try {
    const authorization = request.headers.get('authorization');
    if(!authorization?.startsWith('Bearer ')) return fail('Please sign in before analyzing a document.',401);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if(!url || !publishableKey) return fail('Document analysis is temporarily unavailable.',503);
    const client = createClient(url,publishableKey,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
    const {data:{user}} = await client.auth.getUser();
    if(!user) return fail('Please sign in before analyzing a document.',401);
    const input = await request.json() as {source_type?:SourceType;source_id?:string;file_path?:string};
    if((input.source_type!=='medical_document' && input.source_type!=='report') || !input.source_id || !input.file_path) return fail('The document request is incomplete.');
    const patientResult = await client.from('patients').select('id').eq('user_id',user.id).single();
    if(patientResult.error || !patientResult.data) return fail('Your patient profile is not available.',403);
    const table = input.source_type === 'report' ? 'reports' : 'medical_documents';
    const source = await client.from(table).select('id,patient_id,storage_path').eq('id',input.source_id).eq('patient_id',patientResult.data.id).single();
    if(source.error || !source.data || source.data.storage_path !== input.file_path || !input.file_path.startsWith(`patients/${patientResult.data.id}/`)) return fail('This document is not available for analysis.',403);
    const downloaded = await client.storage.from('medical-files').download(input.file_path);
    if(downloaded.error || !downloaded.data) return fail('The original document could not be read.',422);
    const buffer = Buffer.from(await downloaded.data.arrayBuffer());
    if(!buffer.length || buffer.length > 15*1024*1024) return fail('Only documents up to 15 MB can be analyzed.',422);
    const ocrText = await readWithAzure(buffer);
    if(!ocrText) return fail('No readable text was found in this document.',422);
    const analysis = await analyzeWithGemini(ocrText);
    const existing = await client.from('document_ai_analyses').select('id').eq('source_type',input.source_type).eq('source_id',input.source_id).maybeSingle();
    const payload = {user_id:user.id,patient_id:patientResult.data.id,source_type:input.source_type,source_id:input.source_id,file_path:input.file_path,ocr_text:ocrText,summary:analysis.summary,analysis,updated_at:new Date().toISOString()};
    const stored = existing.data ? await client.from('document_ai_analyses').update(payload).eq('id',existing.data.id).select().single() : await client.from('document_ai_analyses').insert(payload).select().single();
    if(stored.error) return fail('Analysis finished but could not be saved. Please try again.',500);
    return NextResponse.json({analysis:stored.data});
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Document analysis could not be completed.';
    const safe = ['OCR is not configured.','AI analysis is not configured.','OCR could not read this document.','OCR timed out. Please try again.','No readable text was found in this document.','AI extraction could not be completed.','AI extraction returned an unreadable result.'].includes(message) ? message : 'Document analysis could not be completed. Please try again.';
    return fail(safe,502);
  }
}
