const puppeteer = require('puppeteer')
const db = require('mongodb').MongoClient.connect('mongodb://localhost:27071')

let bbs = {
  all: {
    url: 'https://bbs.fudan.edu.cn/bbs/all'
  },
  board: {
    url: 'https://bbs.fudan.edu.cn/bbs/doc?board=$boardName'
  }
}

async function getAllBoards(browser) {
  const page = await browser.newPage()
  page.on('console', message => console.log(message))
  await page.goto(bbs.all.url)
  
  const boards = await page.$$eval(
    'table.content > tbody > tr',
    rows => rows.slice(1).map(row => {
      let ret = {}
      ret.id = parseInt(row.querySelector('.no').innerText)
      ret.title = row.querySelector('.title').innerText.trim()
      ret.category = row.querySelector('.cate').innerText.trim()
      ret.description = row.querySelector('.desc').innerText.trim()
      ret.boardMaster = row.querySelector('.bm').innerText.trim()
      return ret
    })
  )
  // save to mongodb
  return boards
}

;(async () => {
  const browser = await puppeteer.launch()
  let boards = await getAllBoards(browser)

  await browser.close()
})()