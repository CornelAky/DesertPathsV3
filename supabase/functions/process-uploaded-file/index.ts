import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ProcessFileRequest {
  fileId: string;
  tripId: string;
  openaiApiKey?: string;
}

interface ExtractedEntry {
  day_number?: number;
  date?: string;
  time?: string;
  activity?: string;
  location?: string;
  hotel?: string;
  restaurant?: string;
  access_method?: string;
  transportation?: string;
  comments?: string;
  confidence_score?: number;
  row_order: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { fileId, tripId, openaiApiKey }: ProcessFileRequest = await req.json();

    if (!fileId || !tripId) {
      return new Response(
        JSON.stringify({ error: "fileId and tripId are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get file metadata
    const { data: fileData, error: fileError } = await supabase
      .from("uploaded_files")
      .select("id, journey_id, file_name, file_url, file_type, file_size, processing_status")
      .eq("id", fileId)
      .single();

    if (fileError || !fileData) {
      return new Response(
        JSON.stringify({ error: "File not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update status to processing
    await supabase
      .from("uploaded_files")
      .update({ processing_status: "processing" })
      .eq("id", fileId);

    // Download file from storage
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from("itinerary-uploads")
      .download(fileData.file_url);

    if (downloadError || !fileBlob) {
      await supabase
        .from("uploaded_files")
        .update({
          processing_status: "failed",
          error_message: "Failed to download file",
        })
        .eq("id", fileId);

      return new Response(
        JSON.stringify({ error: "Failed to download file" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Process file based on type
    let extractedData: ExtractedEntry[] = [];

    if (!openaiApiKey) {
      // Fallback: extract basic structure without AI
      extractedData = await extractBasicStructure(fileBlob, fileData.file_type);
    } else {
      // Use OpenAI to extract structured data
      extractedData = await extractWithAI(fileBlob, fileData.file_type, openaiApiKey);
    }

    // Save extracted data to database
    const dataToInsert = extractedData.map((entry) => ({
      uploaded_file_id: fileId,
      trip_id: tripId,
      ...entry,
    }));

    const { error: insertError } = await supabase
      .from("extracted_itinerary_data")
      .insert(dataToInsert);

    if (insertError) {
      await supabase
        .from("uploaded_files")
        .update({
          processing_status: "failed",
          error_message: `Failed to save extracted data: ${insertError.message}`,
        })
        .eq("id", fileId);

      return new Response(
        JSON.stringify({ error: "Failed to save extracted data" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update status to completed
    await supabase
      .from("uploaded_files")
      .update({
        processing_status: "completed",
        processed_at: new Date().toISOString(),
      })
      .eq("id", fileId);

    return new Response(
      JSON.stringify({
        success: true,
        extractedCount: extractedData.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing file:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function extractBasicStructure(
  fileBlob: Blob,
  fileType: string
): Promise<ExtractedEntry[]> {
  // Basic extraction without AI
  // For now, return empty array - user will need to manually enter data
  return [
    {
      comments: "Please review and fill in the details from the uploaded file.",
      confidence_score: 0,
      row_order: 0,
    },
  ];
}

async function extractWithAI(
  fileBlob: Blob,
  fileType: string,
  apiKey: string
): Promise<ExtractedEntry[]> {
  try {
    const arrayBuffer = await fileBlob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Prepare OpenAI request
    let content: any[] = [];

    if (fileType.startsWith("image/")) {
      content = [
        {
          type: "text",
          text: `Extract itinerary data from this image. Return a JSON array of objects with these fields: day_number, date (YYYY-MM-DD), time, activity, location, hotel, restaurant, access_method, transportation, comments. Include a confidence_score (0-1) for each entry. Preserve the order from the image.`,
        },
        {
          type: "image_url",
          image_url: {
            url: `data:${fileType};base64,${base64}`,
          },
        },
      ];
    } else {
      // For PDFs and other documents, convert to text first
      const text = await fileBlob.text();
      content = [
        {
          type: "text",
          text: `Extract itinerary data from this document content:\n\n${text}\n\nReturn a JSON array of objects with these fields: day_number, date (YYYY-MM-DD), time, activity, location, hotel, restaurant, access_method, transportation, comments. Include a confidence_score (0-1) for each entry. Preserve the order from the document.`,
        },
      ];
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: fileType.startsWith("image/") ? "gpt-4o" : "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const result = await response.json();
    const extractedText = result.choices[0].message.content;
    const parsed = JSON.parse(extractedText);

    // Ensure the response is an array
    const entries = Array.isArray(parsed) ? parsed : parsed.entries || [];

    return entries.map((entry: any, index: number) => ({
      day_number: entry.day_number || null,
      date: entry.date || null,
      time: entry.time || null,
      activity: entry.activity || null,
      location: entry.location || null,
      hotel: entry.hotel || null,
      restaurant: entry.restaurant || null,
      access_method: entry.access_method || null,
      transportation: entry.transportation || null,
      comments: entry.comments || null,
      confidence_score: entry.confidence_score || 0.5,
      row_order: index,
    }));
  } catch (error) {
    console.error("AI extraction error:", error);
    // Fallback to basic extraction
    return extractBasicStructure(fileBlob, fileType);
  }
}
