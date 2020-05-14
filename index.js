const jsx = require("js-extension-ling");

class ChunkUploader {

    constructor(options) {
        /**
         * Defaults: 5M every 100ms (50M every second)
         */
        this.timer = options.timer || 1;
        this.sliceSize = options.chunkSize || 5 * 1024 * 1024;
        this.serverUrl = options.serverUrl || "/chunk-uploader.php";


        // this.onRequestError = function (e) {
        //     console.log("ChunkUploader: an error occurred with the request.")
        // };
        this.onChunkLoaded = options.onChunkLoaded || function (start, end, size, isLastChunk) {
            let percent = Math.round(end / size * 100, 2);
            console.log(`${percent}% of the chunks loaded`);
        };

        this.onChunkAborted = options.onChunkAborted || function (start, end, isLastChunk) {
            console.log(`The chunk has been aborted: ${start}-${end}, isLastChunk=${isLastChunk}.`);
        };
        /**
         * Sets a callback to control whether the received chunk is ok.
         * Use this callback to interrupt the upload process at any chunk.
         *
         *
         * The callback receives a clone of the response.
         * (a clone is used so that the callback can analyze the response without consuming the real response
         * body, which is eventually returned by the sendByChunks method.
         *
         * If the callback returns something else than true, the promise will be rejected.
         * If the callback returns false, a default error message will be generated.
         * If the callback returns a string, this string will be used as the error message.
         *
         * Note: this should be an async function.
         *
         */
        this.onChunkResponseReceived = options.onChunkResponseReceived || async function (response) {
            return true;
        };

        this._xhr = null;
        this.controller = new AbortController();
        this._is_aborted = false;
        this._chunkFailed = false;

    }


    abort() {
        this._is_aborted = true;
        if (null !== this._xhr) {
            this._xhr.abort();
        } else {
            this.controller.abort();
        }
    }


    /**
     * Returns a promise that resolves only when all chunks are uploaded.
     * Note: you can use the abort method to abort at anytime before the promise resolves.
     *
     *
     * - file: the js File/Blob object to upload.
     * - data: map of key/value pairs to add to the request.
     *      The following property names are reserved (i.e. you cannot use them):
     *        - start
     *        - end
     *        - isLastChunk
     *        - file
     *
     *
     *
     * Options:
     *      - start: int=0, the byte of the blob to start the upload with.
     *
     *
     * adapted from https://gist.github.com/shiawuen/1534477
     **/
    async sendByChunks(file, data, options) {

        var start = options.start || 0;

        this._is_aborted = false;
        this._chunkFailed = false;
        let $this = this;
        return new Promise((resolve, reject) => {


            var $this = this;
            var size = file.size;

            setTimeout(loop, this.timer);

            async function loop() {
                var isLastChunk = false;
                var end = start + $this.sliceSize;

                if (size - end <= 0) {
                    isLastChunk = true;
                    end = size;
                }

                var s = $this._slice(file, start, end);

                if (false === $this._chunkFailed) {
                    await $this._send(resolve, reject, s, start, end, size, isLastChunk, data);


                    if (end < size) {
                        start += $this.sliceSize;
                        setTimeout(loop, $this.timer);
                    }
                }
            }
        });
    }


    //----------------------------------------
    // PRIVATE
    //----------------------------------------
    async _send(resolve, reject, piece, start, end, size, isLastChunk, userData) {


        var formdata = new FormData();
        formdata.append('start', start);
        formdata.append('end', end);
        formdata.append('file', piece);
        formdata.append('last_chunk', (isLastChunk ? 1 : 0));

        formdata = jsx.toFormData(userData, formdata);


        return this._sendViaFetch(resolve, reject, formdata, start, end, size, isLastChunk);
        // return this._sendViaXMLHttpRequest(resolve, reject, formdata, start, end, size, isLastChunk);

    }


    /**
     * Formalize file.slice
     */
    _slice(file, start, end) {
        var slice = file.mozSlice ? file.mozSlice :
            file.webkitSlice ? file.webkitSlice :
                file.slice ? file.slice : this._noop;

        return slice.bind(file)(start, end);
    }

    _noop() {

    }


    _sendViaFetch(resolve, reject, formdata, start, end, size, isLastChunk) {


        return new Promise(async (_resolve, _reject) => {

            let errMsg = `ChunkUploader: an error occurred with the chunk request (start:${start}, end: ${end}).`;

            var response = await fetch(this.serverUrl, {
                body: formdata,
                method: "POST",
                signal: this.controller.signal,
            }).catch(e => {
                if (true === this._is_aborted) {
                    this.onChunkAborted(start, end, isLastChunk);
                } else {
                    _reject(errMsg);
                }
            });


            if (true === this._is_aborted) {
                this.onChunkAborted(start, end, isLastChunk);
            } else {
                if (true === response.ok) {


                    let ret = await this.onChunkResponseReceived(response.clone());

                    if (true === ret) {
                        this.onChunkLoaded(start, end, size, isLastChunk);
                        _resolve();

                        if (true === isLastChunk) {
                            resolve(response);
                        }
                    } else {
                        if ('string' === typeof ret) {
                            errMsg = ret;
                        }
                        _reject(errMsg);
                    }
                } else {
                    _reject(errMsg);
                }
            }
        }).catch((e) => {
            reject(e);
            this._chunkFailed = true;
        });

    }

    /**
     * Old, don't use this, I just keep it for reference
     */
    _sendViaXMLHttpRequest(resolve, reject, formdata, start, end, size, isLastChunk) {

        return new Promise((_resolve, _reject) => {

            var ajax = new XMLHttpRequest();
            this._xhr = ajax;
            ajax.open('POST', this.serverUrl, true);


            // ajax.upload.addEventListener("progress", function (e) {
            //     var percent = Math.round((e.loaded / e.total) * 100, 2);
            //     // console.log("progress", e, percent, e.loaded, e.total);
            // }, false);


            // ajax.addEventListener("load", function (e) {
            //     e.stopPropagation();
            //     e.preventDefault();
            //     // console.log("load", e);
            // }, false);

            ajax.addEventListener("error", e => {
                e.stopPropagation();
                e.preventDefault();
                let errMsg = `ChunkUploader: an error occurred with the chunk request (start:${start}, end: ${end}).`;
                _reject(errMsg);
                reject(errMsg);
                // this.onRequestError(e);
            }, false);


            // ajax.addEventListener("abort", function (e) {
            //     e.stopPropagation();
            //     e.preventDefault();
            //     console.log("abort", e);
            // }, false);

            ajax.onreadystatechange = () => {
                if (ajax.readyState === 4) {
                    this.onChunkLoaded(start, end, size, isLastChunk);

                    _resolve();

                    if (true === isLastChunk) {
                        resolve(ajax);
                    }
                }
            };
            ajax.send(formdata);
        });

    }

}


module.exports = ChunkUploader;