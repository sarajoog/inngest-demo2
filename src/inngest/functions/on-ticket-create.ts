import { NonRetriableError } from "inngest";
import { inngest } from "../client";
import { db } from "@/lib/db/firebase-admin";
//import analyzeTicket from "@/lib/utils/ticket-ai";

export const onTicketCreate = inngest.createFunction(
  { id: "on-ticket-create", retries: 3 }, // Function ID
  { event: "on-ticket.create" }, // Trigger on ticket/create event
  async ({ event, step }) => {
    try {
      const { ticketId } = event.data;

      const ticket = await step.run("Fetch Ticket Details", async () => {
        // Fetch ticket details from the database
        const ticketObject = await db.collection("tickets").doc(ticketId).get();
        if (!ticketObject.exists) {
          throw new NonRetriableError("Ticket not found");
        }
        return ticketObject.data();
      });
      console.log("Fetched ticket:", ticket);

      return { success: true };
    } catch (error) {
      console.error("Error processing ticket creation:", error);
      throw new NonRetriableError("Failed to process ticket creation");
    }
  }
);
