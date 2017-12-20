const Logging = require('./logging')('crawler')

const config = {
  all: {
    url: 'https://bbs.fudan.edu.cn/bbs/all',
    count: 393
  },
  board: {
    urlWithStart: 'https://bbs.fudan.edu.cn/bbs/doc?board=$boardName&start=$startId',
    postsPerPage: 20
  },
  mongodb: {
    collection: {
      boards: 'boards',
      posts: 'posts',
      users: 'users'
    }
  },
  parallelism: 5,
  throttleTime: {
    min: 1000,
    max: 1000
  }
}

function randomSleep(min = config.throttleTime.min, max = config.throttleTime.max) {
  let time = min + Math.random() * (max - min)
  Logging.debug(`sleep for ${time} ms`)
  return new Promise((resolve) => {
    setTimeout(function() {resolve()}, time)
  })
}

class Crawler {
  constructor(options) {
    if (!options.db) throw 'no db'
    if (!options.browser) throw 'no browser'
    this.db = options.db
    this.browser = options.browser
  }

  async getAllBoards() {
    Logging.info('fetching first level information of all boards')
    Logging.debug('checking existence')
    let db = this.db
    let _boards = await this.db.collection(config.mongodb.collection.boards).find({}).toArray()
    if (_boards.length === config.all.count) {
      Logging.debug('already in db, skip fetching via network')
      return _boards
    } else if (_boards.length > config.all.count) {
      Logging.fatal('duplicated boards in db')
      process.exit(1)
    } else if (_boards.length > 0) {
      Logging.fatal('data corrupted')
      process.exit(1)
    }
    Logging.debug('fetching all boards via network')
    let page = await this.browser.newPage()
    await page.goto(config.all.url, { waitUntil: 'load' })
    
    let boards = await page.$$eval(
      'table.content > tbody > tr',
      rows => rows.slice(1).map(row => {
        let board = {}
        board.id = parseInt(row.querySelector('.no').innerText.trim())
        board.name = row.querySelector('.title').innerText.trim()
        board.category = row.querySelector('.cate').innerText.trim()
        board.description = row.querySelector('.desc').innerText.trim()
        board.boardMaster = row.querySelector('.bm').innerText.trim()
        board.posts = 0
        return board
      })
    )
    
    await this.db.collection(config.mongodb.collection.boards).insert(boards)
    Logging.debug(`got ${boards.length} boards via network`)
    return boards
  }

  async updateUsers(urls, parallelism) {
    throw 'Not Implemented Yet'
    async function getUsers(urls) {
      let page = await this.browser.newPage()
      let users = urls.map(async url => {
        await page.goto(url, { waitUntil: 'load' })
        let user = await page.$eval(
          '???',
          elem => {
            let user = {}
            user.name = elem.querySelector('???').innerText.trim()
            return user
          }
        )
        return user
      })
      return users
    }

    let db = this.db
    let n = Math.ceil(urls.length / parallelism)
    let tasks = []
    for (let i = 0; i < parallelism; i++) {
      tasks.push(getUsers(urls.slice(n * i, n * (i+1))))
    }
    let users = await Promise.all(tasks).reduce((a, b) => a.concat(b), [])  // flatten
    users.forEach(async user => {
      await db.collection('users').update({
        // ???
      })
    })
    return true
  }
  
  async updateBoardByName(board) {
    let boardName = board.name
    let boardId = board.id
    Logging.info(`updating board: [${boardName}]`)
    let db = this.db
    async function getMaxPostIdInDb(boardId) {
      let count = await db.collection(config.mongodb.collection.posts).find({boardId}).count()
      return count
    }
    /**
     * NOTE: 默认的url长这样: https://bbs.fudan.edu.cn/bbs/doc?bid=286&start=10267, 页面返回包含start开始往后的20条
     * 但是有个bug: 如果 `max - start <= 18` , 那么就只会返回 `max - 20 ~ max - (20 - (max - start)) + 1` 条…
     */
    async function startFromPostId(page, startId) {
      async function getPostsInPage(page) {
        let posts = await page.$$eval(
          'table.content > tbody > tr',
          rows => rows.slice(1).map(row => {
            let post = {}
            post.id = parseInt(row.querySelector('.no').innerText.trim())
            post.username = row.querySelector('.owner').innerText.trim()
            post.timestamp = Date.parse(row.querySelector('.time').innerText.trim())
            post.title = row.querySelector('a.ptitle').innerText.trim()
            post.url = row.querySelector('a.ptitle').href
            return post
          })
        )
        // 筛掉最下面的`置底`贴
        posts = posts.filter(post => post.id !== null)
          .map(post => {
            let ret = post
            ret.boardId = boardId
            return ret
          })
        return posts
      }
      async function savePosts(posts) {
        await db.collection(config.mongodb.collection.posts).insert(posts)
      }

      let url = config.board.urlWithStart.replace('$boardName', boardName).replace('$startId', startId)
      
      // 每页20条, 爬到最新页
      while (true) {
        await page.goto(url, { waitUntil: 'load' })
        let posts = await getPostsInPage(page)

        // NOTE: 根据bbs的bug, 如果posts < 20, 不代表没有新post, 而要点击`上一页`,然后点击`下一页`
        //       这时候再爬这一页里面`>= startId`的部分
        if (posts.length === 0) break
        if (posts.length !== config.board.postsPerPage) {
          let prevLink = await page.$$eval(
            '.bnav > a',
            aList => aList.find(a => a.innerText.trim() === '上一页').href
          )
          await page.goto(prevLink, { waitUntil: 'load' })
          let nextLink = await page.$$eval(
            '.bnav > a',
            aList => aList.find(a => a.innerText.trim() === '下一页').href
          )
          await page.goto(nextLink, { waitUntil: 'load' })
          posts = await getPostsInPage(page)
        }

        // 解析每一个post页面, 如 `https://bbs.fudan.edu.cn/bbs/con?new=1&bid=286&f=3172584256702513749`
        for (let post of posts) {
          await randomSleep()
          await page.goto(post.url, { waitUntil: 'load' })
          while (true) {
            let html = await page.$eval('body', body => body.innerHTML)
            let ok = true
            if (html.search('刷太快了啊亲') !== -1) {
              Logging.error('被BBS发现刷太快了呢... 慢点慢点...')
              ok = false
            } else if (html.search('502 Bad Gateway') !== -1) {
              Logging.error('502 Bad Gateway')
              ok = false
            }
            if (ok) {
              break
            } else {
              await randomSleep(1000, 2000)
              await page.goto(post.url, { waitUntil: 'load' })
            }
          }
          post.data = {}
          post.data.header = await page.$$eval(
            '.post_h > p',
            ps => ps.map(p => p.innerText.trim()).filter(p => p.length > 0)
          )
          post.data.content = await page.$$eval(
            '.post_t > p',
            ps => ps.map(p => p.innerText.trim()).filter(p => p.length > 0)
          )
          post.data.quote = await page.$$eval(
            '.post_q > p',
            ps => ps.map(p => p.innerText.trim()).filter(p => p.length > 0)
          )
          post.data.footer = await page.$$eval(
            '.post_s > p',
            ps => ps.map(p => p.innerText.trim()).filter(p => p.length > 0)
          )
          if (Object.keys(post.data).every(k => post.data[k].length === 0)) {
            let html = await page.$eval('body', body => body.innerHTML)
            Logging.fatal("o%", post)
            Logging.fatal(html)
            process.exit(1)
          }
        }

        posts = posts.filter(post => post.id >= startId)
        Logging.debug(`got [${posts.length}] new pages in board [${boardName}]`)
        await savePosts(posts)
        // await this.updateUsers(posts.map(post => post.userUrl), bbs.parallelism)
        
        if (posts.length < config.board.postsPerPage)  {
          break  // 新posts不到一页
        } else {
          // 继续爬下一页posts
          startId = posts[posts.length - 1].id + 1
          url = config.board.urlWithStart.replace('$boardName', boardName).replace('$startId', startId)
        }
      }
      return true
    }

    let maxPostId = await getMaxPostIdInDb(boardId)
    Logging.debug(`max post id in db: [${maxPostId}], try fetching posts > ${maxPostId}`)
    let page = await this.browser.newPage()
    while (true) {
      try {
        let done = await startFromPostId(page, maxPostId + 1)
        if (done) break
      } catch (e) {
        Logging.warn(e)
        maxPostId = await getMaxPostIdInDb(boardId)
        page = await this.browser.newPage()
      }
    }
  }
}

module.exports = Crawler