// This app cannot process imgur gallery urls so this will not work on all subreddits but works on the most
// TODO: improve file extension support


const { remote } = require("electron");
const dialog = remote.dialog;
const axios = require("axios");


//  Flags
var process = false;

// API parsing logic
const getData = async function (url) {
    try {
        const response = await axios.get(url);
        const data = response.data;
        return data;
    } catch (error) {
        return null;
    }
};

async function startProcess(url) {
    var resObj;
    await getData(url).then(
        function (res) {
            urls = [];
            var datalist = res.data.children;
            datalist.forEach(element => {
                urls.push(element.data.url);
            });
            var after = res.data.after;
            resObj = {
                after,
                urls
            };
        }
    );
    return resObj;
}




/* Window Section */
// window minimize, maximize and close funtions for our custom tittlebar
document.getElementById("min-btn").addEventListener("click", function () {
    remote.getCurrentWindow().minimize();
});

document.getElementById("min-max-btn").addEventListener("click", function () {
    if (remote.getCurrentWindow().isMaximized()) {
        remote.getCurrentWindow().unmaximize();
    } else {
        remote.getCurrentWindow().maximize();
    }
});

document.getElementById("close-btn").addEventListener("click", function () {
    remote.app.quit();
});


/*  App Section */


// get elements
// buttons
var browseButton = document.getElementById("browse-btn");
var startButton = document.getElementById("start-btn");
var cancelButton = document.getElementById("cancel-btn");

// inputfields
var subredditUrlInput = document.getElementById("subreddit-url-input");
var browseFolderInput = document.getElementById("browse-folder-input");
var processingIndicatorSpan = document.getElementById("processing-indicator");
var progressTextSpan = document.getElementById("progress-text");
var progressBar = document.getElementById("progress-bar");
var progressBarWidth = document.getElementById("progress-bar-width");

// on page load
document.addEventListener("DOMContentLoaded", function () {
    // url autocomplete functionality
    var elems = document.querySelectorAll('.autocomplete');
    var instances = M.Autocomplete.init(elems, {
        data: {
            "https://www.reddit.com/r/": null,
        }
    });

    // hide controls
    processingIndicatorSpan.classList.add("hide");
    progressTextSpan.classList.add("hide");
    progressBar.classList.add("hide");

});

// select the download location
browseButton.addEventListener("click", function () {
    getDownloadPath().then(function (downloadPath) {
        if (downloadPath !== undefined) {
            browseFolderInput.value = downloadPath;
        } else {
            browseFolderInput.value = "";
        }
    });
});

async function getDownloadPath() {
    var path = await dialog.showOpenDialog(remote.getCurrentWindow(), {
        title: "Select download location",
        buttonLabel: "Download here",
        properties: ["openDirectory"]
    });
    return path.filePaths[0];
}

// start download process
startButton.addEventListener("click", async function () {
    startButton.disabled = true;
    var url = subredditUrlInput.value;
    var downloadLocation = browseFolderInput.value;

    if (url == "") {
        progressTextSpan.classList.remove("hide");
        progressTextSpan.innerHTML = "Invalid URL";

        return;
    }

    if (url.search("https://") == -1) {
        progressTextSpan.classList.remove("hide");
        progressTextSpan.innerHTML = "URL must begin with https://";

        return;
    }

    if (url.search("www.") == -1) {
        progressTextSpan.classList.remove("hide");
        progressTextSpan.innerHTML = "URL must contain www.";

        return;
    }

    if (url.search("www.reddit.com") == -1) {
        progressTextSpan.classList.remove("hide");
        progressTextSpan.innerHTML = "This downloader is only for Reddit";

        return;
    }


    process = true;
    processingIndicatorSpan.classList.remove("hide");
    progressTextSpan.classList.remove("hide");
    progressBar.classList.remove("hide");

    url += ".json";
    var obj = await startProcess(url);
    var urls = obj.urls;
    var after = obj.after;
    var count = 1;
    while (after != null && process === true) {
        progressTextSpan.innerHTML = "parsing page " + count++;
        obj = await startProcess(url + "?after=" + after);
        urls = urls.concat(obj.urls);
        after = obj.after;
    }
    progressTextSpan.innerHTML = "all pages parsed";
    processingIndicatorSpan.classList.add("hide");

    // remove urls from posts to exclude

    // start download process
    async function downloadImages(urls) {
        var imgCount = 1;
        await urls.forEach(
            function (imgurl) {
                http = require("https");
                if (process === true) {
                    try {
                        http.request(imgurl, function (response) {
                            var data = new Stream();
                            response.on('data', function (chunk) {
                                data.push(chunk);
                            });
                            response.on('end', function () {
                                fs.writeFileSync(downloadLocation + "\\image_" + imgCount + ".jpg", data.read());
                                progressBarWidth.style.width = Math.round(imgCount / urls.length * 100) + "%";
                                progressTextSpan.innerHTML = "downloading.. " + Math.round(imgCount++ / urls.length * 100) + "%";
                            });
                        }).end();
                    } catch (error) {
                        console.log(error.name);
                        progressTextSpan.innerHTML = "Error! download halted";
                    }
                }
            }
        );
        return 1;
    }

    var Stream = require('stream').Transform,
        fs = require('fs');
    var http;
    downloadImages(urls).then(
        function (params) {
            progressTextSpan.innerHTML = "download finished";
            progressBarWidth.style.width = "100px";
            process = false;
            startButton.disabled = false;
        }
    );

});


// cancel download process
cancelButton.addEventListener("click", function () {
    process = false;
    progressTextSpan.innerHTML = "process calceled";

    // reload current window
    remote.getCurrentWindow().reload();
});


