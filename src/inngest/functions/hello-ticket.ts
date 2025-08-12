import { inngest } from "../client";

export const helloTicket = inngest.createFunction(
    {id: 'hello-ticket'},
    {event: 'test/ticket.created'},
    async ({event}) => {
        return {event, body: event.data.message };
    }
);
