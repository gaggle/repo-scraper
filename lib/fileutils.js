const fs = require('fs-extra')
const path = require('path')

exports.copyDataToDir = async (dst, filesdata) => {
  for (let [filename, data] of Object.entries(filesdata)) {
    const filepath = path.join(dst, filename)
    await fs.ensureDir(path.dirname(filepath))
    const fd = await fs.open(filepath, 'w')
    try {
      await fs.write(fd, data, 0, data.length, null)
    } finally {
      await fs.close(fd)
    }
  }
}

exports.getRecipe = recipe => {
  return require(`../recipes/${recipe}`)
}

exports.getRecipeNames = () => {
  const p = path.join(__dirname, '..', 'recipes')
  const files = fs.readdirSync(p)
  return files.map(filename => path.parse(filename).name)
}
