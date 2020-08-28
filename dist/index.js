const youtubedl = require('youtube-dl')
const { exec } = require('child_process');
const puppeteer = require('puppeteer');
const fs = require('fs');

const email = process.env.ANCHOR_EMAIL;
const password = process.env.ANCHOR_PASSWORD;

const YT_URL = 'https://www.youtube.com/watch?v=';
const pathToEpisodeJSON = 'episode.json';
const outputFile = 'episode.webm';

exec('npm i -g youtube-dl', (error, stdout, stderr) => {
    if (error) {
      console.log(`error: ${error.message}`)
      return
    }
    if (stderr) {
      console.log(`stderr: ${stderr}`)
      return
    }
    console.log(`stdout: ${stdout}`)
});

try {
    const epConfJSON = JSON.parse(fs.readFileSync(pathToEpisodeJSON, 'utf-8'));
    
    const YT_ID = epConfJSON.id;
    
    const url = YT_URL + YT_ID;
    
    const video = youtubedl(url, ['--format=bestaudio'], { cwd: __dirname });
    
    youtubedl.getInfo(url, function(err, info) {
        if (err) throw err;
        epConfJSON.title = info.title;
        epConfJSON.description = info.description;
    });

    const youtubeDlCommand = `youtube-dl -o ${outputFile} -f bestaudio[ext=webm] ${url}`;

    exec(youtubeDlCommand, (error, stdout, stderr) => {
      if (error) {
        console.log(`error: ${error.message}`)
        return
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`)
        return
      }
      console.log(`stdout: ${stdout}`)
        fs.writeFileSync(pathToEpisodeJSON, JSON.stringify(epConfJSON));
    });
} catch (error) {
    throw error;
}


const episode = JSON.parse(fs.readFileSync(pathToEpisodeJSON, 'utf-8'));

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const navigationPromise = page.waitForNavigation();

    await page.goto('https://anchor.fm/dashboard/episode/new');

    await page.setViewport({ width: 1600, height: 789 });

    await navigationPromise;

    await page.type('#email', email);
    await page.type('#password', password);
    await page.click('button[type=submit]');
    await navigationPromise;

    await page.waitForSelector('input[type=file]');

    const inputFile = await page.$('input[type=file]');
    await inputFile.uploadFile('episode.webm');
    await page.waitFor(25*1000);
    await page.waitForFunction('document.querySelector(".styles__saveButton___lWrNZ").getAttribute("disabled") === null', {timeout: 60*5*1000});
    await page.click('.styles__saveButton___lWrNZ');
    await navigationPromise;

    await page.waitForSelector('#title');
    await page.type('#title', episode.title);

    await page.click('.styles__modeToggleText___26-xx');

    await page.waitForSelector('textarea[name=description]');
    await page.type('textarea[name=description]', episode.description);

    await page.click('.styles__saveButtonWrapper___TrQYl button');
    await navigationPromise;

    await browser.close()
})()
