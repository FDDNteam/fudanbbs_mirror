# 复旦bbs mirror项目

这个项目一开始仅致力于爬复旦bbs的数据, 并提供一些格式转换脚本方便处理源数据, 之后可能会进一步发展出别的目的


初始提议实现的模块:

- incremental的nodejs爬虫, 使用mongodb做持久化存储
- 支持全文搜索的web界面
- 常用的原始数据格式转换脚本, 方便做不同目的的NLP等任务


可能下一步要做的:

- one-master-multi-slave 架构的简单分布式爬虫系统, 理论故障单点在master


## Dependencies

### Ubuntu/Debian

```bash
sudo apt install libxcomposite1 libxcursor1 libxdamage1 libxi6 libxtst6 libfontconfig1 libxss1 libxrandr libxrandr2 libgconf-2-4 libasound2 libpangocairo-1.0-0 libatk1.0-0 libatk-bridge2.0-0 libgtk-3-0
```


## Coding Convention

### NodeJS

#### Package Manager

使用[yarn](https://yarnpkg.com)而不是npm作为包管理器

#### Coding Style

- 使用ES6
- 2个空格缩进
- 除非不用会死, 不要用`;` (话说有时候不在行首加个`;`真的就会死...)
- 使用Promise/await/async而非callback, 如果某个库只提供callback的api, 那么封装成Promise再用


### Python

- 使用python3来忘记unicode的烦恼


## Issues

- puppeteer会从googleapi.com下载chromium, 如果被墙请设置NPM_HTTP_PROXY, NPM_HTTPS_PROXY环境变量, 或者连接vpn. 如果直接执行`get_headless_chromium_location.js`可以获得chromium下载链接和应该解压到的path