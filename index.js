// Packages
const request = require("request");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require('path');

// Constants
const baseURL591 = 'https://newhouse.591.com.tw';
const routeList = 'home/housing/search?rid=8&sid=&build_type=2'; // 新建案、新成屋
const outputPath = 'output'

// Variables
let totalPage = 34;
let hidList = [];
let routeSpecific = `home/housing/photo?cate_name=layout&hid=`;

// Functions
function getListFrom591() {
    function getByPage(p) {
        return new Promise((resolve, reject) => {
            request({
                url: `${baseURL591}/${routeList}&page=${p}`, 
                method: "GET"
              }, function (error, response, body) {
                if (error || !body) {
                    reject();
                    return;
                }
                const t = JSON.parse(body);
                t.data.items.forEach(h => {
                    hidList.push(h.hid)
                });
                resolve();
            });
        })
    }
    let allPages = [];
    for (let i = 1; i <= totalPage; i++) {
        allPages.push(getByPage(i));
    }
    return Promise.all(allPages);
}

function fetchPictureURLFromSpecificPage(url) {
    return new Promise((resolve, reject) => {
        request({
            url, 
            // 有格局圖的測試網址
            // url: 'https://newhouse.591.com.tw/home/housing/photo?hid=114653&cate_name=layout',
            method: "GET"
        }, function (error, response, body) {
            if (error || !body) {
                reject();
                return;
            }
            const $ = cheerio.load(body);
            $('.photo_type.stonefont ul').find('a').each((i, e) => {
                if (e.attribs['data-key'] == 'layout') {
                    const src = $('a.main_img img').attr('src');
                    if (src && typeof src == 'string' && src.indexOf('http') > -1) {
                        console.log(src);
                        resolve(src);
                    } else {
                        reject();
                    }
                }
            })
            reject();
        });
    });
}

function downloadPictureAndSave(url, fileName) {
    const fileURL = path.join(__dirname, outputPath, `${fileName}.jpg`);
    request({
        encoding: null, // 很重要
        url, 
        method: "GET"
    }, function (error, response, body) {
        if (error || !body) {
            return;
        }
        if (response.statusCode != '200' || response.headers["content-type"] != 'image/jpeg') {
            return;
        }
        const buf = Buffer.from(body, body.length);
        fs.writeFile(fileURL, buf, () => { console.log('jpg saved'); });
    });
}

function start() {
    getListFrom591().then(() => {
        let taskIndex = 0;
        hidList.forEach(hid => {
            fetchPictureURLFromSpecificPage(`${baseURL591}/${routeSpecific}${hid}`)
            .then( picURL => {
                downloadPictureAndSave(picURL, hid);
                ++taskIndex;
            })
            .catch(() => {
                console.error('沒有格局圖，或下載失敗')
                ++taskIndex;
            });
        });

        let checkDone = setInterval(() => {
            if (taskIndex == hidList.length) {
                console.log('End...');
                clearInterval(checkDone);
            }
        }, 3000);
    });
}

start();
console.log('Started....');