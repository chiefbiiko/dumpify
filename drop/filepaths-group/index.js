const fs = require('fs')
const path = require('path')

const countFiles = require('count-files')
const ops = require('pojo-ops')

const listDirs = p =>
  fs.readdirSync(p).map(f => path.join(p, f)).filter(f => fs.statSync(f).isDirectory())

module.exports = function group (filepaths, callback) {
  const trap = {
    entireDirectories: [],
    singleFiles: [],
    _files: [],
    _map: {},
    _temp: []
  }
  if (!callback) throw new Error('gimme a callback, gonna do cb(err, data)')
  // split filepaths into file objects
  trap._files = filepaths.map(filepath => {
    return {
      name: filepath.replace(/^.+(\/|\\)(.+)$/, '$2'),
      path: filepath,
      dir: filepath.replace(/^(.+)(\/|\\).*$/, '$1')
    }
  })
  // map files to dirs
  trap._map = trap._files.reduce((acc, cur) => {
    acc.hasOwnProperty(cur.dir)
      ? acc[cur.dir].push(cur.path) : acc[cur.dir] = [ cur.path ]
    return acc
  }, {})
  // push keys of props that represent an entire dir to trap.entir... via temp
  var size = ops.size(trap._map)
  ops.forEach(trap._map, (files, dir) => {
    gotAllNestedFiles(dir, trap._map, (err, truth) => {
      console.log(dir, truth)
      if (err) return callback(err, null)
      if (truth) trap._temp.push(dir)
      if (--size === 0) finish()
    })
  })
  //
  function gotAllNestedFiles(dir, map, cb) {
    countFiles(dir, (err, count) => {
      if (err) return cb(err, null)
      if (!map[dir] || (count.files - count.dirs !== map[dir].length)) {
        cb(null, false)
      } else if (!count.dirs) {
        cb(null, true)
      } else if (count.dirs) {
        listDirs(dir).forEach(d => gotAllNestedFiles(d, map, cb))
      }
    })
  }
  // finish up
  function finish () {
    // push filepaths that are not covered by trap._temp to trap.singleFiles
    trap.singleFiles.push(...trap._files.filter(file => {
      return !trap._temp.some(dir => dir === file.dir) //
    }).map(file => file.path))
    // collapse nested dirs in temp to trap.entireDirectories
    trap.entireDirectories.push(...trap._temp.filter((dir, i, arr) => {
      return !arr.filter(d => d !== dir).some(other => dir.startsWith(other))
    }))
    console.log(trap)
    callback(null, trap)
  }
}