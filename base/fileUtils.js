/**
 * Utility classes to handle file writing and reading.
 * It provides methods for CSV and TXT file writing and reading.
 * The CSVFileWriter class ensures that the output directory exists and archives existing files with timestamps.
 * The CSVFileReader class allows filtering and transforming rows while reading.
 * The TXTFileWriter class provides a simple way to write data to a text file.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "@fast-csv/parse";
import { writeToPath } from "@fast-csv/format";
import { writeFile } from "fs/promises";
import ExcelJS from "exceljs";

import { getUTCTimeStamp, getUTCYearMonth } from "./dateUtils.js";
import { ar } from "date-fns/locale";

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Resolve the project directory path
const projectDir = path.resolve(__dirname, "..");

/**
 * Base class for handling files
 * It provides methods to archive existing files and ensuring a directory exists.
 */
class FileHandler {
  /**
   * @param {string} filePath - The path to the file.
   * @param {string} archiveFolderName - Folder name to store archived versions.
   * @param {string} fileType - Type of file (e.g., 'csv', 'txt').
   */
  constructor(filePath, fileType) {
    this.filePath = path.resolve(projectDir, filePath);
    this.fileType = fileType;

    // Ensure the directory exists
    this.checkDirPath();
  }

  /**
   * Ensures that the directory for the file exists before writing.
   * If the directory doesn't exist, it is created recursively.
   */
  checkDirPath() {
    try {
      // Get the directory path of the file from its full file path
      const dirPath = path.dirname(this.filePath);

      // If the directory doesn't exist, create it recursively
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    } catch (error) {
      // Log any errors that occur during directory creation
      console.error("Error creating directory:", error);
      // Re-throw the error to propagate it further
      throw error;
    }
  }

  /**
   * Archives the current file by moving it to an archive folder with a timestamped filename.
   */
  archiveFile() {
    try {
      // Get the file's stats to retrieve the creation date
      const stats = fs.statSync(this.filePath);
      const createdDate = stats.birthtime;

      // Get the UTC timestamp and year/month from the file's creation date
      const timestamp = getUTCTimeStamp(createdDate);
      const [year, month] = getUTCYearMonth(createdDate);

      const archiveFolder = path.basename(this.filePath, `.${this.fileType}`);
      // Define the archive directory path based on year and month
      const archiveDir = path.join(
        projectDir,
        "resources",
        this.fileType,
        archiveFolder,
        `${year}`,
        `${month}`
      );

      // Create the archive directory structure recursively if it doesn't exist
      fs.mkdirSync(archiveDir, { recursive: true });

      // Get the base file name without the extension
      const baseName = path.basename(this.filePath, `.${this.fileType}`);

      // Construct the full path for the archived file, including the timestamp
      const archivedFile = path.join(
        archiveDir,
        `${baseName}_${timestamp}.${this.fileType}`
      );

      // Rename the original file to the archived file path
      fs.renameSync(this.filePath, archivedFile);
    } catch (err) {
      // Log any errors that occur during file archiving
      console.error("Error archiving file:", err);
      // Re-throw the error to propagate it further
      throw err;
    }
  }
}

/**
 * Utility class to write data to a CSV file
 * extends the FileWriter class.
 */
class CSVFileWriter extends FileHandler {
  /**
   * Class Constructor for CSVFileWriter.
   * @param {string} filePath - Path to the CSV file to write to.
   * @param {string} archiveFolderName - Folder name (inside resources/csv/) where old versions will be archived.
   */
  constructor(filePath, archiveFolderName) {
    super(filePath, archiveFolderName, "csv"); // Call the parent constructor with fileType as "csv"
  }

  /**
   * Writes an array of data objects to the CSV file.
   *
   * @param {Array<Object>} data - An array of objects representing CSV rows.
   * @returns {Promise<void>} - A promise that resolves when the write is complete.
   */
  async bulkWrite(data) {
    return new Promise((resolve, reject) => {
      // Use the writeToPath function to write data to the file
      writeToPath(this.filePath, data, { headers: true })
        .on("error", reject) // Reject the promise if there is an error
        .on("finish", () => {
          resolve(); // Resolve the promise once writing is finished
        });
    });
  }
}

/**
 * Utility class to read and process data from a CSV file.
 * Allows applying an optional row filter and row transformation.
 */
class CSVFileReader {
  /**
   * Class Constructor for CSVFileReader.
   * @param {string} filePath - The path to the CSV file to read.
   * @param {function(Object): boolean} [filter] - Optional function to determine whether to include a row (defaults to always true).
   * @param {function(Object): any} [rowMap] - Optional function to transform each included row before returning.
   */
  constructor(filePath, filter = () => true, rowMap = null) {
    this.filePath = path.resolve(projectDir, filePath);
    this.filter = filter;
    this.rowMap = rowMap;
  }

  /**
   * Reads the CSV file, applying the optional filter and rowMap functions.
   *
   * @returns {Promise<Array>} - A promise that resolves to an array of processed rows.
   */
  async read() {
    const results = []; // Array to store the filtered and mapped rows

    return new Promise((resolve, reject) => {
      // Create a read stream and pipe it to the CSV parser
      fs.createReadStream(this.filePath)
        .pipe(parse({ headers: true })) // Parse the CSV with headers
        .on("error", reject) // Reject the promise if there's an error
        .on("data", (row) => {
          // Apply the filter function to each row (defaults to true, i.e., include every row)
          if (this.filter(row)) {
            // If a rowMap function is provided, apply it, otherwise return the row as-is
            results.push(this.rowMap ? this.rowMap(row) : row);
          }
        })
        .on("end", () => {
          resolve(results); // Resolve the promise once all rows have been processed
        });
    });
  }
}

/**
 * Utility class to write data to a TXT file.
 * Ensures the output directory exists and archives existing files with timestamps.
 */
class TXTFileWriter extends FileHandler {
  /**
   * @param {string} filePath - Path to the TXT file to write to.
   * @param {string} archiveFolderName - Folder name (inside resources/text/) where old versions will be archived.
   */
  constructor(filePath, archiveFolderName) {
    super(filePath, archiveFolderName, "txt"); // Call the parent constructor with fileType as "txt"
  }

  /**
   * Writes data to the TXT file.
   */
  async write(data) {
    try {
      await writeFile(this.filePath, data, "utf8");
    } catch (error) {
      console.error("Error writing file:", error);
      throw error;
    }
  }
}

/**
 * Excel file reader/writer built on top of FileHandler.
 */
class ExcelFileHandler extends FileHandler {
  /**
   * @param {string} filePath - Relative path to the Excel file.
   */
  constructor(filePath) {
    super(filePath, "xlsx"); // Call the parent constructor with file type set to 'xlsx'
    this.workbook = new ExcelJS.Workbook(); // Initialize a new Excel workbook instance
  }

  /**
   * Reads the Excel file and returns an array of JSON objects,
   * mapping the first row as header keys.
   *
   * @returns {Promise<Array<Object>>} JSON array representing each row in the sheet
   */
  async read() {
    await this.workbook.xlsx.readFile(this.filePath);

    // Get the first worksheet in the workbook
    const worksheet = this.workbook.worksheets[0];

    // Extract the headers
    const headerRow = worksheet.getRow(1);
    const headers = headerRow.values.slice(1);

    const data = [];
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row

      const rowData = {};
      headers.forEach((header, index) => {
        rowData[header] = row.getCell(index + 1).value;
      });

      data.push(rowData);
    });

    return data;
  }

  /**
   * Writes an array of JSON objects to the Excel file.
   * The first row will be written as headers.
   * Optionally archives the existing file before overwriting.
   *
   * @param {Array<Object>} data - Array of objects to write as rows
   * @param {boolean} archive - Whether to archive the existing file before writing
   */
  async write(data, archive = true) {
    // Validate the data input
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Data must be a non-empty array.");
    }

    // If enabled and file exists, archive the old file first
    if (archive && fs.existsSync(this.filePath)) {
      this.archiveFile();
    }

    // Add a new worksheet to the workbook
    const worksheet = this.workbook.addWorksheet();

    // Extract headers from the keys of the first data object
    const headers = Object.keys(data[0]);
    if (headers.length === 0) {
      throw new Error("Data objects must have at least one key.");
    }

    worksheet.addRow(headers);
    data.forEach((item) => {
      const row = headers.map((key) => item[key]);
      worksheet.addRow(row);
    });

    await this.workbook.xlsx.writeFile(this.filePath);
  }
}

export { CSVFileWriter, CSVFileReader, TXTFileWriter, ExcelFileHandler };
// const csvWriter = new CSVFileWriter("resources/csv/shop_details.csv", "shopDetails");
