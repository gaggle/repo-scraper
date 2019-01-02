# repo-scraper [![Build Status](https://travis-ci.org/gaggle/repo-scraper.svg?branch=master)](https://travis-ci.org/gaggle/repo-scraper) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
Scrape repository data, to be consumed by [repo-lister][repo-lister].

Multiple repository providers can be supported, currently we can scrape from GitHub and GitLab.


## Development
* `npm test` for tests and coverage


## Cutting a new release
Run this command to automatically increment version, build, commit, tag, and push a new release:
```bash
npm test && npm version patch && (export VERSION=`node -p "require('./package.json').version"`; git push && git push origin v$VERSION)
```


[repo-lister]: https://github.com/gaggle/repo-lister
