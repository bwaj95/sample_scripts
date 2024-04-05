import winston from "winston";
import { promises as fsPromises, writeFileSync } from "fs";

export const logger = winston.createLogger({
  level: "info",
  format: winston.format.printf((info) => info.message),
  transports: [
    //new winston.transports.Console(),
    new winston.transports.File({ filename: "logs2.log" }),
  ],
});

export const errorLogger = winston.createLogger({
  level: "error",
  ormat: winston.format.printf((info) => info.message),
  transports: [new winston.transports.File({ filename: "errorLogs.log" })],
});

export const downloadObjectToFile = (object, filename) => {
  try {
    // Convert the object to a JSON string
    const jsonString = JSON.stringify(object, null, 2); // Use 2 spaces for indentation

    // Write the JSON string to the file
    writeFileSync(filename, jsonString);

    console.log(`Object data has been written to ${filename}`);
  } catch (error) {
    console.error(`Error writing to ${filename}:`, error);
    errorLogger.error(`Error writing to ${filename}:`, error);
  }
};

export async function writeMapToFile(map, filename) {
  try {
    // Convert Map entries to an array of key-value pairs
    const entries = Array.from(map.entries());

    // Open the file for writing
    const fileHandle = await fsPromises.open(filename, "w");

    // Write each key-value pair to the file
    for (const [key, value] of entries) {
      await fileHandle.write(`${key}: ${value}\n`);
    }

    // Close the file
    await fileHandle.close();

    console.log(`Map data has been written to ${filename}`);
  } catch (error) {
    console.error(`Error writing to ${filename}:`, error);
  }
}
