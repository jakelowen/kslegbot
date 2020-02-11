const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const puppeteer = require("puppeteer");
const fs = require("fs");
const { promisify } = require("util");
var Twitter = require("twitter");
var T = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

async function main() {
  // launch puppeteer browser
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  // navigate to page
  const page = await browser.newPage();
  await page.goto("http://kslegislature.org/li/");

  // scrape house status
  const [hEl] = await page.$x(`//*[@id="status"]/div/a[1]`);
  const hText = await hEl.getProperty("textContent");
  const houseStatus = await hText.jsonValue();

  // scrape senate status
  const [sEl] = await page.$x(`//*[@id="status"]/div/a[2]`);
  const sText = await sEl.getProperty("textContent");
  const senateStatus = await sText.jsonValue();

  // close browser
  browser.close();

  // read previous status from file
  const prevStatusBuff = await readFileAsync(
    path.resolve(__dirname, "status.json")
  );
  // parse JSON
  const prevStatus = JSON.parse(prevStatusBuff.toString());

  // compare new status to previous house status
  if (houseStatus && houseStatus !== prevStatus.houseStatus) {
    console.log("House Status has changed", {
      now: houseStatus,
      prev: prevStatus.houseStatus
    });

    // It has changed - TWEET IT
    await T.post("statuses/update", {
      status: `House Status: ${houseStatus} #ksleg`
    }).catch(err => console.log(err));
  } else {
    console.log("House Status has not changed");
  }

  // compare new status to previous senate status
  if (senateStatus && senateStatus !== prevStatus.senateStatus) {
    console.log("Senate Status has changed", {
      now: senateStatus,
      prev: prevStatus.senateStatus
    });

    // It has changed - TWEET IT
    await T.post("statuses/update", {
      status: `Senate Status: ${senateStatus} #ksleg`
    }).catch(err => console.log(err));
  } else {
    console.log("Senate Status has not changed");
  }

  // save status to file for comparison next time.
  await writeFileAsync(
    "./status.json",
    JSON.stringify({ houseStatus, senateStatus })
  );
}

main();
