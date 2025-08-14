/**
 * Base class for handling files
 * It provides methods to archive existing files and ensuring a directory exists.
 */
class FileHandler {
  /**
   * @param {string} filePath - The path to the file.
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

      // Get the constants file name without the extension
      const baseName = path.basename(this.filePath, `.${this.fileType}`);

      // Construct the full path for the archived file, including the timestamp
      const archivedFile = path.join(archiveDir, `${baseName}_${timestamp}.${this.fileType}`);

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
