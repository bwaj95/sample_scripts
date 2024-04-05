import axios from "axios";
import path from "path";
import XLSX from "xlsx";

import { logger } from "./utils.js";
import { createWriteStream } from "fs";

const url = `https://trinitygrammarschoolkew.freshservice.com/api/v2/tickets`;

const username = "LCb4NLw2WuVtkfxsCswT";
const password = "X";

//'Authorization': Basic ${Buffer.from(apiKey + ':X').toString('base64')},

const fetchTicketsFromAPI = async (page, perPage) => {
  try {
    const response = await axios.get(url, {
      params: {
        page: page,
        per_page: perPage,
      },
      headers: {
        Authorization: `Basic ${Buffer.from(username + ":X").toString(
          "base64"
        )}`,
        "Content-Type": "application/json",
      },
    });

    // console.log("Fetched data from API...");
    // console.log(response.data.tickets);

    return response.data.tickets;
  } catch (error) {
    console.log("Error occured while fetching from API...");
    console.error(error);
  }
};

function readSourceIdsFromExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const sourceIds = [];
  let rowIndex = 2; // Assuming data starts from row 2, adjust if needed

  while (worksheet[`A${rowIndex}`]) {
    const cellValue = worksheet[`A${rowIndex}`].v;
    sourceIds.push(parseInt(cellValue));
    rowIndex++;
  }

  const sourceIdsSet = new Set(sourceIds);

  console.log("Printing sourceIds set...");
  console.log(sourceIdsSet);

  return sourceIdsSet;
}

// Function to process batch of results concurrently
async function processBatch(batch, sourceIdsSet) {
  const queries = [];

  // Check if result ID matches any of the source IDs
  batch.forEach((result) => {
    let external_id = result?.custom_fields?.external_id;
    let target_id = result?.id;

    if (external_id && sourceIdsSet.has(external_id)) {
      logger.info(`External ID: ${external_id} | Target ID: ${target_id}\n`);
      // Generate SQL query based on matched ID
      const query = `UPDATE tablename SET targetId=${target_id} WHERE sourceId=${external_id};`;
      queries.push(query);

      sourceIdsSet.delete(external_id);
    }
  });

  //   if (queries.length > 0) {
  //     console.log("queries populated... Break...");
  //     ///
  //   }

  return queries;
}

async function main() {
  const filePath = "sample.xlsx";
  const sourceIdsSet = readSourceIdsFromExcel(filePath);

  const perPage = 100;
  let page = 1;

  // Open a write stream to the SQL file
  const fileStream = createWriteStream("queries.sql", { flags: "a" });

  while (true) {
    try {
      // Fetch data from API
      const data = await fetchTicketsFromAPI(page, perPage);

      if (data.length === 0) {
        console.log("No data fetched... Break...");
        break;
      }

      // Process batch of results concurrently
      const queries = await processBatch(data, sourceIdsSet);

      // Write SQL queries to file
      queries.forEach((query) => {
        fileStream.write(query + "\n");
      });

      console.log(`Processed page ${page}`);

      if (sourceIdsSet.length === 0) {
        console.log("sourceIdsSet empty... Break...");
        fileStream.end();
        break;
      }

      if (page === 10) {
        fileStream.end();
        console.log("10 pages processed... Break...");
        break;
      }

      // Increment page for next batch
      page++;

      if (page % 5 === 0)
        await new Promise((resolve) => setTimeout(resolve, 5000));
    } catch (error) {
      console.error("An error occurred:", error.message);
      break;
    }
  }

  // Close the write stream
  fileStream.end();
  console.log("SQL queries written to queries.sql");
}

// Run the main function
main();
