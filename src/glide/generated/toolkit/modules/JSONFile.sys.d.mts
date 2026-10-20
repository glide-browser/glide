/**
 * Handles serialization of the data and persistence into a file.
 *
 * @param {object} config An object containing following members:
 * @param {string} config.path
 *   String containing the file path where data should be saved.
 * @param {string} [config.sanitizedBasename]
 *   Sanitized string identifier used for logging,
 *   shutdown debugging, and telemetry. Defaults to basename of given `path`,
 *   sanitized.
 * @param {(data: any) => any} [config.dataPostProcessor]
 *   Function triggered when data is just loaded. The data object will be passed
 *   as the first argument and should be returned no matter if it's modified or
 *   not. Its failure leads to the failure of load() and ensureDataReady().
 * @param {number} [config.saveDelayMs]
 *   Number indicating the delay (in milliseconds) between a change to the data
 *   and the related save operation. The default value will be applied if
 *   omitted.
 * @param {Function} [config.beforeSave]
 *   Promise-returning function triggered just before the data is written to
 *   disk. This can be used to create any intermediate directories before
 *   saving. The file will not be saved if the promise rejects or the function
 *   throws an exception.
 * @param {nsIAsyncShutdownClient} [config.finalizeAt]
 *   An `IOUtils` phase or barrier client that should automatically finalize the
 *   file when triggered. Defaults to `profileBeforeChange`; exposed as an
 *   option for testing.
 * @param {string} [config.compression]
 *   A compression algorithm to use when reading and writing the data.
 * @param {string} [config.backupTo]
 *   A string value indicating where writeAtomic should create a backup before
 *   writing to json files. Note that using this option currently ensures that
 *   we automatically restore backed up json files in load() and
 *   ensureDataReady() when original files are missing or corrupt.
 * @param {Function} [config.saveFailureHandler]
 *   A synchronous function that will be called if saving the data object ever
 *   causes an exception to be thrown (and toJSONSafe is not implemented on
 *   data).
 */
export function JSONFile(config: {
    path: string;
    sanitizedBasename?: string;
    dataPostProcessor?: (data: any) => any;
    saveDelayMs?: number;
    beforeSave?: Function;
    finalizeAt?: nsIAsyncShutdownClient;
    compression?: string;
    backupTo?: string;
    saveFailureHandler?: Function;
}): void;
export class JSONFile {
    /**
     * Handles serialization of the data and persistence into a file.
     *
     * @param {object} config An object containing following members:
     * @param {string} config.path
     *   String containing the file path where data should be saved.
     * @param {string} [config.sanitizedBasename]
     *   Sanitized string identifier used for logging,
     *   shutdown debugging, and telemetry. Defaults to basename of given `path`,
     *   sanitized.
     * @param {(data: any) => any} [config.dataPostProcessor]
     *   Function triggered when data is just loaded. The data object will be passed
     *   as the first argument and should be returned no matter if it's modified or
     *   not. Its failure leads to the failure of load() and ensureDataReady().
     * @param {number} [config.saveDelayMs]
     *   Number indicating the delay (in milliseconds) between a change to the data
     *   and the related save operation. The default value will be applied if
     *   omitted.
     * @param {Function} [config.beforeSave]
     *   Promise-returning function triggered just before the data is written to
     *   disk. This can be used to create any intermediate directories before
     *   saving. The file will not be saved if the promise rejects or the function
     *   throws an exception.
     * @param {nsIAsyncShutdownClient} [config.finalizeAt]
     *   An `IOUtils` phase or barrier client that should automatically finalize the
     *   file when triggered. Defaults to `profileBeforeChange`; exposed as an
     *   option for testing.
     * @param {string} [config.compression]
     *   A compression algorithm to use when reading and writing the data.
     * @param {string} [config.backupTo]
     *   A string value indicating where writeAtomic should create a backup before
     *   writing to json files. Note that using this option currently ensures that
     *   we automatically restore backed up json files in load() and
     *   ensureDataReady() when original files are missing or corrupt.
     * @param {Function} [config.saveFailureHandler]
     *   A synchronous function that will be called if saving the data object ever
     *   causes an exception to be thrown (and toJSONSafe is not implemented on
     *   data).
     */
    constructor(config: {
        path: string;
        sanitizedBasename?: string;
        dataPostProcessor?: (data: any) => any;
        saveDelayMs?: number;
        beforeSave?: Function;
        finalizeAt?: nsIAsyncShutdownClient;
        compression?: string;
        backupTo?: string;
        saveFailureHandler?: Function;
    });
    path: string;
    sanitizedBasename: string;
    _dataPostProcessor: (data: any) => any;
    _beforeSave: Function;
    _saver: null;
    _options: {};
    _saveFailureHandler: () => void;
    _finalizeAt: null;
    _finalizeInternalBound: null;
    dataReady: boolean;
    _data: unknown;
    _finalizePromise: null;
    /**
     * Sets the loaded data to a new object. This will overwrite any persisted
     * data on the next save.
     */
    set data(data: unknown);
    /**
     * Serializable object containing the data. This is populated directly with
     * the data loaded from the file, and is saved without modifications.
     *
     * The raw data should be manipulated synchronously, without waiting for the
     * event loop or for promise resolution, so that the saved file is always
     * consistent.
     */
    get data(): unknown;
    /**
     * Loads persistent data from the file to memory.
     *
     * @returns {Promise<void>}
     *   Resolves when the operation finished successfully.
     * @rejects JavaScript exception when dataPostProcessor fails. It never fails
     *          if there is no dataPostProcessor.
     */
    load(): Promise<void>;
    /**
     * Loads persistent data from the file to memory, synchronously. An exception
     * can be thrown only if dataPostProcessor exists and fails.
     */
    ensureDataReady(): void;
    /**
     * Called when the data changed, this triggers asynchronous serialization.
     */
    saveSoon(): any;
    /**
     * Saves persistent data from memory to the file.
     *
     * If an error occurs, the previous file is not deleted.
     *
     * @returns {Promise<void>}
     *   Resolves when the operation finished successfully.
     * @rejects JavaScript exception.
     */
    _save(): Promise<void>;
    /**
     * Synchronously work on the data just loaded into memory.
     */
    _processLoadedData(data: any): void;
    _recordTelemetry(value: any): void;
    /**
     * Finishes persisting data to disk and resets all state for this file.
     *
     * @returns {Promise<void>}
     *   Resolves when the object is finalized.
     */
    _finalizeInternal(): Promise<void>;
    /**
     * Ensures that all data is persisted to disk, and prevents future calls to
     * `saveSoon`. This is called automatically on shutdown, but can also be
     * called explicitly when the file is no longer needed.
     */
    finalize(): Promise<void>;
}
