
import { GoogleGenAI, Type } from "@google/genai";
import { Task, TaskPriority, TaskStatus, BillingStatus } from '../types';

// Define the JSON Schema for the task output
const taskSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Short, concise title of the task." },
    description: { type: Type.STRING, description: "Full detailed description of the task." },
    client: { type: Type.STRING, description: "Name of the client or company. Use the exact name from the provided list if matched." },
    project: { type: Type.STRING, description: "Project name if applicable." },
    area: { type: Type.STRING, description: "Department or area (e.g., Diseño, Programación, Admin)." },
    priority: { type: Type.INTEGER, description: "Priority level from 1 (Critical/Highest) to 5 (None/Lowest). Default to 3 (Normal)." },
    responsible: { type: Type.STRING, description: "Name of the person responsible. Try to match with provided users list." },
    collaborators: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "Names of people helping. Try to match with provided users list." 
    },
    status: { type: Type.STRING, description: "Current status: Pendiente, En Curso, Por Hacer, Completada, Cancelada. Default to 'Pendiente'." },
    dueDate: { type: Type.STRING, description: "Due date strictly in YYYY-MM-DD format. Calculate based on relative terms like 'next Friday'." },
    estimatedHours: { type: Type.NUMBER, description: "Estimated hours to complete." },
    billingStatus: { type: Type.STRING, description: "Billing status: 'A definir', 'A facturar', 'Facturado', 'No se factura'. Default 'A definir'." }
  },
  required: ["title", "description", "priority", "responsible", "status"],
};

export const parseAudioToTask = async (audioBase64: string, existingCompanies: string[] = [], existingUsers: string[] = [], currentUserName?: string): Promise<Partial<Task>> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'audio/webm', 
              data: audioBase64
            }
          },
          {
            text: `
            You are an expert Project Manager Assistant. Listen to the audio command and extract a structured Task object.
            
            Current Date Reference: ${new Date().toISOString()}
            Current Logged-in User: ${currentUserName || "Usuario"}
            
            Existing Clients Database: ${existingCompanies.length > 0 ? existingCompanies.join(", ") : "None"}
            Existing Users Database: ${existingUsers.length > 0 ? existingUsers.join(", ") : "None"}

            Rules:
            1. Interpret relative dates (e.g., "next Friday") and convert them to strictly YYYY-MM-DD format.
            2. MANDATORY RESPONSIBLE: If no specific person is mentioned as responsible for the task, you MUST set the 'responsible' field to "${currentUserName || "Usuario"}". 
            3. If the user says "assigned to me" or "I will do it", set responsible to "${currentUserName || "Usuario"}".
            4. Infer the 'Area' based on the context of the task (e.g., "Fix bug" -> Programación).
            5. **PRIORITY**: Scale is 1 to 5. 
               - 1 = Critical / Urgent
               - 2 = High
               - 3 = Normal / Standard
               - 4 = Low
               - 5 = None / Trivial
               If no priority is mentioned, assume 3.
            6. **CLIENT MATCHING**: Compare the client mentioned in audio with the 'Existing Clients Database'. 
               - If there is a similar name (fuzzy match), use the EXACT name from the database list in the 'client' field. 
               - If no match found, use the name exactly as heard.
            7. **PEOPLE MATCHING**: Try to match 'responsible' and 'collaborators' names against 'Existing Users Database'. Use exact names from the list if possible.
            8. Return strictly JSON based on the schema.
            `
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: taskSchema,
        temperature: 0.2 
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    const rawData = JSON.parse(text);

    return {
      title: rawData.title,
      description: rawData.description,
      classification: {
        client: rawData.client || 'General',
        project: rawData.project,
        area: rawData.area || 'General',
        priority: rawData.priority as TaskPriority,
      },
      people: {
        responsible: rawData.responsible || currentUserName || 'Usuario',
        collaborators: rawData.collaborators || [],
        creator: currentUserName || 'Usuario',
      },
      statusTime: {
        status: (rawData.status as TaskStatus) || TaskStatus.PENDING,
        dueDate: rawData.dueDate,
        estimatedHours: rawData.estimatedHours || 0,
        usedHours: 0,
        billingStatus: (rawData.billingStatus as BillingStatus) || BillingStatus.TBD,
      },
      system: {
        orderIndex: 0
      }
    } as unknown as Partial<Task>;

  } catch (error) {
    console.error("Error parsing audio:", error);
    throw error;
  }
};
