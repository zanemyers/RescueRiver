# 🗒️ Deprecation Notes – base ([UNRELEASED])

## 🧾 Summary

The `FileHandler` base class and its associated file system operations (including directory creation, file archiving, and on-disk file management) have been deprecated.

## ❌ Why These Were Deprecated

- The previous design depended on physical file paths and performing synchronous/asynchronous file system operations such as creating directories, archiving files by moving them on disk, and reading/writing files from/to disk.
- This model introduced complexity and I/O overhead, making testing and deployment more cumbersome.
- Modern requirements shifted towards handling files entirely in-memory to support transient data workflows, API responses, and temporary file generation without disk persistence.

## 🔄 Replacement

- File handling is now performed entirely in-memory using dedicated classes:
    - `TXTFileHandler` — manages plain text content in-memory with read, write, and buffer export capabilities.
    - `ExcelFileHandler` — manages Excel files fully in-memory using the `exceljs` library, supporting reading, writing, appending, loading from buffers, and exporting to buffers.

- These new handlers remove dependencies on the file system, enabling easier integration with APIs, serverless environments, and streaming workflows.

## 🕓 Status

- The `FileHandler` class has been deprecated but remain available for legacy code.
- New development should use the in-memory `TXTFileHandler` and `ExcelFileHandler` classes.
- Legacy code depending on on-disk file operations should be refactored to adopt the new in-memory paradigm.


# 🗒️ Deprecation Notes – base (v2.1)

## 🧾 Summary

The `base` module previously included general-purpose terminal utilities. As of **v2.1**, the following were deprecated and removed:

- `Spinner` class
- `progressBar` function

## ❌ Why These Were Deprecated

These utilities were replaced by the more reliable and actively maintained [`ora`](https://www.npmjs.com/package/ora) package:

- `Spinner` and `progressBar` offered limited customization.
- `ora` provides a consistent, flexible API for spinners with support for live updates, color, and status handling.

## 🔄 Replacement

Use [`ora`](https://www.npmjs.com/package/ora) for all terminal spinner needs. It supports dynamic text updates and integrates well with modern async workflows.

## 🕓 Status

These utilities were **fully removed in v2.1**. Existing code should be migrated to use `ora`, and no new code should reference the deprecated items.

# 🗒️ Deprecation Notes – base (v2.0)

## 🧾 Summary

The `base` module included general-purpose utilities and constants. In **v2.0**, the following were deprecated:

- `CSVFileWriter` and `CSVFileReader` classes
- Enum-based configuration constants

## ❌ Why These Were Deprecated

- **CSVFileWriter / CSVFileReader**: Replaced by the more powerful `ExcelFileHandler`, which supports native Excel output with formatting and richer structure using the `ExcelJS` library.
- **Enums and Configuration Constants**: The switch to SerpAPI and environment-based configuration made many of these redundant. Removing them simplified the config layer.

### 🗑️ Deprecated Constants

These specific constants were removed:

- `PHONE_REGEX`
- `STARS_REGEX`
- `REVIEW_COUNT_REGEX`
- `SOCIAL_MEDIA`

## 🔄 Replacement

- Use `ExcelFileHandler` for reading and writing structured spreadsheet data.

## 🕓 Status

These items were **fully removed in v2.0** and should not be referenced in new code. All usage should be migrated to supported replacements.
