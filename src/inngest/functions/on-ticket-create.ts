import { NonRetriableError } from "inngest";
import { inngest } from "../client";
import { db } from "@/lib/db/firebase-admin";
import analyzeTicket from "@/lib/utils/ticket-ai";

export const onTicketCreate = inngest.createFunction(
  { id: "on-ticket-create", retries: 3 },
  { event: "on-ticket.create" },
  async ({ event, step }) => {
    try {
      const { ticketId } = event.data;
      console.log(`Processing ticket ${ticketId}`); // Add logging

      const ticket = await step.run("Fetch Ticket Details", async () => {
        const ticketObject = await db.collection("tickets").doc(ticketId).get();
        if (!ticketObject.exists) {
          throw new NonRetriableError("Ticket not found");
        }
        const data = ticketObject.data();
        console.log("Fetched ticket:", data); // Log fetched data
        return data;
      });

      if (!ticket) {
        throw new NonRetriableError("Ticket data is empty");
      }

      await step.run("Update-ticket-status", async () => {
        console.log(`Updating status for ticket ${ticket.id}`); // Add logging
        await db
          .collection("tickets")
          .doc(ticket.id) // Remove optional chaining since we checked existence
          .update({ status: "created" });
      });

      // Add validation for required fields
      if (!ticket.title || !ticket.description) {
        throw new NonRetriableError("Ticket is missing title or description");
      }

      const aiResponse = await analyzeTicket({
        title: ticket.title,
        description: ticket.description,
      });

      console.log("AI Response:", aiResponse); // Log AI response
      
      return { success: true };
    } catch (error) {
      console.error("Detailed error:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        eventData: event.data
      });
      throw new NonRetriableError("Failed to process ticket creation");
    }
  }
);