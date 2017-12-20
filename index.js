const puppeteer = require('puppeteer')
const Crawler = require('./lib/crawler')


// `;` is a syntax error guard :P
;(async () => {
  const browser = await puppeteer.launch()
  let db = await require('mongodb').MongoClient.connect('mongodb://localhost:27017/fudanbbs')
  db = db.db('fudanbbs')
  console.log('connected to mongodb')
  let crawler = new Crawler({ db, browser })
  let boards = await crawler.getAllBoards()
  // TODO: parallelism
  for (let board of boards) {
    await crawler.updateBoardByName(board)
  }

  await browser.close()
  // I don't know why I am doing this
  // plz let me know if you can exit successfully without this line :(
  process.exit(0)
})()