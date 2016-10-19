# zulu

Building static webpages, which should be pretty straight forward, has become increasingly complicated with all the tooling that comes with modern web development. Just to get up and running, I usually find myself having three terminal windows open, one for serving static files, one for compiling JavaScript (watchify) and another to compile CSS (usually postcss).

Lately it has become increasingly popular using `npm scripts` over task runners such as grunt or gulp. So why not put those same scripts to work serving you fresh compiled assets for every request? That is just what zulu does; fire up a static file server piping select routes through your already defined scripts.

## ~~Installation~~

**NOTICE**: Still missing thorough testing, not recommended for usage just yet.

```
$ npm install --save-dev zulu
```

## Usage

Zulu is best incorporated into your package.json under `scripts` as so:

```json
{
  "name": "my-module",
  "version": "1.0.0",
  "scripts": {
    "build": "npm run build:js & npm run build:css",
    "build:js": "browserify src/main.js -t [ babelify --presets [ es2015 ]]",
    "build:css": "postcss src/main.css -u postcss-import -u autoprefixer",
    "start": "zulu -r [ public ] -r [ main.js -s build:js ] -r [ main.css -s build:css ]"
  }
}
```

Running `npm start` will serve all files in the folder `public` (as is) as well as pipe requests for `/main.js` through browserify and requests for `/main.css` through postcss giving you compiled assets on demand. Though zulu is not restricted to only npm scripts, you can run any command when piping requests.

### Examples

```bash
# Just serve static files in current dir
$ zulu
```

```bash
# Bundle, minify and gzip JavaScript
$ zulu **/*.js -s 'browserify -t [ babaelify --presets [ es2015 ]]' -s uglifyjs -s 'gzip --to-stdout'
```

```bash
# Compile SASS source files to CSS
$ zulu **/*.scss -s 'sassc --stdin --sourcemap'
```

```bash
# Render markdown files to HTML
$ zulu **/*.md -s 'multimarkdown --full'
```

## Options

- `--port, -p` Server port
- `--route, r ` Create a route for path (relative to parent path)
- `--script, -s` Pipe associated route through script (zero or more per route)
- `--help, -h` Show help information

## TODO

- [ ] Support POST
- [ ] Add caching mechanism
