/**
 * Utility class to write data to a CSV file
 * extends the FileWriter class.
 */
class CSVFileWriter extends FileWriter {
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

export { CSVFileWriter, CSVFileReader };
// const csvWriter = new CSVFileWriter("resources/csv/shop_details.csv", "shopDetails");
