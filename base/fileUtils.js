/**
 * Utility classes for in-memory file reading and writing.
 *
 * This module provides lightweight handlers for TXT and Excel (XLSX) file operations
 * without any need for disk storage. All file content is kept entirely in memory.
 *
 * - TXTFileHandler: Supports reading and writing plain text content with optional appending.
 * - ExcelFileHandler: Supports reading, writing (with optional appending), and exporting
 *   Excel files as ArrayBuffers or Buffers for download or transmission.
 *
 * These classes are useful for scenarios where temporary file handling is needed,
 * such as generating files for immediate download, API responses, or processing without saving to disk.
 */

import ExcelJS from "exceljs";

/**
 * In-memory TXT file handler.
 *
 * Provides simple read and write operations for plain text content held entirely in memory.
 * Useful for temporary file generation, downloads, or data processing without disk I/O.
 */
class TXTFileHandler {
  constructor() {
    this.content = "";
  }

  /**
   * Reads data from the TXT file
   */
  read() {
    return this.content;
  }

  /**
   * Writes data to the TXT file (in memory).
   * If append is true, it appends the new data to the existing content.
   *
   * @param {string} data - The text data to write.
   * @param {boolean} append - Whether to append to existing content (default: true).
   */
  async write(data, append = true) {
    this.content = append ? this.content + data : data;
  }

  /**
   * Returns the current content as a UTF-8 Buffer.
   * @returns {Buffer}
   */
  getBuffer() {
    return Buffer.from(this.content, "utf-8");
  }
}

/**
 * Excel file reader/writer for in-memory use.
 * Supports reading, writing, appending, and exporting as a Buffer.
 */
class ExcelFileHandler {
  constructor() {
    this.initCleanFile();
  }

  /**
   * Initializes a new, clean in-memory workbook and worksheet.
   * This method clears any existing data and prepares the handler for fresh writing.
   */
  initCleanFile() {
    this.workbook = new ExcelJS.Workbook();
    this.worksheet = this.workbook.addWorksheet("Sheet1");
  }

  /**
   * Load an existing Excel file from an ArrayBuffer into memory.
   * @param {ArrayBuffer|Buffer} buffer - The buffer containing the Excel file data.
   */
  async loadBuffer(buffer) {
    await this.workbook.xlsx.load(buffer);
    this.worksheet = this.workbook.worksheets[0] || this.worksheet;
    return this;
  }

  /**
   * Reads the Excel file and returns an array of JSON objects,
   * with optional filtering and row mapping.
   *
   * @param listCols - A list of columns that can have multiple values
   * @param {Function} filter - A function to filter rows (default: include all rows).
   * @param {Function|null} rowMap - A function to map/transform each row (default: null).
   * @returns {Promise<Array<Object>>} JSON array of filtered/mapped rows.
   */
  async read(listCols = [], filter = () => true, rowMap = null) {
    const worksheet = this.worksheet;
    const headers = worksheet.getRow(1).values.slice(1); // Extract headers from the first row
    const data = [];

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row

      const rowData = {};
      headers.forEach((header, index) => {
        const cellValue = row.getCell(index + 1).value;
        const newHeader = header.toLowerCase().replace(/\s+/g, "_");

        if (typeof cellValue === "string" && listCols.includes(header)) {
          // Split by comma and trim each item
          rowData[newHeader] = cellValue
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        } else {
          rowData[newHeader] = cellValue;
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
   * @param {boolean} append - Whether to append data to the current file
   */
  async write(data, append = true) {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Data must be a non-empty array.");
    }

    const headers = Object.keys(data[0]);
    if (headers.length === 0) throw new Error("Data objects must have at least one key.");

    if (!append) {
      // Reset workbook and worksheet
      this.initCleanFile();
      this.worksheet.addRow(headers);
    } else if (this.worksheet.rowCount === 0) this.worksheet.addRow(headers);

    // Add data rows
    data.forEach((item) => {
      const row = headers.map((key) => item[key]);
      this.worksheet.addRow(row);
    });
  }

  /**
   * Returns a buffer of the current workbook in memory for downloading or transmission.
   *
   * NOTE: The workbook must be populated  beforehand, otherwise the buffer may be empty or invalid.
   *
   * @returns {Promise<Buffer>} A Promise that resolves to the Excel file buffer.
   */
  async getBuffer() {
    return await this.workbook.xlsx.writeBuffer();
  }
}

export { TXTFileHandler, ExcelFileHandler };
