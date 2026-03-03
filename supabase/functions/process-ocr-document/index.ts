import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

interface OcrRequest {
  documentId: string;
  tripId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  let documentId: string | null = null;

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const requestData: OcrRequest = await req.json();
    documentId = requestData.documentId;
    const tripId = requestData.tripId;
    const startTime = Date.now();

    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured. Please configure the API key in environment variables.");
    }

    // Update document status to processing
    await supabaseClient
      .from("uploaded_documents")
      .update({ ocr_status: "processing" })
      .eq("id", documentId);

    // Fetch document details
    const { data: document, error: docError } = await supabaseClient
      .from("uploaded_documents")
      .select("id, journey_id, file_name, storage_path, file_type, file_size, ocr_status")
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      throw new Error("Document not found in database");
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabaseClient
      .storage
      .from("itinerary-documents")
      .download(document.storage_path);

    if (downloadError) {
      console.error("Storage download error:", downloadError);
      throw new Error(`Failed to download file from storage: ${downloadError.message}`);
    }

    if (!fileData) {
      throw new Error("File data is empty or corrupted");
    }

    // Convert file to base64 for Claude API
    let base64Data = "";
    let mediaType = "image/jpeg";

    try {
      if (document.file_type.startsWith("image/")) {
        const arrayBuffer = await fileData.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        base64Data = btoa(String.fromCharCode(...bytes));
        mediaType = document.file_type;
      } else if (document.file_type === "application/pdf") {
        const arrayBuffer = await fileData.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        base64Data = btoa(String.fromCharCode(...bytes));
        mediaType = "application/pdf";
      } else if (
        document.file_type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        document.file_type === "application/msword" ||
        document.file_type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        document.file_type === "application/vnd.ms-excel"
      ) {
        throw new Error(
          "Word and Excel files must be converted to PDF first. Please save your document as a PDF and upload again."
        );
      } else {
        throw new Error(
          `This file type is not supported for OCR processing. Please use PDF or image files (JPG, PNG).`
        );
      }
    } catch (conversionError) {
      console.error("File conversion error:", conversionError);
      if (conversionError instanceof Error) {
        throw conversionError;
      }
      throw new Error("Failed to process file - file may be corrupted or unreadable");
    }

    // Call Claude API for document analysis
    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64Data,
                },
              },
              {
                type: "text",
                text: `Analyze this travel itinerary document and extract ALL itinerary information in a structured format.

Please extract and return a JSON object with:
1. "raw_text": The complete extracted text from the document
2. "items": An array of itinerary items, where each item has:
   - day_number: integer (day of the trip)
   - date: date string in YYYY-MM-DD format (if available)
   - time: time string (if available)
   - activity: description of activity/event
   - location: location/venue name and address
   - accommodation: hotel/lodging information (if mentioned)
   - meals: meal information (breakfast, lunch, dinner)
   - transportation: transportation/pickup details
   - notes: any additional notes or comments

Extract as much detail as possible. If a field is not available, set it to null or empty string.
Return ONLY valid JSON, no additional text.

Example format:
{
  "raw_text": "Full document text here...",
  "items": [
    {
      "day_number": 1,
      "date": "2024-01-15",
      "time": "09:00",
      "activity": "Airport pickup and hotel check-in",
      "location": "Marrakech Airport to Hotel Riad",
      "accommodation": "Hotel Riad Marrakech",
      "meals": "Dinner included",
      "transportation": "Private transfer",
      "notes": "Meet at arrivals hall"
    }
  ]
}`,
              },
            ],
          },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.error("Anthropic API error:", errorText);
      throw new Error(`OCR service error: ${anthropicResponse.statusText}`);
    }

    const anthropicData = await anthropicResponse.json();
    const responseText = anthropicData.content[0].text;

    // Parse the JSON response
    let extractedData;
    try {
      extractedData = JSON.parse(responseText);
    } catch (e) {
      // If JSON parsing fails, try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        console.error("Failed to parse OCR response:", responseText);
        throw new Error("Failed to extract structured data from document");
      }
    }

    const processingTime = Date.now() - startTime;

    // Validate extracted data
    if (!extractedData.items || !Array.isArray(extractedData.items) || extractedData.items.length === 0) {
      // Partial success - we got text but no structured items
      const { data: extraction } = await supabaseClient
        .from("ocr_extractions")
        .insert({
          document_id: documentId,
          raw_text: extractedData.raw_text || responseText,
          structured_data: extractedData,
          confidence_score: 0.5,
          processing_time_ms: processingTime,
          processing_status: 'partial',
          error_message: 'Could not extract structured itinerary data',
          error_type: 'ocr_partial',
        })
        .select()
        .single();

      await supabaseClient
        .from("uploaded_documents")
        .update({ ocr_status: "completed" })
        .eq("id", documentId);

      return new Response(
        JSON.stringify({
          success: true,
          status: 'partial',
          extractionId: extraction?.id,
          itemsCount: 0,
          processingTime,
          message: 'Document was read but no itinerary items could be extracted',
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Save extraction to database
    const { data: extraction, error: extractionError } = await supabaseClient
      .from("ocr_extractions")
      .insert({
        document_id: documentId,
        raw_text: extractedData.raw_text || "",
        structured_data: extractedData,
        confidence_score: 0.95,
        processing_time_ms: processingTime,
        processing_status: 'completed',
      })
      .select()
      .single();

    if (extractionError) {
      console.error("Database insertion error:", extractionError);
      throw extractionError;
    }

    // Save individual itinerary items
    const items = extractedData.items.map((item: any) => ({
      extraction_id: extraction.id,
      trip_id: tripId,
      day_number: item.day_number || null,
      date: item.date || null,
      time: item.time || "",
      activity: item.activity || "",
      location: item.location || "",
      accommodation: item.accommodation || "",
      meals: item.meals || "",
      transportation: item.transportation || "",
      notes: item.notes || "",
      is_reviewed: false,
      is_imported: false,
    }));

    const { error: itemsError } = await supabaseClient
      .from("ocr_itinerary_items")
      .insert(items);

    if (itemsError) {
      console.error("Items insertion error:", itemsError);
      throw itemsError;
    }

    // Update document status to completed
    await supabaseClient
      .from("uploaded_documents")
      .update({ ocr_status: "completed" })
      .eq("id", documentId);

    return new Response(
      JSON.stringify({
        success: true,
        status: 'completed',
        extractionId: extraction.id,
        itemsCount: extractedData.items.length,
        processingTime,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("OCR processing error:", error);

    // Determine error type
    let errorCode = 'UNKNOWN';
    let errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    if (errorMessage.includes('ANTHROPIC_API_KEY')) {
      errorCode = 'OCR_FAILED';
      errorMessage = 'OCR service is not available. Please contact support.';
    } else if (errorMessage.includes('converted to PDF first') || errorMessage.includes('Word and Excel')) {
      errorCode = 'UNSUPPORTED_FORMAT';
    } else if (errorMessage.includes('not supported for OCR')) {
      errorCode = 'UNSUPPORTED_FORMAT';
    } else if (errorMessage.includes('corrupted') || errorMessage.includes('unreadable')) {
      errorCode = 'CORRUPTED';
    } else if (errorMessage.includes('empty')) {
      errorCode = 'CORRUPTED';
      errorMessage = 'File is empty or could not be read. Please check the file and try again.';
    } else if (errorMessage.includes('extract') || errorMessage.includes('structured data')) {
      errorCode = 'OCR_FAILED';
      errorMessage = 'Could not extract itinerary data from this file. The file may not contain structured itinerary information.';
    } else if (errorMessage.includes('storage') || errorMessage.includes('download')) {
      errorCode = 'UPLOAD_FAILED';
      errorMessage = 'File upload failed. Please try again.';
    } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      errorCode = 'NETWORK_ERROR';
      errorMessage = 'Network connection issue. Please check your connection and try again.';
    }

    // Update document status to failed
    if (documentId) {
      try {
        const supabaseClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );
        await supabaseClient
          .from("uploaded_documents")
          .update({
            ocr_status: "failed",
            metadata: { error_code: errorCode, error_message: errorMessage }
          })
          .eq("id", documentId);
      } catch (e) {
        console.error("Failed to update document status:", e);
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        errorCode,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});