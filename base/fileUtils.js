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
// import { parse } from "@fast-csv/parse";
// import { writeToPath } from "@fast-csv/format";
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
        "media",
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

  write(archive = true) {
    if (archive && fs.existsSync(this.filePath)) this.archiveFile();
  }
}

/**
 * Utility class to write data to a TXT file.
 * Ensures the output directory exists and archives existing files with timestamps.
 */
class TXTFileHandler extends FileHandler {
  /**
   * @param {string} filePath - Path to the TXT file to write to.
   */
  constructor(filePath) {
    super(filePath, "txt"); // Call the parent constructor with fileType as "txt"
  }

  /**
   * Reads data from the TXT file
   */
  async read() {
    return fs.readFileSync(this.filePath, "utf-8");
  }

  /**
   * Writes data to the TXT file.
   */
  async write(data, archive = true) {
    // Call archiving logic from base class
    super.write(archive);

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
   * with optional filtering and row mapping.
   *
   * @param {Function} filter - A function to filter rows (default: include all rows).
   * @param {Function|null} rowMap - A function to map/transform each row (default: null).
   * @returns {Promise<Array<Object>>} JSON array of filtered/mapped rows.
   */
  async read(listCols = [], filter = () => true, rowMap = null) {
    // Load the Excel file into the workbook
    await this.workbook.xlsx.readFile(this.filePath);

    // Get the first worksheet in the workbook
    const worksheet = this.workbook.worksheets[0];

    // Extract headers from the first row
    const headerRow = worksheet.getRow(1);
    const headers = headerRow.values.slice(1); // Skip empty cell at index 0

    const data = [];

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row

      const rowData = {};
      headers.forEach((header, index) => {
        const cellValue = row.getCell(index + 1).value;

        if (typeof cellValue === "string" && listCols.includes(header)) {
          // Split by comma and trim each item
          rowData[header] = cellValue
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean); // Remove empty strings
        } else {
          rowData[header] = cellValue;
        }
      });

      // Apply filter and map if applicable
      if (filter(rowData)) {
        data.push(rowMap ? rowMap(rowData) : rowData);
      }
    });

    return data;
  }

  /**
   * Writes an array of JSON objects to the Excel file.
   * Optionally archives the existing file before overwriting.
   *
   * @param {Array<Object>} data - Array of objects to write as rows
   * @param {boolean} archive - Whether to archive the existing file before writing
   */
  async write(data, archive = true) {
    // Call archiving logic from base class
    super.write(archive);

    // Validate the data input
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Data must be a non-empty array.");
    }

    const headers = Object.keys(data[0]); // Use the keys of the first object as headers
    if (headers.length === 0) {
      throw new Error("Data objects must have at least one key.");
    }

    const worksheet = this.workbook.addWorksheet();
    worksheet.addRow(headers);
    data.forEach((item) => {
      const row = headers.map((key) => item[key]);
      worksheet.addRow(row);
    });

    await this.workbook.xlsx.writeFile(this.filePath);
  }
}

export { TXTFileHandler, ExcelFileHandler };
