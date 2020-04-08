js chunk uploader
=============
2020-04-08


A js tool to help implementing a chunk uploading system.



Install
============

```js 
npm i chunk-uploader
```


Usage
======



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


History log
=============

- 1.0.0 -- 2020-04-08 
    
    - initial commit

