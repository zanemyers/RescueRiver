import ExcelJS from "exceljs";

/**
 * This class provides simple methods to store, read, and retrieve
 * text data without interacting with the file system.
 *
 * Ideal for temporary file creation, downloads, or in-memory data processing.
 */
class TXTFileHandler {
  constructor() {
    /**
     * The current text content held in memory.
     * @type {string}
     */
    this.content = "";
  }

  /**
   * Returns the current text content.
   *
   * @returns {string} The stored text.
   */
  read() {
    return this.content;
  }

  /**
   * Stores text content in memory.
   * If `append` is true, the new data will be added to the existing content.
   * If false, the existing content will be replaced.
   *
   * @param {string} data - The text to store.
   * @param {boolean} [append=true] - Whether to append to existing content.
   * @returns {Promise<void>} Resolves when the operation is complete.
   */
  async write(data, append = true) {
    this.content = append ? this.content + data : data;
  }

  /**
   * Returns the current content as a UTF-8 encoded Buffer.
   *
   * @returns {Buffer} The UTF-8 encoded representation of the content.
   */
  getBuffer() {
    return Buffer.from(this.content, "utf-8");
  }
}

/**
 * This class provides simple methods to store, read/write, and retrieve/export
 * Excel files without interacting with the file system.
 */
class ExcelFileHandler {
  constructor() {
    this.initCleanFile();
  }

  /**
   * Create a new in-memory workbook and worksheet.
   * Clears any existing workbook and starts fresh.
   */
  initCleanFile() {
    this.workbook = new ExcelJS.Workbook();
    this.worksheet = this.workbook.addWorksheet("Sheet1");
  }

  /**
   * Reads worksheet data into an array of objects.
   *
   * Behavior:
   * - Uses the first worksheet row as headers.
   * - Converts header names to lowercase with underscores.
   * - Optionally splits specified columns into arrays (comma-separated values).
   * - Applies an optional filter function to include/exclude rows.
   * - Applies an optional transform function (`rowMap`) to each included row.
   *
   * @param {string[]} listCols - Headers whose string values should be split into arrays.
   * @param {Function} filter - Function returning true to keep a row, false to skip it (default: keep all).
   * @param {Function|null} rowMap - Optional function to transform each included row before adding to results.
   * @returns {Promise<Object[]>} Array of parsed row objects.
   */
  async read(listCols = [], filter = () => true, rowMap = null) {
    const headers = this.worksheet.getRow(1).values.slice(1); // Skip ExcelJS index offset
    const data = [];

    this.worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row

      const rowData = {};
      headers.forEach((header, index) => {
        const cellValue = row.getCell(index + 1).value;
        const key = header.toLowerCase().replace(/\s+/g, "_");

        if (typeof cellValue === "string" && listCols.includes(header)) {
          rowData[key] = cellValue
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        } else {
          rowData[key] = cellValue;
        }
      });

      if (filter(rowData)) {
        data.push(rowMap ? rowMap(rowData) : rowData);
      }
    });

    return data;
  }

  /**
   * Add or overwrite worksheet rows from an array of objects.
   * - If append=false, starts with a clean file and new headers.
   * - If append=true and file is empty, headers are added automatically.
   *
   * @param {Object[]} data - Row data as objects.
   * @param {boolean} append - Whether to append to existing rows (default: true).
   */
  async write(data, append = true) {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Data must be a non-empty array.");
    }

    const headers = Object.keys(data[0]);
    if (headers.length === 0) {
      throw new Error("Data objects must have at least one key.");
    }

    if (!append) {
      this.initCleanFile();
      this.worksheet.addRow(headers);
    } else if (this.worksheet.rowCount === 0) {
      this.worksheet.addRow(headers);
    }

    data.forEach((item) => {
      this.worksheet.addRow(headers.map((key) => item[key]));
    });
  }

  /**
   * Load an existing Excel file into memory from a buffer.
   *
   * @param {ArrayBuffer|Buffer} buffer - Excel file contents.
   * @returns {Promise<this>} This handler instance.
   */
  async loadBuffer(buffer) {
    await this.workbook.xlsx.load(buffer);
    this.worksheet = this.workbook.worksheets[0] || this.worksheet;
    return this;
  }

  /**
   * Export the workbook as a buffer for sending or saving.
   *
   * @returns {Promise<Buffer>} Excel file buffer.
   */
  async getBuffer() {
    return await this.workbook.xlsx.writeBuffer();
  }
}

export { TXTFileHandler, ExcelFileHandler };
