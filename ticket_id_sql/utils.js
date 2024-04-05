import winston from "winston";

export const logger = winston.createLogger({
  level: "info",
  format: winston.format.printf((info) => info.message),
  transports: [
    //new winston.transports.Console(),
    new winston.transports.File({ filename: "logs2.log" }),
  ],
});

// Delete2 Logs
// File containing log lines
const filename = "./deleteDeals2Log.log"; // Update with the path to your log file
export const delete2Logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "user-service" },
  transports: [new winston.transports.File({ filename: filename })],
});
