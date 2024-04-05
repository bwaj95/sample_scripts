import axios from "axios";
import XLSX from "xlsx";

import { downloadObjectToFile, logger } from "./utils.js";
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

    return response.data.tickets;
  } catch (error) {
    console.log("Error occured while fetching from API...");
    console.error(error);
  }
};

function readSourceIdsFromExcel2(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const sourceIds = XLSX.utils.sheet_to_json(worksheet, {
    header: ["source_id"],
  });

  const map = new Map();
  sourceIds.forEach((entry) => {
    map.set(entry.source_id, []);
  });

  return map;
}

// Function to process batch of results concurrently
async function processBatch(batch, originalsMap, duplicatesMap) {
  const queries = [];

  // Check if result ID matches any of the source IDs
  batch.forEach((result) => {
    let source_id = result?.custom_fields?.external_id;
    let target_id = result?.id;

    /**
     * if original.get(id) === empty []:
     *      generate query and add to queries
     *      add data to originals
     * else:
     *      currently handling duplicates
     *      duplicates.get(id) === empty [] ? initialize []
     *      add result
     */

    if (source_id && originalsMap.has(source_id)) {
      const originalsArray = originalsMap.get(source_id);
      const obj = { source_id, target_id, data: { ...result } };

      if (originalsArray.length === 0) {
        originalsArray.push(obj);

        logger.info(`External ID: ${source_id} | Target ID: ${target_id}`);
        // Generate SQL query based on matched ID
        const query = `UPDATE mapping SET target_id=${target_id} WHERE source_id=${source_id};`;
        queries.push(query);
      } else {
        if (!duplicatesMap.has(source_id)) {
          duplicatesMap.set(source_id, []);
        }

        const duplicatesArray = duplicatesMap.get(source_id);
        duplicatesArray.push(obj);
      }
    }
  });

  return queries;
}

const processDuplicates = (originalsMap, duplicatesMap) => {
  //   console.log("PRINTING DUPLICATES MAP...........");
  //   console.log(duplicatesMap);
  //   downloadObjectToFile(duplicatesMap, "duplicatesData.json");

  const resultMap = new Map();

  duplicatesMap.forEach((valuesArray, key) => {
    const firstEntry = originalsMap.get(key)[0];
    // console.log("First entry...");
    // console.log(firstEntry);

    const array = [firstEntry, ...valuesArray];
    // console.log("combined array...");
    // console.log(array);

    resultMap.set(key, array);
  });

  console.log("PRINTING RESULTS MAP JSON...........");
  const jsonString = JSON.stringify(resultMap, null, 2);
  console.log(jsonString);

  downloadObjectToFile(resultMap, "resultMap.json");
};

async function main() {
  //   const filePath = "sample.xlsx";
  const filePath = "sourceIds.xlsx";
  const originalsMap = readSourceIdsFromExcel2(filePath);
  const duplicatesMap = new Map();

  const perPage = 100;
  let page = 1;
  let queriesWritten = 0;

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
      const queries = await processBatch(data, originalsMap, duplicatesMap);

      // Write SQL queries to file
      console.log("Writing queries....");
      queries.forEach((query, index) => {
        console.log(index, query);
        queriesWritten++;
        fileStream.write(query + "\n");
      });

      console.log(`Processed page ${page}`);

      // Increment page for next batch
      page++;

      if (page % 5 === 0)
        await new Promise((resolve) => setTimeout(resolve, 10000));
    } catch (error) {
      console.error("An error occurred:", error.message);
      break;
    }
  }

  // Close the write stream
  fileStream.end();

  console.log("Last Page fetched: ", page - 1);
  console.log("SQL queries written to queries.sql");
  console.log("SQL queries count: ", queriesWritten);
  processDuplicates(originalsMap, duplicatesMap);
  console.log("Exiting program!");
}

// Run the main function
main();
