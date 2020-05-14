js chunk uploader
=============
2020-04-08 -> 2020-05-14


A js tool to help implementing a chunk uploading system.


This can be used as the js client in a [simple-chunk-upload-protocol](https://github.com/lingtalfi/TheBar/blob/master/discussions/simple-chunk-upload-protocol.md) communication.


Install
============

```js 
npm i chunk-uploader
```


Usage
======

Example 1: the basics
---------

```js
const ChunkUploader = require("chunk-uploader");


// assuming file is a js File object
async function demo(file){
    
    let data = {
        firstName: "paul",        
        csrf_token: "abc",        
        whatever: "dude",        
    };

    let chunkUploader = new ChunkUploader({
        serverUrl: "/my-upload-server.php",
        chunkSize: 2 * 1024 * 1024, // 2M
        onChunkAborted: (start, end, isLastChunk) => {
            // do something...
        },
        onChunkLoaded: (start, end, size, isLastChunk) => {
             let percent = Math.round(end / size * 100, 2) + "%";
            // update your gui...
        },
    });
    let response = await chunkUploader.sendByChunks(file, data, {
        start: 0, // note, you can resume an interrupted upload, if that's the case, change start to the size of the partially uploaded file
    });
    
    let jsonResponse = await response.json(); // for instance
}
```


Example 2: handling failure at the chunk level
---------
In this example we use the **onChunkResponseReceived** callback to test every chunk's response.
If a chunk's response fails, the upload of the file stops immediately.

This allows us to fail early, rather than having to wait until the end of the upload before triggering an error message.


```js 
const ChunkUploader = require("chunk-uploader");

async function example(){

    let chunkUploader = new ChunkUploader({
        serverUrl: options.serverUrl,
        // chunkSize: 5 * 1024 * 1024,
        onChunkAborted: (start, end, isLastChunk) => {
            console.log("the upload has been aborted...");
        },
        onChunkLoaded: (start, end, size, isLastChunk) => {
            let percent = Math.round(end / size * 100, 2) + "%";
            // update your gui...
        },
        onChunkResponseReceived: async function (response) {
            try {
                let jsonResponse = await response.json();
                // analyze the chunk response here, and return true if ok...
                return true;
            } catch (e) {
                // otherwise return a message error, this will interrupt the upload.
                // or return false to use a default error message
                return e.toString();
            }
        }
    });
            
    let file = 0 // replace with some js File object
    let data = {}; // extra data if necessary, this is sent via post
    let response = await chunkUploader.sendByChunks(file, data);
    let jsonResponse = await response.json();

}

example();



```




History log
=============

- 1.2.0 -- 2020-05-14 
    
    - add onChunkResponseReceived callback option
    
- 1.1.0 -- 2020-04-20 
    
    - Update sendByChunks, now handles data parameter recursively
    
- 1.0.1 -- 2020-04-13 
    
    - add link in README.md
    
- 1.0.0 -- 2020-04-08 
    
    - initial commit

