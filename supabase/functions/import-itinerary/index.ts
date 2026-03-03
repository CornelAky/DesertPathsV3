import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ItineraryDay {
  day_number: number;
  title: string;
  description: string;
  accommodation?: {
    name: string;
    type: string;
    description?: string;
    check_in?: string;
    check_out?: string;
  };
  activities?: Array<{
    title: string;
    description: string;
    start_time?: string;
    end_time?: string;
    location?: string;
  }>;
  dining?: Array<{
    name: string;
    meal_type: string;
    cuisine_type?: string;
    description?: string;
    reservation_time?: string;
  }>;
}

interface ExtractedItinerary {
  trip_name: string;
  destination: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  days: ItineraryDay[];
}

async function extractTextFromFile(file: File, fileType: string): Promise<string> {
  try {
    if (fileType.includes('image')) {
      // For images, convert to base64 and use AI vision
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      return `[IMAGE_DATA:${base64.substring(0, 100)}...]`;
    } else if (fileType.includes('pdf')) {
      // For PDF, extract text content
      const text = await file.text();
      return text;
    } else {
      // For text-based files (Word, Excel as XML, plain text)
      return await file.text();
    }
  } catch (error) {
    console.error('Error extracting text:', error);
    return '';
  }
}

function parseItineraryWithAI(content: string, fileName: string): ExtractedItinerary {
  // This is a simplified parser - in production, you'd use a proper AI model
  // For now, we'll create a basic structure that the user can edit
  
  const lines = content.split('\n').filter(line => line.trim());
  
  // Try to extract trip name from filename or first line
  const trip_name = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  
  // Look for common patterns
  let destination = 'Unknown Destination';
  let description = '';
  const days: ItineraryDay[] = [];
  
  // Simple pattern matching for destination
  const destPattern = /(?:to|in|visit|destination)\s+([A-Z][a-zA-Z\s,]+)/i;
  const destMatch = content.match(destPattern);
  if (destMatch) {
    destination = destMatch[1].trim();
  }
  
  // Look for day markers
  const dayPattern = /day\s+(\d+)|^(\d+)\./gim;
  let currentDay: ItineraryDay | null = null;
  let dayNumber = 1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const dayMatch = line.match(/day\s+(\d+)/i);
    
    if (dayMatch || line.match(/^\d+\./)) {
      // Start new day
      if (currentDay) {
        days.push(currentDay);
      }
      
      currentDay = {
        day_number: dayMatch ? parseInt(dayMatch[1]) : dayNumber++,
        title: line.replace(/day\s+\d+:?\s*/i, '').replace(/^\d+\.\s*/, '').trim() || `Day ${dayNumber}`,
        description: '',
        activities: []
      };
    } else if (currentDay && line.trim()) {
      // Add to current day description
      currentDay.description += (currentDay.description ? ' ' : '') + line.trim();
      
      // Look for accommodation keywords
      if (/hotel|lodge|camp|accommodation|stay/i.test(line)) {
        if (!currentDay.accommodation) {
          currentDay.accommodation = {
            name: line.trim(),
            type: 'hotel',
            description: line.trim()
          };
        }
      }
      
      // Look for activity keywords
      if (/visit|explore|tour|activity|hike|drive|safari/i.test(line)) {
        currentDay.activities = currentDay.activities || [];
        currentDay.activities.push({
          title: line.trim(),
          description: line.trim()
        });
      }
      
      // Look for dining keywords
      if (/breakfast|lunch|dinner|meal|restaurant/i.test(line)) {
        currentDay.dining = currentDay.dining || [];
        const mealType = line.match(/breakfast/i) ? 'breakfast' :
                        line.match(/lunch/i) ? 'lunch' :
                        line.match(/dinner/i) ? 'dinner' : 'other';
        currentDay.dining.push({
          name: line.trim(),
          meal_type: mealType,
          description: line.trim()
        });
      }
    }
  }
  
  // Add last day
  if (currentDay) {
    days.push(currentDay);
  }
  
  // If no days found, create a single day with all content
  if (days.length === 0) {
    days.push({
      day_number: 1,
      title: 'Day 1',
      description: content.substring(0, 500),
      activities: [{
        title: 'Imported Activity',
        description: 'Please review and edit this imported content'
      }]
    });
  }
  
  return {
    trip_name,
    destination,
    description: `Imported from ${fileName}`,
    days
  };
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get file info
    const fileName = file.name;
    const fileType = file.type;

    console.log(`Processing file: ${fileName}, type: ${fileType}`);

    // Extract text content
    const content = await extractTextFromFile(file, fileType);

    // Parse itinerary using AI/pattern matching
    const itinerary = parseItineraryWithAI(content, fileName);

    return new Response(JSON.stringify({
      success: true,
      itinerary
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error processing file:", error);
    return new Response(JSON.stringify({
      error: "Failed to process file",
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});