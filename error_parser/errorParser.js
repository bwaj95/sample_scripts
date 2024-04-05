import fs from "fs";
import ExcelJS from "exceljs";

// Function to parse the log file and create an Excel file
async function parseLogAndCreateExcel(logFilePath, excelFilePath) {
  try {
    // Read the log file
    const data = fs.readFileSync(logFilePath, "utf8");

    // console.log(data);

    // Regular expression to find the error messages
    const errorRegex =
      /{"level":"error","message":"Error creating Freshsales entity for (.*?)': (.*?)","service":"user-service"}/g;

    // Create a new workbook and add a worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Errors");

    // Add headers
    worksheet.columns = [
      { header: "ID", key: "id", width: 40 },
      { header: "Error Reason", key: "errorReason", width: 100 },
    ];

    // Find matches and add them to the worksheet
    let match;
    let iters = 0;
    while ((match = errorRegex.exec(data)) !== null) {
      iters++;
      console.log("match: ");

      console.log(match);
      worksheet.addRow({
        id: match[1],
        errorReason: match[2],
      });
    }

    console.log("iterrs total: ", iters);

    // Write the workbook to a file
    await workbook.xlsx.writeFile(excelFilePath);
    console.log(`Excel file has been created at '${excelFilePath}'`);
  } catch (error) {
    console.error("Error:", error);
  }
}

// Function to parse the log file and extract errors
async function parseLogFile(logFilePath) {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Errors");
    worksheet.columns = [
      { header: "ID", key: "id", width: 40 },
      { header: "Error Message", key: "errorMessage", width: 100 },
      { header: "Validation Type", key: "validationType", width: 40 },
    ];

    const logData = fs.readFileSync(logFilePath, "utf-8").split("\n");
    logData.forEach((line) => {
      try {
        const logEntry = JSON.parse(line);
        if (logEntry.level === "error") {
          const errorArray = logEntry.message.match(/Error (\w+):/);

          if (errorArray) {
            const errorId = logEntry.message.match(/Error (\w+):/)[1];
            const errorMessage = logEntry.message.split("Error")[1].trim();
            const validationMatch = logEntry.message.match(
              /Validation\s+failed:\s+(\S+)/
            );
            const validationType = validationMatch[1].replace(/:$/, "");
            console.log("validation type: ", validationMatch);
            worksheet.addRow({ id: errorId, errorMessage, validationType });
          }
        }
      } catch (error) {
        console.error("Error parsing log entry:", error);
      }
    });

    await workbook.xlsx.writeFile("errors.xlsx");
    console.log("Errors written to errors.xlsx");
  } catch (error) {
    console.error("Error processing log file:", error);
  }
}

// Usage example
const logFilePath = "leadLogs.log";
const excelFilePath = "leadErrors.xlsx";
// parseLogAndCreateExcel(logFilePath, excelFilePath);
parseLogFile(logFilePath, excelFilePath);
